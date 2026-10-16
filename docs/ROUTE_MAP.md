# HackZen — Canonical Platform Route Map (PLT-01)

> **Document Version:** 1.0.0  
> **Last Updated:** 2026-10-08  
> **Authority:** Frontend Root [`frontend/src/App.jsx`](file:///e:/Frontend%20Internship/hackathon%20project/HackZen/frontend/src/App.jsx)

---

## 1. Public & Authentication Routes (No Protected Guard)

| Path | Component | Guard / Access | Purpose / Description |
| :--- | :--- | :--- | :--- |
| `/` | `Home` | Public | Platform landing page, featured hackathons, showcase, and CTAs. |
| `/get-started` | `RoleSelection` | Public | First step onboarding: choose role (Student, Mentor, Organizer). |
| `/role-selection` | `RoleSelection` | Public | Alias to `/get-started`. |
| `/signup` | `Signup` | Public | Registration form with password strength indicator and role hydration. |
| `/login` | `Login` | Public | Authentication login supporting email/password and OAuth providers. |
| `/oauth/callback` | `OAuthCallback` | Public | OAuth token exchange and session hydration. |
| `/forgot-password` | `ForgotPassword` | Public | Account recovery and password reset request. |
| `/verify` | `PublicVerifyCertificate` | Public | Certificate validation lookup by credential ID. |
| `/verify/:certId` | `PublicVerifyCertificate` | Public | Direct credential validation lookup and authenticity card. |
| `/unauthorized` | `Unauthorized` | Public | 403 Access Denied interstitial page. |
| `*` | `NotFound` | Public | 404 fallback page. |

---

## 2. Student Portal Routes (`/student/*`)
*Protected by: `<ProtectedRoute requiredRole="student">` with `<DashboardLayout />`*

| Path | Component | Sub-routes / Tabs | Purpose / Description |
| :--- | :--- | :--- | :--- |
| `/student` | `<Navigate to="dashboard" replace />` | — | Root redirect. |
| `/student/dashboard` | `StudentDashboard` | Overview | Metrics KPIs, registered hackathons, activity feed, announcements. |
| `/student/submissions` | `StudentSubmissions` | List / Detail modal | List of submitted projects with scores and review statuses. |
| `/student/hackathons` | `StudentHackathons` | Explorer / Search | Filterable search of open hackathons with debounced query. |
| `/student/hackathons/:hackathonId` | `StudentHackathons` | Detail Modal | Detailed hackathon overview and registration CTA. |
| `/student/hackathons/:hackathonId/register` | `StudentHackathonRegistration` | Steps 1, 2, 3, Success | Multi-step registration flow. |
| `/student/teams` | `StudentTeamOverview` | Overview | Active team status, team code, and member list. |
| `/student/teams/create` | `StudentCreateTeam` | Step 1, 2 | Create team for registered hackathon (student only). |
| `/student/teams/join` | `StudentJoinTeam` | Code entry | Join existing team via 6-digit invite code. |
| `/student/teams/:teamId/workspace` | `StudentTeamWorkspace` | Workspace | Team-specific collaboration workspace. |
| `/student/teams/:teamId/members` | `StudentTeamMembers` | Members | Roster management, role assignment, and leave team. |
| `/student/workspace` | `StudentWorkspace` | Code / Tasks / Milestones | Central hackathon development workspace with file uploads. |
| `/student/chat` | `StudentChat` | Channels | Team chat and mentor direct messaging. |
| `/student/mentor-profile` | `StudentMentorProfile` | Profile | Detailed mentor bio, experience, and availability. |
| `/student/mentor` | `StudentMentorProfile` | — | Alias to mentor profile. |
| `/student/mentor-request` | `StudentMentorRequest` | Form | Request guidance from an available mentor. |
| `/student/mentor-request-status` | `StudentMentorRequestStatus` | Timeline | Real-time status tracker for mentorship requests. |
| `/student/feedback` | `StudentFeedback` | Reviews | Feedback received from mentors and evaluators. |
| `/student/materials` | `StudentMaterials` | Resources | Resource library, code templates, guidelines. |
| `/student/project-info` | `StudentProjectInfo` | Project Details | Project definition, repo link, demo URL, tech stack. |
| `/student/project` | `StudentProjectInfo` | — | Alias to project info. |
| `/student/submission` | `StudentSubmission` | Multi-step Submission | Submit project deliverables for hackathon evaluation. |
| `/student/submission-status` | `StudentSubmissionStatus` | Status | Live status tracking of submitted project. |
| `/student/file-sharing` | `StudentFileSharing` | Assets | Shared team deliverables and assets repository. |
| `/student/files` | `StudentFileSharing` | — | Alias to file sharing. |
| `/student/ai-assistant` | `StudentAIAssistant` | Assistant | AI Co-Mentor chat with Markdown, code blocks, session history. |
| `/student/certificates` | `StudentCertificates` | Gallery | Certificate awards with SVG download and shareable verification. |
| `/student/certificates/verify` | `StudentCertificateVerification` | Verification | In-portal validation tool. |
| `/student/profile` | `StudentProfile` | Profile | Student profile, bio, skills, education. |
| `/student/profile/edit` | `EditStudentProfile` | Edit Form | Edit bio, competencies, and social links. |
| `/student/settings` | `StudentSettings` | Preferences | Notification preferences and account security. |

---

## 3. Mentor Portal Routes (`/mentor/*`)
*Protected by: `<ProtectedRoute requiredRole="mentor">` with `<MentorProvider>` and `<MentorLayout />`*

| Path | Component | Alias / Redirection | Purpose / Description |
| :--- | :--- | :--- | :--- |
| `/mentor` | `<Navigate to="dashboard" replace />` | — | Root redirect. |
| `/mentor/dashboard` | `MentorDashboard` | — | Cohort summary, upcoming meetings, pending requests. |
| `/mentor/hackathons` | `MentorHackathons` | — | Active hackathons mentor is participating in. |
| `/mentor/mentorship-requests` | `MentorshipRequests` | `/mentor/requests` | Incoming mentorship requests from teams. |
| `/mentor/requests` | `MentorshipRequests` | — | Canonical requests route. |
| `/mentor/teams` | `AssignedTeams` | `/mentor/assigned-teams` | Assigned cohort teams with quick-action cards. |
| `/mentor/assigned-teams` | `<Navigate to="/mentor/teams" replace />` | — | Route alias (`MEN-01`). |
| `/mentor/teams/:teamId` | `TeamDetails` | — | In-depth team profile and roster. |
| `/mentor/teams/:teamId/workspace` | `TeamDetails` | — | Team workspace overview. |
| `/mentor/teams/join` | `DiscoverTeams` | `/mentor/discover-teams` | Discover teams looking for a mentor (`MEN-02`). |
| `/mentor/discover-teams` | `<Navigate to="/mentor/teams/join" replace />` | — | Route alias (`MEN-02`). |
| `/mentor/teams/create` | `CreateTeam` | `/mentor/create-team` | Student-only explanation card with CTAs (`MEN-03`). |
| `/mentor/create-team` | `<Navigate to="/mentor/teams/create" replace />` | — | Route alias (`MEN-03`). |
| `/mentor/sessions` | `MentorSessions` | — | Scheduled sessions, calendar, and video links. |
| `/mentor/messages` | `MentorMessages` | — | Direct messaging channels with assigned teams. |
| `/mentor/resources` | `MentorResources` | `/mentor/materials` | Shared templates, boilerplates, and guidelines. |
| `/mentor/materials` | `MentorResources` | — | Route alias. |
| `/mentor/feedback` | `Feedback` | — | Rubric evaluation scoring and guidance feedback. |
| `/mentor/reviews` | `MentorWorkspace` (`tab="reviews"`) | — | Milestone code reviews. |
| `/mentor/forum` | `MentorWorkspace` (`tab="forum"`) | — | Community discussions and Q&A. |
| `/mentor/ai-co-mentor` | `MentorAICoMentor` | — | AI assistant for evaluation tips and feedback phrasing. |
| `/mentor/profile` | `MentorProfile` | — | Mentor credentials and expertise domains. |
| `/mentor/profile/edit` | `EditMentorProfile` | — | Edit profile and skills. |
| `/mentor/settings` | `MentorSettings` | — | Availability, calendar sync, notifications. |

---

## 4. Organizer Portal Routes (`/organizer/*`)
*Protected by: `<ProtectedRoute requiredRole="organizer">` with `<DashboardLayout />`*

| Path | Component | Alias / Redirection | Purpose / Description |
| :--- | :--- | :--- | :--- |
| `/organizer` | `<Navigate to="dashboard" replace />` | — | Root redirect. |
| `/organizer/dashboard` | `OrganizerDashboard` | — | Platform overview, registration spikes, active cohorts. |
| `/organizer/my-hackathons` | `MyHackathons` | — | Listing and management of created hackathons. |
| `/organizer/analytics` | `Analytics` | — | Registration trends, submission ratios, engagement KPIs. |
| `/organizer/teams-mentors` | `TeamsMentors` | `/organizer/invite-mentors` | Cohort team assignment and mentor invitations. |
| `/organizer/create-hackathon` | `CreateHackathon` | Steps 1–4 | Multi-step wizard to publish new hackathons. |
| `/organizer/manage-hackathon` | `ManageHackathon` | Overview, Criteria, Init | Hackathon operations cockpit. |
| `/organizer/manage-hackathon/:id` | `ManageHackathon` | — | Targeted event management cockpit. |
| `/organizer/hackathons/:id/manage` | `ManageHackathon` | — | Canonical nested alias. |
| `/organizer/edit-timeline/:id` | `EditTimeline` | — | Stage deadline adjusting. |
| `/organizer/submissions` | `Submissions` | — | Review queue of team project deliverables. |
| `/organizer/evaluation` | `EvaluationPanel` | `/organizer/evaluation-panel` | Scoring interface and rubrics. |
| `/organizer/evaluation/criteria` | `EvaluationCriteria` | — | Weighting and criteria configuration. |
| `/organizer/results` | `ResultsCertificates` | `/organizer/results-certificates` | Winner declaration and certificate issuance. |
| `/organizer/profile` | `OrganizerProfile` | — | Organizer organization details. |
| `/organizer/profile/edit` | `EditOrganizerProfile` | — | Edit organization profile. |
| `/organizer/settings` | `OrganizerSettings` | — | Event defaults, integrations, webhooks. |

---

## 5. Admin Portal Routes (`/admin/*`)
*Protected by: `<ProtectedRoute requiredRole="admin">` with `<DashboardLayout />`*

| Path | Component | Purpose / Description |
| :--- | :--- | :--- |
| `/admin` | `<Navigate to="dashboard" replace />` | Root redirect. |
| `/admin/dashboard` | `AdminDashboard` | High-level system health, approvals counter, active user volume. |
| `/admin/organizer-approvals` | `OrganizerApprovals` | Vetting and verification of organizer applications. |
| `/admin/hackathon-approvals` | `HackathonApprovals` | Reviewing and approving published hackathon listings. |
| `/admin/analytics` | `AdminAnalytics` | Global platform KPIs, retention, registration charts, CSV/PDF export. |
| `/admin/disputes` | `AdminDisputes` | Escalation resolution, team disputes, and arbitration logs. |
| `/admin/certificates` | `AdminCertificates` | Global certificate audit log, revocation, and template verification. |
| `/admin/submissions` | `AdminSubmissions` | Global submissions audit, AI integrity checks, anti-plagiarism scores. |
| `/admin/users` | `UsersManagement` | RBAC control, ban/unban users, role assignment, password resets. |
| `/admin/hackathon-change-requests` | `HackathonChangeRequest` | Organizer modification request approvals. |
| `/admin/profile` | `AdminProfile` | System administrator credentials. |
| `/admin/profile/edit` | `EditAdminProfile` | Admin profile configuration. |
| `/admin/settings` | `AdminSettings` | Security policies, JWT expiry, SMTP configuration, maintenance mode. |

---

## 6. Access Control Rules Matrix (PLT-02)

| User Role | Can Access `/student/*` | Can Access `/mentor/*` | Can Access `/organizer/*` | Can Access `/admin/*` |
| :--- | :---: | :---: | :---: | :---: |
| **Anonymous** | ❌ (Redirects to `/login`) | ❌ (Redirects to `/login`) | ❌ (Redirects to `/login`) | ❌ (Redirects to `/login`) |
| **Student** | ✅ | ❌ (`/unauthorized`) | ❌ (`/unauthorized`) | ❌ (`/unauthorized`) |
| **Mentor** | ❌ (`/unauthorized`) | ✅ | ❌ (`/unauthorized`) | ❌ (`/unauthorized`) |
| **Organizer** | ❌ (`/unauthorized`) | ❌ (`/unauthorized`) | ✅ | ❌ (`/unauthorized`) |
| **Admin** | ❌ (`/unauthorized`) | ❌ (`/unauthorized`) | ❌ (`/unauthorized`) | ✅ |
