import os
from typing import Optional

import requests


class AIHandler:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        self.timeout = float(os.getenv("OPENROUTER_TIMEOUT_SEC", "25"))

    def detect_intent(self, user_message: str) -> str:
        text = (user_message or "").lower()
        if any(token in text for token in ("ppt", "slides", "presentation", "deck")):
            return "ppt"
        if any(
            token in text
            for token in (
                "code",
                "python",
                "fastapi",
                "flask",
                "react",
                "html",
                "css",
                "javascript",
            )
        ):
            return "code"
        if any(
            token in text
            for token in (
                "problem statement",
                "rules",
                "theme",
                "prize",
                "timeline",
                "dataset",
            )
        ):
            return "facts"
        if any(token in text for token in ("review", "evaluate", "judge")):
            return "review"
        return "general"

    def _response_rules(self, intent: str) -> str:
        base_rule = (
            "Stay in hackathon mentor mode. Your purpose is to guide students and mentors, not to complete their work. "
            "Use the hackathon dataset to explain rules, timelines, themes, tracks, prizes, judging criteria, and requirements when asked. "
            "Do not write final submissions, full code, full PPT text, scripts, slide content, or finished deliverables. "
            "Guide with reasoning, questions, checkpoints, risks, choices, and next steps. "
            "Use headings '## Hackathon Guidance', '## Questions To Consider', and '## Next Step'."
        )

        if intent == "code":
            return (
                f"{base_rule} "
                "For code requests, do not provide code blocks or implementation files. "
                "Instead, explain what the user should design, what components they need, what tradeoffs matter, and what they should build next."
            )

        if intent == "ppt":
            return (
                f"{base_rule} "
                "For PPT or presentation requests, do not create slide titles, bullet content, speaker notes, or a finished deck. "
                "Instead, coach the user on story flow, judging alignment, evidence to include, and questions they should answer."
            )

        if intent == "facts":
            return (
                f"{base_rule} "
                "For factual hackathon questions, give the relevant information from the retrieved dataset clearly and briefly, "
                "then add mentor guidance about how the user should use that information."
            )

        return base_rule

    def _system_prompt(
        self,
        hackathon: str,
        role: str,
        stage: str,
        intent: str,
        has_context: bool,
        memory_notes: str,
    ) -> str:
        context_rule = (
            "Use the retrieved hackathon dataset as the primary source of truth. "
            "Ground your response in that dataset before giving any general guidance. "
            "Do not mix information from other hackathons. "
            "If the dataset contains the requested information, provide it in concise mentor language."
            if has_context
            else "If no relevant hackathon dataset context is available, say that the dataset did not contain a clear match, then give generic mentor guidance."
        )

        memory_rule = (
            f"Use this memory to stay consistent and avoid repetition:\n{memory_notes}"
            if memory_notes
            else "If there is no useful memory yet, keep the answer self-contained."
        )

        return (
            "You are an expert AI mentor inside a hackathon portal. "
            "You help users understand hackathon information and make better decisions. "
            "You are a mentor, not a content generator, coder, or slide writer. "
            "Never produce complete code, direct implementation files, completed PPT content, speaker scripts, or final project submissions. "
            "If the user asks for those, politely redirect into guidance, planning, evaluation criteria, and questions they should answer. "
            "If dataset context exists, use it first. If not, fall back to generic mentor guidance only after saying the dataset did not contain a clear match. "
            f"{self._response_rules(intent)} "
            f"{context_rule} "
            f"{memory_rule} "
            f"Current hackathon: {hackathon}. User role: {role}. Current stage: {stage}. "
            "Keep answers clear, relevant, short, and non-repetitive. "
            "Ask 2 to 4 focused questions when the user needs direction. "
            "End with one practical next step the user can do themselves."
        )

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "http://localhost:8000"),
            "X-Title": os.getenv("OPENROUTER_APP_NAME", "Hackathon AI Mentor"),
        }

    def generate_response(
        self,
        user_message: str,
        context: str,
        hackathon: str,
        role: str,
        stage: str,
        recent_history: list,
        memory_notes: str = "",
        has_context: bool = False,
    ) -> str:
        if not self.api_key:
            return "**Configuration error**\n- Missing `OPENROUTER_API_KEY` in `.env`"

        intent = self.detect_intent(user_message)
        messages = [
            {
                "role": "system",
                "content": self._system_prompt(
                    hackathon=hackathon,
                    role=role,
                    stage=stage,
                    intent=intent,
                    has_context=has_context,
                    memory_notes=memory_notes,
                ),
            }
        ]

        if context:
            messages.append(
                {
                    "role": "system",
                    "content": f"Retrieved hackathon context:\n{context}",
                }
            )

        for item in recent_history[-8:]:
            if item.get("role") in ("user", "assistant"):
                messages.append(
                    {"role": item["role"], "content": item.get("content", "")}
                )

        messages.append({"role": "user", "content": user_message})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.25 if intent in {"code", "facts", "review"} else 0.4,
            "max_tokens": 900,
        }

        try:
            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers(),
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        except Exception as exc:
            return (
                "**Service error**\n"
                f"- {str(exc)}\n"
                "- Check the OpenRouter key or try again."
            )

    def generate_review(
        self, hackathon: str, role: str, stage: str, uploaded_text: str, base_text: str
    ) -> str:
        if not self.api_key:
            return "**Configuration error**\n- Missing `OPENROUTER_API_KEY` in `.env`"

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an expert hackathon mentor reviewing a submission. Compare the uploaded submission with the official hackathon data. "
                    "Do not rewrite the submission, create final content, or provide finished code or PPT text. "
                    "Give mentor-style feedback that helps the user improve their own work. "
                    "Use headings '## Review Guidance', '## What Matches', '## What To Improve', and '## Next Step'. "
                    f"Hackathon: {hackathon}. Role: {role}. Stage: {stage}."
                ),
            },
            {"role": "system", "content": f"Official hackathon data:\n{base_text}"},
            {"role": "system", "content": f"Uploaded file content:\n{uploaded_text}"},
            {"role": "user", "content": "Review this submission."},
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 800,
        }

        try:
            response = requests.post(
                self.base_url,
                json=payload,
                headers=self._headers(),
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        except Exception as exc:
            return (
                "**Service error**\n"
                f"- {str(exc)}\n"
                "- Check the OpenRouter key or try again."
            )
