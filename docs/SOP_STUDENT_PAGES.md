# Standard Operating Procedure (SOP)
## Student Portal Architecture, Pending Features & Engineering Roadmap

---

### Document Control

| Attribute | Details |
| :--- | :--- |
| **Document ID** | `SOP-ENG-STU-001` |
| **Version** | `1.0.0` |
| **Effective Date** | September 2026 |
| **Document Owner** | Frontend & Full-Stack Engineering Team |
| **Reviewer / Approver** | Engineering Team Lead / Technical Project Manager |
| **Target Application** | HackZen Enterprise Hackathon Management Platform |
| **Classification** | Internal Engineering & Quality Assurance Standard |

---

## 1. Purpose & Scope

### 1.1 Objective
This Standard Operating Procedure (SOP) defines the operational baseline, architectural structure, current functional status, and required engineering tasks for the **Student Role Experience** within the HackZen Platform. It serves as an authoritative technical reference for the team leader, developers, and QA engineers to plan subsequent development sprints, resolve technical debt, and ensure platform compliance before production release.

### 1.2 Scope
This document covers all user journeys, components, services, and backend integrations associated with authenticated students, including:
- Student Dashboard & Operational Milestones
- Hackathon Catalog & Arena Detail View
- Multi-Step Team Registration Wizard
- Team Management & Real-Time Workspace
- Project Deliverable Submissions & Version Control
- Credential Verification & Certificate Portfolio
- AI Co-Mentor Assistant Portal
- Student Professional Profile & Identity Management
- Account Settings & Security Governance

---

## 2. System Architecture & Module Map

### 2.1 Route to Component Hierarchy
All student routes operate under client-side Role-Based Access Control (RBAC) enforced by `ProtectedRoute` requiring the `student` role.

| Route Path | View Component | Frontend Service | Backend Route / Controller |
| :--- | :--- | :--- | :--- |
| `/student/dashboard` | `StudentDashboard.jsx` | `dashboardApi.js` | `GET /api/dashboard/my-hackathons` |
| `/student/hackathons` | `StudentHackathons.jsx` | `hackathonsApi.js` | `GET /api/hackathon/allHackathons` |
| `/student/hackathons/:id/register` | `StudentHackathonRegistration.jsx` | `hackathonRegistrationApi.js` | `POST /api/teams/`, `POST /api/applications/` |
| ↳ `.../step-1` | `HackathonRegistrationStepOne.jsx` | `hackathonRegistrationStepOneApi.js` | Local Context & Platform Settings |
| ↳ `.../step-2` | `HackathonRegistrationStepTwo.jsx` | `hackathonRegistrationStepTwoApi.js` | Session Draft Management |
| ↳ `.../step-3` | `HackathonRegistrationStepThree.jsx` | `hackathonRegistrationStepThreeApi.js` | Team & Application Creation |
| `/student/teams` | `TeamsPage.jsx` | `teamsApi.js` | `GET /api/teams/my-teams`, `POST /api/teams/join/{code}` |
| `/student/workspace` | `StudentWorkspace.jsx` | `teamApi.js` | `WS /api/chat/ws/{teamId}/{userId}`, `GET /api/progress/team/{id}` |
| `/student/submissions` | `StudentSubmissions.jsx` | `submissionsApi.js` | `GET /api/submissions/team/{id}`, `POST /api/submissions/` |
| `/student/certificates` | `StudentCertificates.jsx` | `certificatesApi.js` | `GET /api/certificates/my`, `POST /api/certificates/upload` |
| `/verify/:certId` | `PublicVerifyCertificate.jsx` | `api.js` | `GET /api/admin/certificates/verify/{id}` |
| `/student/ai-assistant` | `StudentAIAssistant.jsx` | `aiAssistantApi.js` | `POST /api/ai/chat`, `GET /api/ai/datasets` |
| `/student/profile` | `StudentProfile.jsx` | `profileApi.js` | `GET /api/profile/student` |
| `/student/profile/edit` | `EditStudentProfile.jsx` | `profileApi.js` | `PUT /api/profile/student` |
| `/student/settings` | `StudentSettings.jsx` | `studentSettingsApi.js` | `GET /api/settings/me`, `PUT /api/settings/me` |

---

## 3. Module Audits & Operational Gap Analysis

### 3.1 Student Dashboard
- **File Location:** `frontend/src/pages/student/StudentDashboard.jsx`
- **Purpose:** Centralized landing hub showing active engagements, milestone progress, and team assignments.
- **Current Operational Status:** Partially Functional (Data connected to `/api/dashboard/my-hackathons`).
- **Defects & Incomplete Features:**
  1. **Inactive Action Elements:** The "Dossier Details" button within the Featured Challenge banner contains no event listener or click handler.
  2. **Synthetic Metrics:**
     - The `Allocations` metric is hardcoded to `'26'` because compute resource tracking is not yet connected to the backend.
     - Operational Milestones (`Completed Hackathons`, `Mentor Sessions`, `Project Submissions`) default to hardcoded values (`8`, `23`, `14`) with fixed percentages (`80%`, `60%`, `70%`) rather than calculating real aggregate counts.
  3. **Context-Free Navigation:** The "Inspect Arena" CTA navigates to `/student/submissions` globally without passing the specific `hackathonId` or `teamId`.
  4. **Unimplemented Empty State:** For new student accounts with zero registered teams, the tactical tracking grid displays an empty frame without an onboarding CTA.

---

### 3.2 Hackathons Catalog & Discovery
- **File Location:** `frontend/src/pages/student/StudentHackathons.jsx`
- **Purpose:** Hackathon exploration, schedule review, participant eligibility checks, and registration trigger.
- **Current Operational Status:** Functional with UI and Data Gaps.
- **Defects & Incomplete Features:**
  1. **Inactive Action Elements:**
     - Detail View: "Download Brief" button has no click handler or downloadable attachment link.
     - Registered State: "Go to Dashboard" button lacks an action handler.
     - Pagination: "Load More Arenas" button lacks click handling and backend pagination parameters.
  2. **Missing Catalog Controls:** The view lacks an interactive search input, domain/theme filter pills (e.g., AI/ML, Web3, FinTech), status filters (Live, Upcoming, Concluded), and event mode toggles (Virtual, Hybrid, In-Person).
  3. **State Desynchronization:** Registration state (`registeredIds`) is maintained in browser `sessionStorage` rather than synchronizing from `GET /api/applications/my`. Reloading or changing devices results in lost registration indicators.
  4. **Service Redundancy:** Multiple overlapping services exist (`hackathonsApi.js`, `upcomingHackathonsApi.js`, `api/hackathonApi.js`) which require consolidation into a single clean module.

---

### 3.3 Multi-Step Hackathon Registration Wizard
- **File Location:** `frontend/src/pages/student/StudentHackathonRegistration.jsx` & Steps 1–3
- **Purpose:** Three-stage wizard for configuring team parameters, inviting collaborators, and submitting applications.
- **Current Operational Status:** Partially Functional (Creates team and basic application record).
- **Defects & Incomplete Features:**
  1. **Teammate Invites Dropped (Critical Blocker):** Step 2 collects an array of invited member email addresses (`memberEmails`) and operational notes (`notes`). However, `submitHackathonRegistration` in `hackathonRegistrationApi.js` only sends `{ hackathonId, teamName }` to `/api/teams/`. The invited emails are discarded, meaning teammates are never notified or invited.
  2. **Loss of Registration Notes:** Contextual notes provided by the team leader in Step 2 are not persisted to the application or team schema.
  3. **Absence of Resume / Portfolio Upload:** Industry hackathon registration standards require a resume or project link upload field, which is currently absent.
  4. **Late Registration Guard:** Registration deadline checks are not enforced in the wizard UI before the user starts the multi-step flow.

---

### 3.4 Team Collaboration & Workspace
- **File Locations:**
  - `frontend/src/pages/TeamsPage.jsx` (Mounted at `/student/teams`)
  - `frontend/src/pages/student/StudentWorkspace.jsx` (Mounted at `/student/workspace`)
- **Purpose:** Team coordination, numeric invite code sharing, milestone progress tracking, and chat communication.
- **Current Operational Status:** Dual Architectural Implementations with Gaps.
- **Defects & Incomplete Features:**
  1. **Redundant Workspace Implementations:** The codebase contains two distinct team workspace pages with divergent UI designs and separate API implementations. This requires consolidation into a single unified workspace.
  2. **Stubbed File Sharing:** In `teamsApi.js`, the files array returns an empty stub (`files: []`) with an explicit code comment indicating missing backend file endpoints.
  3. **Non-Persistent Task Management:** The "New Task" dialog in `TeamsPage.jsx` only appends items to local component state. There is no backend endpoint to store or update custom ad-hoc team tasks.
  4. **Missing Governance Controls:** Team leaders lack capabilities to remove team members or transfer leadership; members lack a self-service "Leave Team" action.

---

### 3.5 Project Deliverable Submissions
- **File Location:** `frontend/src/pages/student/StudentSubmissions.jsx`
- **Purpose:** Project deliverable packaging, file artifact upload, code repository linking, and evaluation tracking.
- **Current Operational Status:** Functional (Enforces platform settings for max file size and file type extensions).
- **Defects & Incomplete Features:**
  1. **Absence of Submission Editing:** Students can only submit additional versions (`v1`, `v2`). They cannot edit metadata or correct repository URLs on an active submission before evaluation begins.
  2. **Opaque Evaluation Breakdown:** Only an aggregate AI summary is displayed. Detailed rubric criteria scores (e.g., Innovation: 9/10, Code Architecture: 8/10) entered by evaluators are not rendered.
  3. **Dispute Mechanism Missing:** While the platform includes an administrative dispute system (`/api/admin/disputes/`), students have no interface to submit an evaluation dispute or grade appeal.
  4. **Deadline Timer:** The page lacks a real-time countdown timer to the submission deadline.

---

### 3.6 Certificates & Public Verification
- **File Locations:**
  - `frontend/src/pages/student/StudentCertificates.jsx`
  - `frontend/src/pages/PublicVerifyCertificate.jsx`
- **Purpose:** Digital certificate gallery, PDF download, external credential management, and cryptographic QR verification.
- **Current Operational Status:** Functional with Partial Feature Stubs.
- **Defects & Incomplete Features:**
  1. **Simulated Bulk Archive Download:** `downloadAllCertificates()` in `certificatesApi.js` returns a simulated success response (`Archive generation started...`) without producing an actual ZIP bundle.
  2. **Invalid Transcript Route:** `shareTranscript()` generates a link to `/share/profile`, which is not a defined route in the application routing table.
  3. **Hardcoded Verification Fallback:** `verifyCertificate()` returns placeholder text (`Authenticated User`, `ProEduvate Hackathon`) instead of parsing the live response attributes.

---

### 3.7 AI Co-Mentor Assistant Portal
- **File Location:** `frontend/src/pages/student/StudentAIAssistant.jsx`
- **Purpose:** Socratic guidance, challenge ideation, technical architecture review, and query logging.
- **Current Operational Status:** Backend Contract Mismatch (Running on Local Mock Datasets).
- **Defects & Incomplete Features:**
  1. **Missing Backend Endpoints (Critical Blocker):**
     - The frontend service `aiAssistantApi.js` expects:
       - `GET /api/ai/datasets` (Available hackathon RAG knowledge documents)
       - `GET /api/ai/history/{sessionId}` (Session conversation history)
       - `POST /api/ai/chat` (Accepting `session_id`, `hackathon_id`, `objective`, `message`)
       - `DELETE /api/ai/history/{sessionId}` (Session reset)
     - The backend currently provides `POST /api/chatbot/chat` and `GET /api/chatbot/logs`, which do not match the expected RAG session contract.
  2. **Mock Dataset Fallback:** Because `GET /api/ai/datasets` is absent, the interface continuously falls back to hardcoded default challenges (`Sustainable City Challenge`, `Digital Learning Companion`).
  3. **Synchronous Generation Delay:** Responses are awaited as a single block; streaming token support (SSE or WebSocket) is not implemented.

---

### 3.8 Student Profile & Settings
- **File Locations:**
  - `frontend/src/pages/student/StudentProfile.jsx`
  - `frontend/src/pages/student/EditStudentProfile.jsx`
  - `frontend/src/pages/student/StudentSettings.jsx`
- **Purpose:** Professional branding, skills inventory, account preferences, security toggles, and authentication credentials.
- **Current Operational Status:** Partially Functional.
- **Defects & Incomplete Features:**
  1. **Unchecked Profile Update (Silent Failure Risk):** `EditStudentProfile.jsx` dispatches the update request asynchronously without awaiting resolution and navigates back immediately. If the server fails to persist changes, the user receives no error notice and changes are lost on reload.
  2. **Social URL Formatting Defect:** `StudentProfile.jsx` prepends `https://` unconditionally (`https://${user.links.github}`), generating malformed links (`https://https://github.com/...`) if a user enters a full URL.
  3. **Profile Picture Upload:** The profile only renders initials; avatar image upload and hosting is not supported.
  4. **Incomplete 2FA Implementation:** Toggling Two-Factor Authentication updates a database flag, but no QR code setup flow or TOTP challenge on login is implemented.
  5. **Disconnected Theme Settings:** The theme selection dropdown does not trigger the application's root `ThemeContext` styling.

---

## 4. Prioritized Engineering Defect Matrix

The following table categorizes all identified items by urgency for upcoming sprint planning.

| Issue ID | Priority | Module | Description | Target Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **STU-P0-01** | **P0 (Blocker)** | Registration | Step 2 teammate emails are discarded during submission | Implement backend invite dispatcher in `POST /api/teams/{id}/invitations` |
| **STU-P0-02** | **P0 (Blocker)** | AI Assistant | Missing `/api/ai/datasets` and session history endpoints | Align backend `ai_chatbot.py` with frontend service contract |
| **STU-P0-03** | **P0 (Blocker)** | Profile | Fire-and-forget save in profile editor causes silent data loss | Await API response, handle errors with toast notifications |
| **STU-P1-01** | **P1 (High)** | Catalog | Missing search bar, theme pills, status/mode filters | Implement catalog filter toolbar and bind to backend query params |
| **STU-P1-02** | **P1 (High)** | Catalog | Registration status reads from `sessionStorage` | Fetch user applications from `GET /api/applications/my` |
| **STU-P1-03** | **P1 (High)** | Submissions | Detailed judge rubrics and scores are hidden | Build criteria evaluation breakdown dialog |
| **STU-P1-04** | **P1 (High)** | Submissions | No student interface to file an evaluation dispute | Connect "File Dispute" action to `/api/admin/disputes/` |
| **STU-P1-05** | **P1 (High)** | Teams | Two duplicate team workspace interfaces exist | Deprecate redundant view and unify into a single workspace |
| **STU-P1-06** | **P1 (High)** | Certificates | `downloadAllCertificates()` is a placeholder | Implement backend ZIP packaging for student certificates |
| **STU-P2-01** | **P2 (Medium)** | Dashboard | "Dossier Details" button and milestone values are static | Add click handling and connect real submission/mentor aggregates |
| **STU-P2-02** | **P2 (Medium)** | Profile | Social links produce malformed URLs (`https://https://...`) | Sanitize and normalize URL strings before rendering |
| **STU-P2-03** | **P2 (Medium)** | Settings | 2FA toggle does not prompt authenticator setup | Build standard TOTP authenticator setup modal |

---

## 5. Backend Contract Specifications for Pending Work

To resolve blockers identified above, the backend service layer must support the following schemas.

### 5.1 Team Invitations API
- **Endpoint:** `POST /api/teams/{team_id}/invitations`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "hackathonId": "65b9e8a1f2c4d5e6a7b8c9d0",
    "emails": [
      "collaborator1@university.edu",
      "collaborator2@university.edu"
    ],
    "notes": "Frontend & ML Track team formation"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "teamId": "65b9e8a1f2c4d5e6a7b8c9d0",
    "invitationsSent": 2,
    "teamCode": "ZEN-84920",
    "deliveryStatus": "Emails Dispatched"
  }
  ```

### 5.2 AI Co-Mentor Dataset & Session Contracts
- **Endpoint:** `GET /api/ai/datasets`
- **Response (200 OK):**
  ```json
  {
    "datasets": [
      {
        "hackathon_id": "65b9e8a1f2c4d5e6a7b8c9d0",
        "label": "Autonomous Robotics Hackathon 2026",
        "file_name": "robotics_guidelines_v1.pdf",
        "theme": "Robotics & AI"
      }
    ]
  }
  ```
- **Endpoint:** `POST /api/ai/chat`
- **Request Body:**
  ```json
  {
    "session_id": "c7a8b9d0-1234-5678-9abc-def012345678",
    "hackathon_id": "65b9e8a1f2c4d5e6a7b8c9d0",
    "objective": "Ideation",
    "message": "What technical stack constraints apply to this challenge?"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "session_id": "c7a8b9d0-1234-5678-9abc-def012345678",
    "response": "The challenge requires open-source ROS 2 compatibility...",
    "timestamp": "2026-09-15T22:30:00Z",
    "sources": ["Guidelines Section 4.2"]
  }
  ```

---

## 6. Developer Operational Standards (Engineering Rules)

When developing or modifying student features, all engineers must comply with the following mandatory engineering rules:

### Rule 1: Centralized API Client Usage
- **Requirement:** All HTTP calls must utilize the shared `apiClient` instance located at `frontend/src/api/api.js`.
- **Rationale:** Ensures automatic injection of the `Authorization: Bearer <token>` header, automated refresh token handling on 401 responses, and consistent base URL routing across development and production environments.

### Rule 2: Platform Settings Compliance
- **Requirement:** Student workflows must consume settings via `usePlatformSettings()` from `frontend/src/context/PlatformSettingsContext.jsx`.
- **Enforcement Points:**
  - `maxTeamSize` and `minTeamSize` must restrict team creation dropdowns.
  - `validateDeliverableFile(file)` must be executed before uploading project files.
  - `allowLateSubmissions` must dictate whether submission actions are enabled post-deadline.
  - `publicVerification` must govern whether QR verification links are active.

### Rule 3: Zero Silent Failures
- **Requirement:** Never dispatch mutations asynchronously in the background without awaiting the response before navigation or UI state transitions.
- **Pattern:**
  ```javascript
  // MANDATORY PATTERN
  setIsSubmitting(true);
  try {
    await updateResource(payload);
    showToast('Saved successfully', 'success');
    navigate('/student/destination');
  } catch (error) {
    showToast(error.message || 'Operation failed. Changes were not saved.', 'error');
  } finally {
    setIsSubmitting(false);
  }
  ```

### Rule 4: Zero Inactive Elements
- **Requirement:** Elements styled as buttons or links must never exist without an attached click handler or route. If a feature is pending backend implementation, the element must be rendered in a disabled state with a tooltip explaining its pending status.

---

## 7. Acceptance Criteria & Definition of Done

A student feature or defect fix is considered **Complete and Ready for Merge** only when all of the following criteria are met:

1. **Compilation & Build:** `npm run build` executed in the `frontend` directory terminates with exit code `0` and zero syntax warnings.
2. **Access Control:** Unauthenticated users accessing the path are redirected to `/login`. Non-student roles are redirected to `/unauthorized`.
3. **Data Integrity:** Browser refresh (`F5`) does not clear or corrupt active team, registration, or submission states.
4. **Error Resilience:** Simulating an offline network or 500 error produces a clear user notification without application crashes or blank white screens.
5. **Responsive Validation:** The UI renders correctly without horizontal scrollbars across desktop (1440px), tablet (768px), and mobile (375px) breakpoints.

---

*This document is maintained by the Engineering Team. For change requests or revisions, submit an issue to the technical project lead.*
