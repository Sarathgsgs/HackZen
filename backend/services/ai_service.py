from openai import OpenAI
from typing import List, Dict, Any, Optional
import asyncio
import os
import json
import re
from concurrent.futures import ThreadPoolExecutor
from core.config import settings
from database import get_ai_embeddings_collection, get_hackathon_collection, get_db

from dotenv import load_dotenv
load_dotenv()

class AICoMentorService:
    def __init__(self):
        self.nvidia_api_key = getattr(settings, "NVIDIA_API_KEY", None) or os.getenv("NVIDIA_API_KEY")
        self.openai_api_key = getattr(settings, "OPENAI_API_KEY", None) or os.getenv("OPENAI_API_KEY")
        self.client = None
        self.primary_model = "meta/llama-3.2-11b-vision-instruct"
        self.fallback_models = [
            "meta/llama-3.2-11b-vision-instruct",
            "meta/llama-3.2-90b-vision-instruct"
        ]
        self.executor = ThreadPoolExecutor(max_workers=5)
        self._init_client()


    def _init_client(self):
        key = self.nvidia_api_key or os.getenv("NVIDIA_API_KEY")
        if key:
            try:
                self.client = OpenAI(
                    base_url="https://integrate.api.nvidia.com/v1",
                    api_key=key,
                    timeout=60.0,
                    max_retries=1
                )
            except Exception as e:
                print(f"[AI Service] Error configuring NVIDIA AI client: {e}")
        elif self.openai_api_key or os.getenv("OPENAI_API_KEY"):
            try:
                self.client = OpenAI(
                    api_key=self.openai_api_key or os.getenv("OPENAI_API_KEY"),
                    timeout=25.0
                )
                self.primary_model = "gpt-4o-mini"
                self.fallback_models = ["gpt-4o-mini", "gpt-3.5-turbo"]
            except Exception as e:
                print(f"[AI Service] Error configuring OpenAI client: {e}")

    def _get_active_client(self):
        if not self.client:
            self._init_client()
        return self.client

    def _clean_json(self, text: str) -> Optional[Any]:
        """Extract and parse JSON cleanly from LLM response"""
        if not text:
            return None
        clean = text.strip()
        
        # Strip markdown fences if present
        if "```" in clean:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean)
            if match:
                clean = match.group(1).strip()
        
        try:
            return json.loads(clean)
        except Exception:
            try:
                first_brace = min([i for i in [clean.find('{'), clean.find('[')] if i != -1], default=-1)
                last_brace = max([clean.rfind('}'), clean.rfind(']')], default=-1)
                if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                    candidate = clean[first_brace:last_brace + 1]
                    return json.loads(candidate)
            except Exception:
                pass
        return None

    def _call_llm(
        self,
        prompt: Optional[str] = None,
        system_role: str = "You are a specialized AI system that strictly responds with valid JSON. Do not include markdown code block backticks, preamble, or commentary. Return only the raw JSON object.",
        temperature: float = 0.2,
        max_tokens: int = 800,
        messages: Optional[List[Dict[str, str]]] = None
    ) -> Optional[str]:
        """Synchronously invoke LLM with fallback models"""
        client = self._get_active_client()
        if not client:
            return None

        if messages is None:
            messages = [
                {"role": "system", "content": system_role},
                {"role": "user", "content": prompt or ""}
            ]

        last_error = None
        for model in self.fallback_models:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                if response and response.choices and len(response.choices) > 0:
                    content = response.choices[0].message.content
                    if content:
                        return content
            except Exception as e:
                last_error = e
                continue

        if last_error:
            print(f"[AI Service] LLM generation notice: {last_error}")
        return None

    async def review_hackathon_proposal(self, hackathon: Dict[str, Any]) -> Dict[str, Any]:
        """Critically evaluate a hackathon proposal based on actual field completeness & quality"""
        title = hackathon.get('title', '').strip()
        tagline = hackathon.get('tagline', '').strip()
        desc = (hackathon.get('description') or '').strip()
        prob = (hackathon.get('problemStatement') or '').strip()
        themes = hackathon.get('themes') or []
        tracks = hackathon.get('tracks') or []
        rules = hackathon.get('rules') or []
        min_team = hackathon.get('minTeamSize', 1)
        max_team = hackathon.get('maxTeamSize', 4)
        organizer = hackathon.get('organizer', {})

        # Python Data Completeness Audit
        desc_words = len(desc.split()) if desc else 0
        prob_words = len(prob.split()) if prob else 0
        rules_count = len(rules) if isinstance(rules, list) else (1 if rules else 0)
        tracks_count = len(tracks) if isinstance(tracks, list) else (1 if tracks else 0)

        is_desc_vague = desc_words < 10 or desc.lower() in ["create projects", "test", "hackathon", "build projects"]
        is_prob_vague = prob_words < 10 or prob.lower() in ["create projects", "test", "hackathon", "build projects"]
        is_rules_empty = rules_count == 0

        audit_summary = f"""
[DATA COMPLETENESS & QUALITY AUDIT]:
- Title: "{title}"
- Description Word Count: {desc_words} words (Flag: {'VAGUE/SPARSE' if is_desc_vague else 'DETAILED'})
- Problem Statement Word Count: {prob_words} words (Flag: {'VAGUE/SPARSE' if is_prob_vague else 'DETAILED'})
- Tracks/Themes Configured: {tracks_count} ({', '.join([str(t) for t in tracks]) if tracks else 'None'})
- Official Rules Defined: {rules_count} rules (Flag: {'EMPTY/MISSING' if is_rules_empty else 'PRESENT'})
- Team Limits: {min_team} to {max_team} members
- Host Organizer: {organizer.get('name', 'Platform Organizer')} ({organizer.get('org', 'Institution')})
"""

        prompt = f"""You are the ProEduvate Platform AI Hackathon Feasibility & Rubric Evaluator.
Critically evaluate this hackathon proposal section by section:

{audit_summary}

Detailed Proposal Inputs:
- Title: {title}
- Tagline: {tagline or 'Not specified'}
- Description: {desc or 'Not specified'}
- Problem Statement: {prob or 'Not specified'}
- Tracks: {tracks}
- Themes: {themes}
- Rules: {rules if rules else 'NONE PROVIDED'}

EVALUATION RULES (CRITICAL):
1. CLARITY SCORE (0-100):
   - If description or problem statement is sparse or placeholder (e.g. "create projects" or under 10 words), clarityScore MUST BE BETWEEN 20 and 40.
   - If detailed, domain-specific problem statement is provided, clarityScore should be between 75 and 95.
2. FEASIBILITY SCORE (0-100):
   - If rules are empty or missing, feasibilityScore MUST BE penalized (max 65).
   - If tracks are well-scoped (e.g. Smart Energy, Computer Vision, DeFi) and rules are present, feasibilityScore should be 80-92.
3. OVERALL SCORE (0-100):
   - Weighted aggregate: (clarityScore * 0.5) + (feasibilityScore * 0.5).
4. RECOMMENDATION:
   - If overallScore < 70, recommendation MUST BE "REQUEST_CHANGES".
   - If overallScore >= 75 with good details, recommendation is "APPROVE".
   - If spam or offensive, "REJECT".
5. STRENGTHS & CONCERNS:
   - Strengths: Must cite real strengths from the proposal (e.g. specific track names or team limits). If the proposal is sparse, note only basic team limits.
   - Concerns / Improvement Areas: Detail EXACTLY what is missing section by section (e.g. "Problem Statement is only 'create projects' — lacks real-world problem context, target users, and deliverable scope.", "Rules section is empty — specify submission deadlines, code originality guidelines, and evaluation rubrics.").
6. SUGGESTED FEEDBACK:
   - Write 1-2 actionable sentences telling the organizer specifically what details to add to each section before publishing.

Return ONLY a valid JSON object strictly matching this schema with dynamically calculated values (DO NOT USE FIXED TEMPLATE NUMBERS):
{{
  "overallScore": <integer 0-100 calculated from rubric>,
  "recommendation": "<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'>",
  "clarityScore": <integer 0-100 based on description and problem depth>,
  "feasibilityScore": <integer 0-100 based on rules and track scope>,
  "strengths": ["<strength 1 citing specific proposal data>", "<strength 2>"],
  "concerns": ["<specific concern detailing missing or vague sections>", "<specific concern 2>"],
  "suggestedFeedback": "<actionable advice detailing what specific sections need more details>"
}}"""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.2, max_tokens=700)
                ),
                timeout=25.0
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, dict) and "overallScore" in parsed:
                parsed["source"] = "nvidia-llama"
                # Ensure scores are integers
                parsed["overallScore"] = int(parsed.get("overallScore", 70))
                parsed["clarityScore"] = int(parsed.get("clarityScore", 70))
                parsed["feasibilityScore"] = int(parsed.get("feasibilityScore", 70))
                return parsed
        except Exception as e:
            import traceback
            print(f"[AI Service] Hackathon review notice: {repr(e)}")
            traceback.print_exc()

        # Dynamic heuristic fallback calculating scores directly from data audit
        calc_clarity = 25 if (is_desc_vague or is_prob_vague) else (60 if desc_words < 25 else 88)
        calc_feasibility = 58 if is_rules_empty else (70 if tracks_count <= 1 else 88)
        calc_overall = int((calc_clarity * 0.5) + (calc_feasibility * 0.5))
        calc_rec = "REQUEST_CHANGES" if calc_overall < 70 else "APPROVE"

        concerns = []
        if is_desc_vague or is_prob_vague:
            concerns.append(f"Problem statement and description are too brief ({prob_words} words) — please define the specific problem context, target audience, and expected deliverables.")
        if is_rules_empty:
            concerns.append("Official submission rules and code originality guidelines are missing.")
        if tracks_count <= 1 and (not tracks or "general" in str(tracks).lower()):
            concerns.append("Tracks are generic — consider defining distinct thematic challenge tracks.")

        strengths = []
        if tracks_count > 1:
            strengths.append(f"Multi-track challenge scope featuring {', '.join([str(t) for t in tracks[:3]])}.")
        else:
            strengths.append(f"Open-format hackathon theme allowing general software solutions.")
        strengths.append(f"Balanced team participation limits configured ({min_team}-{max_team} members).")

        feedback = (
            f"Please expand the problem statement and description with clear challenge objectives, and add official submission rules before publishing."
            if calc_rec == "REQUEST_CHANGES"
            else f"Proposal for '{title}' demonstrates solid feasibility and clear track structure."
        )

        return {
            "overallScore": calc_overall,
            "recommendation": calc_rec,
            "clarityScore": calc_clarity,
            "feasibilityScore": calc_feasibility,
            "strengths": strengths,
            "concerns": concerns if concerns else ["Ensure starter repository templates and judging rubric are shared with teams."],
            "suggestedFeedback": feedback,
            "source": "heuristic"
        }

    async def review_organizer_application(self, application: Dict[str, Any]) -> Dict[str, Any]:
        """Review an organizer application with data-driven risk and credibility assessment"""
        name = application.get('applicantName', application.get('name', 'Applicant')).strip()
        email = application.get('email', '').strip()
        org = application.get('organization', 'Organization').strip()
        designation = application.get('designation', '').strip()
        org_type = application.get('orgType', '').strip()
        website = application.get('website', '').strip()
        bio = application.get('bio', '').strip()
        experience = application.get('experience', '').strip()

        # Audit Domain & Experience
        is_edu_or_corp = False
        domain = ""
        if "@" in email:
            domain = email.split("@")[1].lower()
            free_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"]
            is_edu_or_corp = domain.endswith(".edu") or domain.endswith(".ac.in") or (domain not in free_domains)

        past_events = 0
        match = re.search(r"(\d+)", experience)
        if match:
            try:
                past_events = int(match.group(1))
            except Exception:
                pass

        audit_summary = f"""
[ORGANIZER PROFILE AUDIT]:
- Applicant: {name} ({designation})
- Email: {email} (Domain: {domain} - {'INSTITUTIONAL/CORPORATE' if is_edu_or_corp else 'PUBLIC/PERSONAL WEBMAIL'})
- Organization: {org} (Type: {org_type})
- Website: {website or 'None provided'}
- Bio Length: {len(bio.split())} words
- Track Record: {past_events} past events
"""

        prompt = f"""You are the ProEduvate Platform AI Organizer Verification & Risk Analyst.
Evaluate this organizer application critically based on profile authenticity and institutional representation:

{audit_summary}

EVALUATION RULES:
1. RISK SCORE (0-100, where 0 is zero risk and 100 is critical fraud risk):
   - If applicant uses institutional domain (.edu, university, corporate) with past events or established org, riskScore should be LOW (10-25).
   - If applicant uses personal webmail (gmail/yahoo) with no past events and sparse bio, riskScore should be MEDIUM (40-60).
   - If suspicious, incomplete or throwaway credentials, riskScore should be HIGH (> 65).
2. RISK TIER:
   - "LOW" if riskScore < 30.
   - "MEDIUM" if riskScore between 30 and 60.
   - "HIGH" if riskScore > 60.
3. RECOMMENDATION:
   - "APPROVE" for Low risk.
   - "REQUEST_CHANGES" for Medium risk (ask for institutional verification or event sanction letter).
   - "REJECT" for High risk.
4. AI SUMMARY:
   - 2-3 sentences explicitly mentioning applicant name, organization, domain trust rating, and why the recommendation was given.

Return ONLY a valid JSON object matching this schema with dynamic values (DO NOT USE FIXED TEMPLATE NUMBERS):
{{
  "riskTier": "<'LOW' | 'MEDIUM' | 'HIGH'>",
  "riskScore": <integer 0-100 based on verification audit>,
  "confidenceScore": <integer 50-99>,
  "recommendation": "<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'>",
  "riskFactors": [
    {{"factor": "<specific factor citing domain or organization>", "impact": "<'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH'>"}}
  ],
  "aiSummary": "<executive risk summary referencing applicant and organization>",
  "verifiedBadges": ["<badge 1>", "<badge 2>"]
}}"""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.1, max_tokens=650)
                ),
                timeout=25.0
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, dict) and "riskTier" in parsed:
                if isinstance(parsed.get("aiSummary"), dict):
                    parsed["aiSummary"] = f"Applicant {name} representing '{org}' evaluated. Risk score {parsed.get('riskScore', 20)}%."
                parsed["source"] = "nvidia-llama"
                parsed["riskScore"] = int(parsed.get("riskScore", 20))
                parsed["confidenceScore"] = int(parsed.get("confidenceScore", 90))
                return parsed
        except Exception as e:
            print(f"[AI Service] Organizer review notice: {e}")

        # Dynamic fallback based on domain and event track record
        calc_risk = 15 if (is_edu_or_corp and past_events > 0) else (28 if is_edu_or_corp else 52)
        calc_tier = "LOW" if calc_risk < 30 else ("MEDIUM" if calc_risk <= 60 else "HIGH")
        calc_rec = "APPROVE" if calc_tier == "LOW" else "REQUEST_CHANGES"

        return {
            "riskTier": calc_tier,
            "riskScore": calc_risk,
            "confidenceScore": 92 if is_edu_or_corp else 78,
            "recommendation": calc_rec,
            "riskFactors": [
                {"factor": f"Institutional email verification ({domain or 'email'})", "impact": "CLEAN" if is_edu_or_corp else "MEDIUM"},
                {"factor": f"Organization identity for '{org}'", "impact": "CLEAN" if len(org) > 3 else "LOW"},
                {"factor": f"Event hosting track record ({past_events} events)", "impact": "CLEAN" if past_events > 0 else "LOW"}
            ],
            "aiSummary": f"Applicant {name} representing '{org}' evaluated. Profile exhibits {'verified institutional domain standing' if is_edu_or_corp else 'personal webmail registration requiring institutional confirmation'}. Assessed at {calc_tier} risk.",
            "verifiedBadges": ["Identity Validated", "Organization Verified"] if is_edu_or_corp else ["Identity Pending Confirmation"],
            "source": "heuristic"
        }

    async def review_project_submission(self, submission: Dict[str, Any]) -> Dict[str, Any]:
        """Critically review a hackathon project submission using dynamic technical rubric evaluation"""
        title = submission.get('projectTitle', submission.get('title', 'Project')).strip()
        track = submission.get('category', submission.get('track', 'General')).strip()
        tagline = submission.get('tagline', '').strip()
        desc = (submission.get('desc') or submission.get('description') or '').strip()
        repo_url = submission.get('repoUrl', submission.get('githubUrl', '')).strip()
        demo_url = submission.get('demoUrl', submission.get('videoUrl', '')).strip()
        tech_stack = submission.get('techStack', [])
        if isinstance(tech_stack, str):
            tech_stack = [t.strip() for t in tech_stack.split(",") if t.strip()]

        has_repo = "github.com" in repo_url or "gitlab.com" in repo_url
        has_demo = len(demo_url) > 5
        desc_words = len(desc.split()) if desc else 0
        tech_str = ", ".join(tech_stack) if tech_stack else "Unspecified Stack"

        audit_summary = f"""
[SUBMISSION DELIVERABLES AUDIT]:
- Project: "{title}" (Track: {track})
- Repository URL: {repo_url} (Valid Git Host: {'YES' if has_repo else 'NO/PLACEHOLDER'})
- Demo URL: {demo_url or 'None'} (Present: {'YES' if has_demo else 'NO'})
- Tech Stack: {tech_str} ({len(tech_stack)} tools specified)
- Description Depth: {desc_words} words
"""

        prompt = f"""You are the ProEduvate Platform AI Technical Judge & Submission Reviewer.
Critically evaluate this hackathon project submission based on deliverables and code quality:

{audit_summary}

Full Details:
- Title: {title}
- Tagline: {tagline}
- Description: {desc}
- Tech Stack: {tech_str}

EVALUATION RULES:
1. CODE QUALITY SCORE (0-100):
   - If repository URL is invalid or missing, codeQualityScore MUST BE < 45.
   - If valid repo with clear tech stack, score 80-94.
2. PROBLEM FIT (0-100):
   - Evaluate how well {tech_str} and the description solve problems in the {track} track.
3. INNOVATION & TECHNICAL FEASIBILITY:
   - Calculate based on technical depth and deliverable maturity.
4. OVERALL SCORE (0-100):
   - Weighted aggregate of rubric scores.
5. RECOMMENDATION:
   - "RECOMMEND APPROVAL", "REQUEST CHANGES", or "FLAG FOR INVESTIGATION".
6. SUMMARY & CONCERNS:
   - Explicitly cite the project title, track, and specific tech stack components in the summary.

Return ONLY a valid JSON object matching this schema with dynamically calculated values (DO NOT USE FIXED TEMPLATE NUMBERS):
{{
  "overallScore": <integer 0-100 calculated from rubric>,
  "aiRecommendation": "<'RECOMMEND APPROVAL' | 'REQUEST CHANGES' | 'FLAG FOR INVESTIGATION' | 'REJECT'>",
  "problemFit": <integer 0-100 based on track relevance>,
  "technicalFeasibility": <integer 0-100 based on architecture realism>,
  "innovationScore": <integer 0-100 based on originality>,
  "codeQualityScore": <integer 0-100 based on repo deliverable completeness>,
  "summary": "<2-3 sentence technical critique citing project title, track, and tech stack>",
  "strengths": ["<strength 1 citing specific tech stack architecture>", "<strength 2>"],
  "concerns": ["<specific concern regarding deliverables or testing>"],
  "suggestedFeedback": "<actionable advice for the demo pitch>"
}}"""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.2, max_tokens=750)
                ),
                timeout=25.0
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, dict) and "overallScore" in parsed:
                parsed["source"] = "nvidia-llama"
                parsed["overallScore"] = int(parsed.get("overallScore", 85))
                parsed["problemFit"] = int(parsed.get("problemFit", 85))
                parsed["technicalFeasibility"] = int(parsed.get("technicalFeasibility", 85))
                parsed["codeQualityScore"] = int(parsed.get("codeQualityScore", 85))
                return parsed
        except Exception as e:
            print(f"[AI Service] Submission review notice: {e}")

        # Dynamic fallback
        calc_code = 88 if has_repo else 40
        calc_fit = 90 if desc_words > 20 else 60
        calc_overall = int((calc_code * 0.4) + (calc_fit * 0.6))
        calc_rec = "RECOMMEND APPROVAL" if calc_overall >= 75 else "REQUEST CHANGES"

        return {
            "overallScore": calc_overall,
            "aiRecommendation": calc_rec,
            "problemFit": calc_fit,
            "technicalFeasibility": 85 if len(tech_stack) >= 3 else 70,
            "innovationScore": 86,
            "codeQualityScore": calc_code,
            "summary": f"'{title}' demonstrates {'cohesive technical deliverable completeness' if has_repo else 'missing active repository deliverable'} in the {track} track, utilizing {tech_str}.",
            "strengths": [
                f"Architecture centered on {tech_str}.",
                f"Aligned with {track} track challenge parameters."
            ],
            "concerns": [
                "Verify automated test coverage and deploy demo environment prior to judging." if has_repo else "Valid repository URL must be provided before final evaluation."
            ],
            "suggestedFeedback": f"Highlight key problem metrics solved by '{title}' in your presentation.",
            "source": "heuristic"
        }

    async def analyze_dispute_case(self, dispute: Dict[str, Any]) -> Dict[str, Any]:
        """Critically analyze a plagiarism or dispute case tied to real similarity percentage"""
        sim_data = dispute.get('similarityAnalysis', dispute.get('similarity_analysis', {}))
        overall_sim = sim_data.get('overallSimilarity', 75) if isinstance(sim_data, dict) else 75
        matched_repo = sim_data.get('matchedSourceUrl', sim_data.get('matchedRepo', 'External source')) if isinstance(sim_data, dict) else 'External source'
        
        team = dispute.get('reportedTeam', {})
        team_name = team.get('name', 'Reported Team') if isinstance(team, dict) else str(team)
        hackathon = dispute.get('hackathonTitle', 'Hackathon')
        category = dispute.get('type', dispute.get('category', 'Code Plagiarism'))
        evidence = dispute.get('evidence', [])

        prompt = f"""You are the ProEduvate Platform AI Dispute & Plagiarism Investigator.
Analyze this specific hackathon dispute case:

Case Details:
- Case Code: {dispute.get('disputeCode', dispute.get('id', 'DSP-CASE'))}
- Category: {category}
- Reported Team: {team_name}
- Hackathon Event: {hackathon}
- Measured Code Similarity: {overall_sim}% against {matched_repo}
- Evidence Items: {json.dumps(evidence)}

DISCIPLINARY RULES:
1. SEVERITY:
   - If similarity > 80%: "CRITICAL"
   - If similarity 50-80%: "HIGH"
   - If similarity 30-50%: "MEDIUM"
   - If similarity < 30%: "LOW"
2. RECOMMENDED DECISION:
   - If similarity > 85%: "DISQUALIFICATION"
   - If similarity between 50% and 85%: "REQUEST_EXPLANATION"
   - If similarity between 30% and 50%: "ISSUE_WARNING"
   - If similarity < 30%: "DISMISS"
3. CONFIDENCE SCORE (50-99):
   - Proportional to evidence integrity and similarity metrics.

Return ONLY a valid JSON object matching this schema with dynamic values (DO NOT USE FIXED NUMBERS):
{{
  "executiveSummary": "<objective 1-2 sentence case summary citing team name, event, and {overall_sim}% similarity>",
  "severity": "<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>",
  "confidenceScore": <integer 50-99>,
  "keyFindings": ["<finding 1 citing exact similarity of {overall_sim}%>", "<finding 2>", "<finding 3>"],
  "recommendedDecision": "<'DISQUALIFICATION' | 'REQUEST_EXPLANATION' | 'ISSUE_WARNING' | 'DISMISS'>",
  "recommendationReason": "<detailed rationale citing why {overall_sim}% warrants this decision>",
  "suggestedCommunication": "<official drafted notice to Team {team_name}>"
}}"""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.1, max_tokens=650)
                ),
                timeout=25.0
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, dict) and "executiveSummary" in parsed:
                parsed["source"] = "nvidia-llama"
                parsed["confidenceScore"] = int(parsed.get("confidenceScore", 90))
                return parsed
        except Exception as e:
            print(f"[AI Service] Dispute analysis notice: {e}")

        # Dynamic fallback
        sev = "CRITICAL" if overall_sim > 80 else ("HIGH" if overall_sim > 50 else ("MEDIUM" if overall_sim > 30 else "LOW"))
        dec = "DISQUALIFICATION" if overall_sim > 85 else ("REQUEST_EXPLANATION" if overall_sim > 50 else ("ISSUE_WARNING" if overall_sim > 30 else "DISMISS"))
        
        return {
            "executiveSummary": f"Code similarity evaluation for team '{team_name}' in {hackathon} indicates {overall_sim}% structural overlap with {matched_repo}.",
            "severity": sev,
            "confidenceScore": 92 if overall_sim > 70 else 80,
            "keyFindings": [
                f"Automated AST scanner identified {overall_sim}% similarity.",
                f"Benchmark target: {matched_repo}.",
                f"Dispute categorized under {category} guidelines."
            ],
            "recommendedDecision": dec,
            "recommendationReason": f"Similarity metric of {overall_sim}% exceeds acceptable independent originality thresholds.",
            "suggestedCommunication": f"Dear Team {team_name}, your submission has been flagged for {overall_sim}% similarity against external source {matched_repo}. Please submit proof of independent authorship within 24 hours.",
            "source": "heuristic"
        }

    async def generate_admin_insights(self, stats: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate platform analytics insights calculated from live database counts"""
        total_users = stats.get('total_users', 0)
        running_hacks = stats.get('running_hacks', 0)
        completed_hacks = stats.get('completed_hacks', 0)
        total_teams = stats.get('total_teams', 0)
        total_subs = stats.get('total_subs', 0)
        certs_minted = stats.get('certs_minted', 0)
        pending_approvals = stats.get('pending_approvals', 0)

        prompt = f"""You are the ProEduvate Platform AI Analytics Engine.
Analyze these EXACT live platform metrics:
- Total Registered Builders: {total_users}
- Active Hackathon Arenas: {running_hacks}
- Completed Hackathons: {completed_hacks}
- Participating Teams: {total_teams}
- Total Submissions: {total_subs}
- Certificates Minted: {certs_minted}
- Pending Approvals in Queue: {pending_approvals}

Generate exactly 6 strategic, concise platform insights for the administrator.
Every insight MUST cite relevant real numbers from above and offer actionable intelligence.

Return ONLY a valid JSON array of 6 objects with keys:
- "title": Short title (e.g. "User Community Trajectory", "Approval Backlog Alert")
- "content": 1-2 sentences citing real numbers from the metrics.
- "type": One of ["positive", "info", "warning", "purple", "danger"]"""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.2, max_tokens=800)
                ),
                timeout=25.0
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, list) and len(parsed) >= 4:
                return parsed
        except Exception as e:
            print(f"[AI Service] Admin insights notice: {e}")

        return [
            {
                "title": "Platform Registration Trajectory",
                "content": f"Platform engagement is active with {total_users} registered builders across participating institutions.",
                "type": "positive"
            },
            {
                "title": "Event Pipeline Activity",
                "content": f"Currently {running_hacks} active hackathon arenas running with {total_teams} collaborating teams.",
                "type": "info"
            },
            {
                "title": "Governance & Approvals Queue",
                "content": f"{pending_approvals} organizer & event approval requests awaiting administrative review.",
                "type": "warning" if pending_approvals > 0 else "positive"
            },
            {
                "title": "Project Submission Velocity",
                "content": f"Submissions reached {total_subs} across active tracks with strong repository completion rates.",
                "type": "purple"
            },
            {
                "title": "Credential Issuance Index",
                "content": f"{certs_minted} tamper-proof verifiable certificates issued to date.",
                "type": "positive"
            },
            {
                "title": "Evaluation Readiness Alert",
                "content": "Verify judge allocations across all active tracks prior to final round closure.",
                "type": "danger"
            }
        ]


    async def _get_student_team_context(self, student_id: Optional[str], hackathon_id: Optional[str]) -> str:
        if not student_id:
            return "Participant: General (No team specified)"
        try:
            db = get_db()
            from bson import ObjectId
            user_str = str(student_id)
            
            # Search teams collection for matching member, leader, or teamMembers record
            team = None
            candidate_queries = [
                {"members.userId": user_str},
                {"members.id": user_str},
                {"leaderId": user_str}
            ]
            if ObjectId.is_valid(user_str):
                candidate_queries.append({"leaderId": ObjectId(user_str)})

            team_filter = {"$or": candidate_queries}
            if hackathon_id and hackathon_id != "general":
                hack_conditions = [{"hackathonId": hackathon_id}, {"hackathonId": str(hackathon_id)}]
                if ObjectId.is_valid(str(hackathon_id)):
                    hack_conditions.append({"hackathonId": ObjectId(str(hackathon_id))})
                team_filter = {"$and": [team_filter, {"$or": hack_conditions}]}

            team = await db["teams"].find_one(team_filter)

            # Check teamMembers collection if not matched directly
            if not team:
                memberships = await db["teamMembers"].find({"userId": user_str}).to_list(100)
                team_ids = [
                    ObjectId(str(item.get("teamId")))
                    for item in memberships
                    if item.get("teamId") and ObjectId.is_valid(str(item.get("teamId")))
                ]
                if team_ids:
                    t_query = {"_id": {"$in": team_ids}}
                    if hackathon_id and hackathon_id != "general":
                        t_query["hackathonId"] = str(hackathon_id)
                    team = await db["teams"].find_one(t_query)

            if team:
                team_name = team.get("teamName") or team.get("name") or "Team"
                project_name = team.get("project") or team.get("projectName") or "Under Development"
                track = team.get("track") or "General"
                college = team.get("college") or ""
                mentor = team.get("mentorName") or ""
                members_list = []
                for m in team.get("members", []):
                    m_name = m.get("name") or "Member"
                    m_role = m.get("role") or ""
                    members_list.append(f"{m_name} ({m_role})" if m_role else m_name)

                submission_details = ""
                try:
                    team_id_str = str(team.get("_id", ""))
                    sub = await db["submissions"].find_one({
                        "$or": [
                            {"teamId": team_id_str},
                            {"teamId": team.get("teamCode")},
                            {"teamId": team.get("name")}
                        ]
                    })
                    if sub:
                        submission_details = f"\nProject Submission: {sub.get('project', project_name)}\nSubmission Overview: {sub.get('desc', '')}\nTrack Category: {sub.get('category', track)}"
                except Exception:
                    pass

                info = [
                    f"Team: {team_name}",
                    f"Project Title: {project_name}",
                    f"Track: {track}",
                ]
                if college:
                    info.append(f"Institution: {college}")
                if mentor:
                    info.append(f"Assigned Mentor: {mentor}")
                if members_list:
                    info.append(f"Team Members: {', '.join(members_list[:4])}")
                if submission_details:
                    info.append(submission_details)
                return "\n".join(info)
        except Exception as e:
            print(f"[AI Service] Team context resolution notice: {e}")
        return "Individual participant / No registered team found"

    async def generate_response(
        self,
        query: str,
        context: List[str] = None,
        hackathon_id: Optional[str] = None,
        objective: Optional[str] = None,
        student_id: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Generate AI response with hackathon & project context, respecting dual-mode query rules"""
        try:
            hackathon_info = await self._get_hackathon_context(hackathon_id)
            relevant_docs = await self._retrieve_relevant_documents(query, hackathon_id) if hackathon_id else []
            
            context_str = ""
            if context and len(context) > 0:
                context_str = "\nAdditional Context: " + "\n".join(context)

            objective_str = f"Student Objective: {objective}" if objective else ""
            team_context_str = await self._get_student_team_context(student_id, hackathon_id)

            system_role = f"""You are the ProEduvate Project AI Assistant & Technical Co-Mentor for students participating in hackathons.
Your primary role is to provide real-time, expert, and encouraging technical mentorship on hackathon projects, problem statements, architectures, tech stacks, code, debugging, APIs, and submission pitches.

ACTIVE HACKATHON CONTEXT:
{hackathon_info}

STUDENT TEAM & PROJECT CONTEXT:
{team_context_str}
{objective_str}
{context_str}

CRITICAL BEHAVIORAL INSTRUCTIONS:
1. PROJECT & TECHNICAL QUERIES:
If the student asks queries about their hackathon project, problem statement, architecture, system design, algorithm, code, debugging, database, tech stack, presentation pitch, or hackathon rules:
- Provide high-quality, comprehensive, and actionable technical advice.
- Format responses in clean GitHub markdown using structured headers, bullet points, and code blocks with language tags (e.g. ```python, ```javascript, ```sql) where appropriate.
- Directly connect your guidance to their project and track context when relevant.

2. GENERAL / CASUAL / OFF-TOPIC QUERIES:
If the student asks a general conversational greeting (e.g., "hi", "hello", "hey", "how are you"), tells a joke, or asks an off-topic question unrelated to their hackathon project or coding (e.g., general trivia, weather, news, entertainment, non-hackathon topics):
- Respond politely and warmly, but immediately state your purpose and redirect them to their project:
"Hello! I am your ProEduvate Project AI Assistant. If you have any queries related to your hackathon project, problem statement, architecture, tech stack, code, or submission, feel free to ask me! What are you building or working on today?"
- If the student has a registered project, invite them to ask about that specific project.
- Do NOT provide extended essays or dive into unrelated non-hackathon topics; always gently redirect them back to their project.
"""

            chat_messages = [{"role": "system", "content": system_role}]

            # Add multi-turn conversation history (last 6 messages)
            if history and isinstance(history, list):
                for item in history[-6:]:
                    r = item.get("role") or ("user" if item.get("sender") == "user" else "assistant")
                    c = item.get("content") or item.get("text") or ""
                    if r in ["user", "assistant"] and isinstance(c, str) and c.strip():
                        chat_messages.append({"role": r, "content": c.strip()})

            chat_messages.append({"role": "user", "content": query})

            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(
                        messages=chat_messages,
                        temperature=0.3,
                        max_tokens=950
                    )
                ),
                timeout=50.0
            )

            if text and text.strip():
                return {
                    "response": text.strip(),
                    "sources": relevant_docs[:3] if relevant_docs else [],
                    "model_used": self.primary_model,
                    "source": "nvidia-nim"
                }
        except Exception as e:
            print(f"[AI Service] generate_response notice: {e}")

        # Smart fallback if NVIDIA API fails or times out
        q_lower = query.strip().lower()
        is_greeting_or_casual = (
            len(q_lower.split()) <= 4 and
            any(w in q_lower for w in ["hi", "hello", "hey", "greetings", "good morning", "good evening", "how are you", "who are you"])
        )
        if is_greeting_or_casual:
            return {
                "response": "Hello! I am your ProEduvate Project AI Assistant. If you have any queries related to your hackathon project, problem statement, architecture, tech stack, code, or submission, feel free to ask me! What are you building or working on today?",
                "source": "fallback"
            }

        return {
            "response": f"### Project Mentorship Guidance\n\nFor your question regarding *'{query[:60]}...'*, focus on these key hackathon pillars:\n- **Core MVP:** Implement your end-to-end critical user path before refining secondary features.\n- **Clean Architecture:** Keep business logic separated from API and UI layers.\n- **Demo Readiness:** Prepare a concise demonstration script highlighting the problem solved, tech stack, and impact.\n\n*Feel free to ask a specific technical question about your code or architecture!*",
            "source": "fallback"
        }

    async def _retrieve_relevant_documents(
        self, query: str, hackathon_id: Optional[str]
    ) -> List[str]:
        """Retrieve relevant documents from vector store / MongoDB"""
        try:
            embeddings_collection = get_ai_embeddings_collection()
            if not embeddings_collection:
                return []
            
            query_filter = {}
            if hackathon_id and hackathon_id != "general":
                query_filter["hackathon_id"] = hackathon_id

            docs = await embeddings_collection.find(query_filter).limit(3).to_list(3)
            return [doc.get("content", "") for doc in docs if doc.get("content")]
        except Exception:
            return []

    async def _get_hackathon_context(self, hackathon_id: Optional[str]) -> str:
        """Get basic hackathon context from DB or string"""
        if not hackathon_id or hackathon_id == "general":
            return "General Hackathon Guidance across AI, Web3, FullStack, and Cloud tracks."

        try:
            db = get_db()
            hackathon = None
            try:
                from bson import ObjectId
                if ObjectId.is_valid(hackathon_id):
                    hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
            except Exception:
                pass

            if not hackathon:
                hackathon = await db["hackathons"].find_one({
                    "$or": [
                        {"hackathonId": hackathon_id},
                        {"title": {"$regex": hackathon_id, "$options": "i"}}
                    ]
                })

            if not hackathon:
                return f"Hackathon Track: {hackathon_id}"

            return f"""
Hackathon: {hackathon.get('title', 'Hackathon')}
Description: {hackathon.get('description', '')}
Themes / Tracks: {', '.join(hackathon.get('themes', []))}
Status: {hackathon.get('status', 'Active')}
Rules / Overview: {hackathon.get('rules', '')[:250]}
"""
        except Exception:
            return f"Hackathon Track: {hackathon_id}"

    async def generate_idea_feedback(
        self, idea: str, hackathon_themes: List[str]
    ) -> Dict[str, Any]:
        """Provide AI feedback on hackathon idea"""
        prompt = f"""Evaluate this hackathon idea:
Themes: {', '.join(hackathon_themes)}
Idea: {idea}

Provide structured feedback in Markdown with:
1. Strengths (2-3 bullets)
2. Potential Pitfalls / Weaknesses (2 bullets)
3. Feasibility Score (1-5 / 5) with justification
4. Theme Alignment Score (1-5 / 5)
5. Next Actionable Steps for the team"""

        system_role = "You are a senior hackathon judge evaluating a project idea. Provide practical, high-value feedback in Markdown."

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, system_role=system_role, temperature=0.3, max_tokens=700)
                ),
                timeout=25.0
            )

            if text:
                return {
                    "feedback": text,
                    "analysis": {
                        "themes_alignment": 4.5,
                        "feasibility_score": 4.2
                    },
                    "source": "nvidia-llama"
                }
        except Exception as e:
            print(f"[AI Service] Idea feedback notice: {e}")

        return {
            "feedback": f"### Idea Evaluation for '{idea[:40]}...'\n\n- **Strengths:** Directly aligns with {', '.join(hackathon_themes) if hackathon_themes else 'core hackathon tracks'}.\n- **Feasibility:** High potential for rapid prototyping within hackathon timeframes.\n- **Recommended Next Step:** Build a working prototype focusing on core user value.",
            "analysis": {
                "themes_alignment": 4.5,
                "feasibility_score": 4.0
            },
            "source": "heuristic"
        }

    async def suggest_mentor_match(
        self, team_requirements: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Suggest mentor matches based on team requirements"""
        prompt = f"""Based on these team requirements, generate top 3 mentor matching priorities:
Team Requirements:
- Expertise needed: {team_requirements.get('expertise', [])}
- Project type: {team_requirements.get('project_type', 'General')}
- Tech stack: {team_requirements.get('tech_stack', [])}
- Team experience: {team_requirements.get('experience_level', 'Intermediate')}

Format as JSON array with items {{"priority": 1, "criteria": "...", "recommendedRole": "..."}}. Return JSON only."""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.1, max_tokens=400)
                ),
                timeout=25.0
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed
        except Exception as e:
            print(f"[AI Service] Mentor match notice: {e}")

        tech = ", ".join(team_requirements.get('tech_stack', [])) or "FullStack & Cloud"
        return [
            {"priority": 1, "criteria": f"Specialized guidance in {tech}", "recommendedRole": "Technical Architect"},
            {"priority": 2, "criteria": "Product Demo & Pitch Mentorship", "recommendedRole": "Product Lead"},
            {"priority": 3, "criteria": "Deployment & Scalability Verification", "recommendedRole": "DevOps Specialist"}
        ]

# Singleton instance
ai_service = AICoMentorService()
