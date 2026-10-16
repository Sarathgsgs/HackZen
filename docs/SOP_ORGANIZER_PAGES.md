# Standard Operating Procedure (SOP)
## Organizer Portal Architecture, Operational Gaps & Engineering Roadmap

---

### Document Control

| Attribute | Details |
| :--- | :--- |
| **Document ID** | `SOP-ENG-ORG-001` |
| **Version** | `1.0.0` |
| **Effective Date** | September 2026 |
| **Document Owner** | Frontend & Full-Stack Engineering Team |
| **Reviewer / Approver** | Engineering Team Lead / Technical Project Manager |
| **Target Application** | HackZen Enterprise Hackathon Management Platform |
| **Classification** | Internal Engineering & Quality Assurance Standard |

---

## 1. Purpose & Operational Scope

### 1.1 Objective
This Standard Operating Procedure (SOP) provides an exhaustive technical inventory, architectural map, current operational status, and defect breakdown for the **Organizer Portal** within the HackZen Platform. It establishes the baseline standard for engineering sprint planning, resolving technical debt, harmonizing broken routing contracts, and ensuring platform governance compliance before production deployment.

### 1.2 Scope
This standard encompasses all user journeys, components, frontend services, and backend API interactions under the authenticated `organizer` role, including:
- Organizer Central Dashboard & Metrics Funnel
- Hackathon Portfolio (`My Hackathons`) & Lifecycle Toggles
- 3-Step Hackathon Creation Wizard & Rules Specification
- Event Management Hub (`Manage Hackathon`), Evaluation Criteria, Event Initialization, and Mentor Invites
- Hackathon Timeline & Milestone Editing
- Team & Mentor Oversight, Rostering, and Assignments
- Project Deliverables & Submission Review
- Live Evaluation Panel, Rubric Scoring, and Evaluator Coordination
- Results Finalization, Leaderboard Publishing, and Certificate Auto-Issuance
- Organizer Event Analytics & Performance Metrics
- Organizer Institutional Profile & Operational Settings

---

## 2. System Architecture & Route Matrix

### 2.1 Route to Component Hierarchy
All organizer pages are mounted under `/organizer` in `App.jsx`, protected by `ProtectedRoute` requiring the `organizer` role.

| Route Path | Page Component | Frontend Service Layer | Primary Backend Endpoint |
| :--- | :--- | :--- | :--- |
| `/organizer/dashboard` | `Dashboard.jsx` | `dashboardApi.js` | `GET /api/dashboard/organizer-stats` |
| `/organizer/my-hackathons` | `MyHackathons.jsx` | `myHackathonsApi.js` | `GET /api/hackathon/allHackathons` |
| `/organizer/create-hackathon` | `CreateHackathon.jsx` | `createHackathonApi.js` | `POST /api/hackathon/create` |
| ↳ `.../step-1` | `CreateHackathonStepOne.jsx` | `createHackathonStepOneApi.js` | Basic Details & Banner Upload |
| ↳ `.../step-2` | `CreateHackathonStepTwo.jsx` | `createHackathonStepTwoApi.js` | Challenge Tracks & Team Constraints |
| ↳ `.../step-3` | `CreateHackathonStepThree.jsx` | `createHackathonStepThreeApi.js` | Final Review & Validation |
| `/organizer/manage-hackathon` | `ManageHackathon.jsx` | `manageHackathonApi.js` | `GET /api/hackathon/{id}` |
| ↳ `.../criteria` | `EvaluationCriteria.jsx` | `manageHackathonApi.js` | `GET/POST /api/evaluations/criteria` |
| ↳ `.../initialize` | `InitializeEvent.jsx` | `initializeEventApi.js` | `GET/POST /api/hackathon/{id}/initialize` |
| ↳ `.../invite-mentors` | `InviteMentors.jsx` | `teamsMentorsApi.js` | `POST /api/teams/mentor-invitations` |
| `/organizer/edit-timeline` | `EditTimeline.jsx` | Simulated Mock Service | `GET/PUT /api/hackathon/{id}/timeline` *(Missing)* |
| `/organizer/teams-mentors` | `TeamsMentors.jsx` | `teamsMentorsApi.js` | `GET /api/teams/organizer/*`, `/api/profile/mentors` |
| `/organizer/submissions` | `Submissions.jsx` | `submissionsApi.js` | `GET /api/submissions/` |
| `/organizer/evaluation` | `EvaluationPanel.jsx` | `evaluationPanelApi.js` | `GET/POST /api/evaluations/*` |
| `/organizer/results` | `ResultsCertificates.jsx` | `resultsCertificatesApi.js` | `GET /api/evaluations/leaderboard/{id}` |
| `/organizer/analytics` | `Analytics.jsx` | Simulated Mock Service | `GET /api/analytics/organizer/{id}` *(Missing)* |
| `/organizer/profile` | `OrganizerProfile.jsx` | `profileApi.js` | `GET /api/profile/me` |
| `/organizer/profile/edit` | `EditOrganizerProfile.jsx` | `profileApi.js` | `PUT /api/profile/me` |
| `/organizer/settings` | `OrganizerSettings.jsx` | `organizerSettingsApi.js` | `GET/PUT /api/profile/me` |

---

## 3. Comprehensive Module Audits & Operational Gap Analysis

### 3.1 Organizer Dashboard
- **File Location:** `frontend/src/pages/organizer/Dashboard.jsx`
- **Service:** `frontend/src/services/organizer/dashboardApi.js`
- **Current Status:** Partially Functional (High-level counts real; activity and funnel simulated).
- **Audit Findings & Defects:**
  1. **Unused Date Filter Parameter:** The component allows selecting date ranges (`7days`, `30days`, `90days`), but `fetchOrganizerDashboardData` sends an unparameterized request to `GET /api/dashboard/organizer-stats`. Time filtering is completely ignored by the backend.
  2. **Synthetic Funnel Data:** The participant conversion donut chart renders hardcoded mock values (`{ accepted: 85, inReview: 45, rejected: 12 }`).
  3. **Synthetic Activity Feed:** The recent activity list contains a single static stub (`Platform Sync - Intelligence Matrix`).
  4. **Need Review Metric:** The `Need Review` stat card value is hardcoded to `0` in `dashboardApi.js`.

---

### 3.2 Hackathon Portfolio (`MyHackathons.jsx`)
- **File Location:** `frontend/src/pages/organizer/MyHackathons.jsx`
- **Service:** `frontend/src/services/organizer/myHackathonsApi.js`
- **Current Status:** Functional List with Critical Routing Disconnects.
- **Audit Findings & Defects:**
  1. **Broken Navigation to Manage & Timeline (Critical Blocker):**
     - Clicking the **"Manage"** button executes:
       ```javascript
       navigate(`/organizer/hackathons/${id}/manage`, { state: { hackathon } });
       ```
     - Clicking the **"Edit Timeline"** button executes:
       ```javascript
       navigate(`/organizer/hackathons/${id}/edit-timeline`);
       ```
     - In `App.jsx`, these routes are declared as parameterless static routes (`/organizer/manage-hackathon` and `/organizer/edit-timeline`). Neither `/organizer/hackathons/:id/manage` nor `/organizer/hackathons/:id/edit-timeline` exist in the router, causing **404 Not Found** errors for organizers.
  2. **Lifecycle Toggles:** Visibility and registration toggle switches call `PUT /api/hackathon/{id}`, which works, but optimistic failure handling relies on browser `alert()` rather than standardized toast notifications.

---

### 3.3 3-Step Hackathon Creation Wizard
- **File Locations:**
  - `frontend/src/pages/organizer/CreateHackathon.jsx`
  - `frontend/src/pages/organizer/CreateHackathonStepOne.jsx` (Basics & Media)
  - `frontend/src/pages/organizer/CreateHackathonStepTwo.jsx` (Tracks & Constraints)
  - `frontend/src/pages/organizer/CreateHackathonStepThree.jsx` (Review & Publish)
- **Service:** `frontend/src/services/organizer/createHackathonApi.js`
- **Current Status:** Functional Creation Pipeline.
- **Audit Findings & Defects:**
  1. **Platform Settings Decoupling:** In Step 2, `maxTeamSize` and `minTeamSize` allow organizers to input numbers without validating against platform-wide limits (`maxTeamSize` configured in `PlatformSettingsContext.jsx`).
  2. **Draft Volatility:** The creation draft is persisted only in browser `sessionStorage`. If the user switches devices or clears browser data, unsubmitted hackathons are lost.
  3. **Auto-Approve Applications Policy:** Step 2 includes an `autoApprove` toggle, but the backend application service does not respect this flag when students register.

---

### 3.4 Hackathon Management Hub (`ManageHackathon.jsx`)
- **File Location:** `frontend/src/pages/organizer/ManageHackathon.jsx`
- **Sub-Views:** `EvaluationCriteria.jsx`, `InitializeEvent.jsx`, `InviteMentors.jsx`
- **Service:** `frontend/src/services/organizer/manageHackathonApi.js`
- **Current Status:** Incomplete Workspace with Missing Route Parameters.
- **Audit Findings & Defects:**
  1. **Undefined URL Parameter:** The component reads `const { hackathonId } = useParams()`. Because `App.jsx` defines `<Route path="manage-hackathon">` without `:hackathonId`, `hackathonId` is `undefined` unless navigated via internal state. Directly bookmarking or refreshing this page breaks the view.
  2. **Submissions & Active Teams Placeholders:** In the overview tab, the `Active Teams` and `Submissions` stat cards render placeholder dashes (`—`).
  3. **Broadcast Tab is Non-Functional:** The "Broadcast" tab provides UI for announcements, but there is no backend notification dispatcher endpoint (`POST /api/notifications/broadcast`) to notify participants.
  4. **Event Initialization Locking:** `InitializeEvent.jsx` checks readiness, but clicking "Initialize Event" does not enforce a state transition lock on the backend to prevent subsequent destructive edits to challenge tracks or rubrics once registrations begin.

---

### 3.5 Timeline Editor (`EditTimeline.jsx`)
- **File Location:** `frontend/src/pages/organizer/EditTimeline.jsx`
- **Service:** None (Direct Client Simulation)
- **Current Status:** 100% Simulated Mock Data (Non-Functional in Production).
- **Audit Findings & Defects:**
  1. **Simulated Data Loading:** Lines 43–60 use an 800ms `setTimeout` to load a hardcoded mock event (`"Future Tech Challenge 2026"`).
  2. **Simulated Persistence:** Line 155 uses a 1500ms `setTimeout` with a comment `// In a real app: await axios.put(...)` and triggers a browser `alert("Timeline updated successfully!")`.
  3. **No Backend API:** The backend currently has no `GET /api/hackathon/{id}/timeline` or `PUT /api/hackathon/{id}/timeline` endpoint.

---

### 3.6 Teams & Mentors Oversight (`TeamsMentors.jsx`)
- **File Location:** `frontend/src/pages/organizer/TeamsMentors.jsx`
- **Service:** `frontend/src/services/organizer/teamsMentorsApi.js`
- **Current Status:** Partially Functional.
- **Audit Findings & Defects:**
  1. **Synthetic Team Member List:** `teamsMentorsApi.js` reads `team.members` count as an integer and generates synthetic dummy member rows (`Member 1`, `Member 2`) instead of joining real user profiles.
  2. **Missing Bulk Actions:** Organizers cannot bulk-approve pending team applications or bulk-assign mentors across selected teams.
  3. **CSV Export Truncation:** `exportRowsToCsv` only exports the currently rendered page of 5 items rather than the entire filtered dataset.

---

### 3.7 Submissions Review & Evaluation Panel
- **File Locations:**
  - `frontend/src/pages/organizer/Submissions.jsx`
  - `frontend/src/pages/organizer/EvaluationPanel.jsx`
- **Services:** `submissionsApi.js`, `evaluationPanelApi.js`, `evaluationApi.js`
- **Current Status:** Functional Evaluation Flow with State Synchronization Gaps.
- **Audit Findings & Defects:**
  1. **Cross-Tab State Contamination:** In `Submissions.jsx`, clicking "Evaluate" sets `sessionStorage.setItem('eval_selectedTeamId', submissionId)` and navigates to `/organizer/evaluation`. If an organizer has multiple tabs open, active evaluation state gets corrupted.
  2. **Multi-Judge Consensus Missing:** `EvaluationPanel.jsx` allows the organizer to evaluate submissions directly, but there is no dashboard view showing scores across multiple assigned judges to detect scoring variance or consensus.
  3. **Automatic Rubric Weight Calculation:** Criteria weights in `EvaluationCriteria.jsx` are not automatically calculated or normalized to 100% when submitted.

---

### 3.8 Results Finalization & Certificate Issuance (`ResultsCertificates.jsx`)
- **File Location:** `frontend/src/pages/organizer/ResultsCertificates.jsx`
- **Service:** `frontend/src/services/organizer/resultsCertificatesApi.js`
- **Current Status:** Critical Hardcoded ID Dependencies.
- **Audit Findings & Defects:**
  1. **Hardcoded Hackathon IDs (Critical Blocker):**
     - Line 68 of `ResultsCertificates.jsx`:
       ```javascript
       await publishResults('hackathon-123'); // Hardcoded sample ID
       await apiClient.post('/admin/certificates/auto-issue/hackathon-123');
       ```
     - In `resultsCertificatesApi.js`:
       ```javascript
       export const fetchResultsAndCertificates = async (hackathonId = 'hack_1') => ...
       ```
     - The page possesses no hackathon selector or dynamic route parameter. It always requests data for `'hack_1'` and publishes for `'hackathon-123'`.
  2. **Mock Certificate Templates:** The certificate templates array (`Certificate of Excellence`, `Runner-Up Award`, `Participant Certificate`) is hardcoded in `resultsCertificatesApi.js` rather than querying the platform's certificate template inventory.

---

### 3.9 Organizer Analytics (`Analytics.jsx`)
- **File Location:** `frontend/src/pages/organizer/Analytics.jsx`
- **Service:** None (Direct Client Simulation)
- **Current Status:** 100% Simulated Mock Data.
- **Audit Findings & Defects:**
  1. **Simulated Math Generation:** Lines 41–70 generate random numbers (`Math.floor(12450 * multiplier)`) inside an 800ms `setTimeout`.
  2. **Fake Entity Feed:** Registration nodes and reviews are generated from static local arrays (`Alex Johnson`, `Sarah Lee`).
  3. **No Service Connection:** The component does not import any API client or service module.

---

### 3.10 Organizer Profile & Settings
- **File Locations:**
  - `frontend/src/pages/organizer/OrganizerProfile.jsx`
  - `frontend/src/pages/organizer/EditOrganizerProfile.jsx`
  - `frontend/src/pages/organizer/OrganizerSettings.jsx`
- **Services:** `profileApi.js`, `organizerSettingsApi.js`
- **Current Status:** Partially Functional.
- **Audit Findings & Defects:**
  1. **Static Profile Metrics:** `OrganizerProfile.jsx` displays hardcoded stats (`hackathons: 24`, `participants: '15K+'`, `efficiency: '98%'`).
  2. **Settings API Alignment:** `OrganizerSettings.jsx` writes to `PUT /api/profile/me`. However, preferences like `emailReports: 'weekly'` and `autoApproveMentors: false` are saved in the database but not connected to any background tasks.

---

## 4. Prioritized Engineering Defect Matrix

The following matrix categorizes all identified items for sprint planning.

| Issue ID | Priority | Module | Description | Target Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **ORG-P0-01** | **P0 (Blocker)** | Routing | Missing parameterized routes in `App.jsx` for Manage and Timeline | Declare `/organizer/hackathons/:hackathonId/manage` and `/organizer/hackathons/:hackathonId/edit-timeline` in `App.jsx` |
| **ORG-P0-02** | **P0 (Blocker)** | Results | Hardcoded `'hackathon-123'` / `'hack_1'` in Results & Certificates | Pass dynamic `hackathonId` via URL route or dropdown selection |
| **ORG-P0-03** | **P0 (Blocker)** | Timeline | `EditTimeline.jsx` is 100% mocked with `setTimeout` and browser `alert` | Implement `GET/PUT /api/hackathon/{id}/timeline` backend routes and service |
| **ORG-P0-04** | **P0 (Blocker)** | Analytics | `Analytics.jsx` is 100% simulated math | Connect to real backend organizer analytics aggregation endpoint |
| **ORG-P1-01** | **P1 (High)** | Dashboard | Date range filter is ignored by `dashboardApi.js` | Update `GET /api/dashboard/organizer-stats?range=` to filter metrics |
| **ORG-P1-02** | **P1 (High)** | Dashboard | Funnel chart and activity feed are hardcoded mocks | Build real application status funnel query in backend |
| **ORG-P1-03** | **P1 (High)** | Manage | Broadcast tab cannot send announcements | Implement `POST /api/notifications/broadcast` for organizers |
| **ORG-P1-04** | **P1 (High)** | Teams | Dummy member names (`Member 1`, `Member 2`) in roster | Join real user details from `teamMembers` collection |
| **ORG-P1-05** | **P1 (High)** | Creation | Creation wizard allows team size outside platform limits | Validate min/max team size against `PlatformSettingsContext` |
| **ORG-P1-06** | **P1 (High)** | Results | Certificate templates are hardcoded stubs in `resultsCertificatesApi.js` | Fetch real templates from `/api/admin/certificates/templates` |
| **ORG-P2-01** | **P2 (Medium)** | Profile | Static organizer stats (`24 hackathons`, `15K+ participants`) | Calculate real aggregate counts from database |
| **ORG-P2-02** | **P2 (Medium)** | Submissions | Evaluation navigation uses `sessionStorage` | Pass submission ID via clean query parameter or route |
| **ORG-P2-03** | **P2 (Medium)** | Teams | Export to CSV only exports active pagination page | Fetch and export full filtered dataset |

---

## 5. Backend Contract Specifications for Pending Work

To resolve blockers identified above, the backend service layer must support the following API contracts.

### 5.1 Timeline API Contract
- **Endpoint:** `GET /api/hackathon/{hackathon_id}/timeline`
- **Response (200 OK):**
  ```json
  {
    "hackathonId": "65b9e8a1f2c4d5e6a7b8c9d0",
    "phases": [
      {
        "id": "phase-1",
        "name": "Registration & Team Formation",
        "startDate": "2026-10-01T09:00:00Z",
        "endDate": "2026-10-15T18:00:00Z",
        "status": "Completed"
      },
      {
        "id": "phase-2",
        "name": "Hacking & Submission Phase",
        "startDate": "2026-10-16T09:00:00Z",
        "endDate": "2026-10-18T18:00:00Z",
        "status": "Ongoing"
      }
    ]
  }
  ```
- **Endpoint:** `PUT /api/hackathon/{hackathon_id}/timeline`
- **Request Body:**
  ```json
  {
    "phases": [
      {
        "id": "phase-1",
        "name": "Registration & Team Formation",
        "startDate": "2026-10-01T09:00:00Z",
        "endDate": "2026-10-15T18:00:00Z"
      }
    ]
  }
  ```

### 5.2 Organizer Analytics Aggregation Contract
- **Endpoint:** `GET /api/analytics/organizer?timeRange=30days&hackathonId=all`
- **Response (200 OK):**
  ```json
  {
    "timeRange": "30days",
    "metrics": {
      "totalRegistrations": 450,
      "activeTeams": 112,
      "submittedProjects": 98,
      "evaluatedProjects": 76
    },
    "registrationTrends": [
      { "date": "2026-09-01", "count": 24 },
      { "date": "2026-09-02", "count": 38 }
    ],
    "funnel": {
      "registered": 450,
      "teamFormed": 380,
      "submitted": 98,
      "shortlisted": 25
    }
  }
  ```

### 5.3 Event Broadcast Announcement Contract
- **Endpoint:** `POST /api/notifications/broadcast`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "hackathonId": "65b9e8a1f2c4d5e6a7b8c9d0",
    "targetAudience": "all_participants",
    "subject": "Submission Deadline Extended by 2 Hours",
    "message": "Due to high traffic, submissions will remain open until 20:00 UTC."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "recipientsCount": 450,
    "sentAt": "2026-09-16T15:30:00Z"
  }
  ```

---

## 6. Developer Operational Standards (Engineering Rules)

When developing or refactoring organizer features, engineers must strictly adhere to the following rules:

### Rule 1: Dynamic Route-Driven Context (`SOP-DEV-03`)
- **Requirement:** Never hardcode identifiers (e.g., `'hack_1'`, `'hackathon-123'`) or depend solely on transient `sessionStorage` to determine the active hackathon.
- **Implementation:** Always read the active resource ID from the URL using `useParams()` (e.g., `/organizer/hackathons/:hackathonId/manage`). Provide a fallback dropdown selector if accessed from a general path.

### Rule 2: Synchronized Router Declarations (`SOP-DEV-04`)
- **Requirement:** Every navigation target invoked in components must have a matching declaration in `App.jsx`.
- **Implementation:** Ensure parameterized routes (`:hackathonId`) are properly registered under the organizer layout route before implementing navigation buttons.

### Rule 3: Platform Settings Enforcement (`SOP-DEV-05`)
- **Requirement:** Organizers cannot override global platform boundaries defined by platform administrators.
- **Enforcement:** In `CreateHackathonStepTwo.jsx`, the organizer's `maxTeamSize` must not exceed `platformSettings.maxTeamSize`. Deliverable requirements must honor global file size caps.

### Rule 4: Zero Mocked Mutations
- **Requirement:** Simulated `setTimeout` saving with browser `alert()` is prohibited in production code. All user-initiated mutations must execute real HTTP calls through `apiClient` with proper loading indicators and error toasts.

---

## 7. Acceptance Criteria & Definition of Done

An organizer feature or bug fix is considered **Complete and Ready for Merge** only when all of the following conditions are validated:

1. **Clean Production Build:** Running `npm run build` in the `frontend` directory exits with code `0` and zero bundling warnings.
2. **Deterministic Routing:** Navigating to Manage Hackathon and Edit Timeline from `MyHackathons.jsx` successfully renders the target hackathon without 404 errors or missing parameters.
3. **Real-Data Verification:** Verify that `Analytics.jsx`, `EditTimeline.jsx`, and `ResultsCertificates.jsx` retrieve and persist real database records without fallback to hardcoded mock arrays.
4. **Platform Settings Reactivity:** Changing platform settings (e.g., disabling public leaderboards or changing certificate prefix) immediately updates organizer views without a hard refresh.
5. **Responsive Validation:** All organizer management tables, grids, and inspection panels render cleanly across mobile (375px), tablet (768px), and desktop (1440px) breakpoints.

---

*This document is maintained by the Engineering Team. For questions or amendments, submit an engineering RFC to the Technical Lead.*
