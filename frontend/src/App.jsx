import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { PlatformSettingsProvider } from './context/PlatformSettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import MaintenanceBanner from './components/MaintenanceBanner';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/SignUp';
import OAuthCallback from './pages/OAuthCallback';
import RoleSelection from './pages/RoleSelection';
import ForgotPassword from './pages/ForgotPassword';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCertificates from './pages/student/StudentCertificates';
import StudentHackathons from './pages/student/StudentHackathons';
import StudentHackathonDetails from './pages/student/StudentHackathonDetails';
import StudentHackathonRegistration from './pages/student/StudentHackathonRegistration';
import StudentRegistrationSuccess from './pages/student/StudentRegistrationSuccess';
import HackathonRegistrationStepOne from './pages/student/HackathonRegistrationStepOne';
import HackathonRegistrationStepTwo from './pages/student/HackathonRegistrationStepTwo';
import HackathonRegistrationStepThree from './pages/student/HackathonRegistrationStepThree';
import TeamsPage from './pages/TeamsPage';
import StudentAIAssistant from './pages/student/StudentAIAssistant';
import StudentProfile from './pages/student/StudentProfile';
import EditStudentProfile from './pages/student/EditStudentProfile';
import StudentSubmissions from './pages/student/StudentSubmissions';
import StudentWorkspace from './pages/student/StudentWorkspace';
import StudentTeamOverview from './pages/student/StudentTeamOverview';
import StudentCreateTeam from './pages/student/StudentCreateTeam';
import StudentJoinTeam from './pages/student/StudentJoinTeam';
import StudentTeamWorkspace from './pages/student/StudentTeamWorkspace';
import StudentTeamMembers from './pages/student/StudentTeamMembers';
import StudentMentorProfile from './pages/student/StudentMentorProfile';
import StudentMentorRequest from './pages/student/StudentMentorRequest';
import StudentMentorRequestStatus from './pages/student/StudentMentorRequestStatus';
import StudentChat from './pages/student/StudentChat';
import StudentFeedback from './pages/student/StudentFeedback';
import StudentMaterials from './pages/student/StudentMaterials';
import StudentProjectInfo from './pages/student/StudentProjectInfo';
import StudentSubmission from './pages/student/StudentSubmission';
import StudentFileSharing from './pages/student/StudentFileSharing';
import StudentSubmissionStatus from './pages/student/StudentSubmissionStatus';
import StudentCertificateVerification from './pages/student/StudentCertificateVerification';
import DashboardLayout from './components/Layout';
import MyHackathons from './pages/organizer/MyHackathons';
import OrganizerDashboard from './pages/organizer/Dashboard';
import Analytics from './pages/organizer/Analytics';
import TeamsMentors from './pages/organizer/TeamsMentors';
import CreateHackathon from './pages/organizer/CreateHackathon';
import CreateHackathonStepOne from './pages/organizer/CreateHackathonStepOne';
import CreateHackathonStepTwo from './pages/organizer/CreateHackathonStepTwo';
import CreateHackathonStepThree from './pages/organizer/CreateHackathonStepThree';
import CreateHackathonStepFour from './pages/organizer/CreateHackathonStepFour';
import HackathonApprovalStatus from './pages/organizer/HackathonApprovalStatus';
import HackathonOperations from './pages/organizer/HackathonOperations';
import Submissions from './pages/organizer/Submissions';
import EvaluationPanel from './pages/organizer/EvaluationPanel';
import ResultsCertificates from './pages/organizer/ResultsCertificates';
import OrganizerProfile from './pages/organizer/OrganizerProfile';
import EditTimeline from './pages/organizer/EditTimeline';
import ManageHackathon from './pages/organizer/ManageHackathon';
import MentorDashboard from './pages/mentor/MentorDashboard';
import MentorshipRequests from './pages/mentor/MentorshipRequests';
import Feedback from './pages/mentor/Feedback';
import TeamMaterials from './pages/mentor/TeamMaterials';
import MentorProfile from './pages/mentor/MentorProfile';
import MentorLayout from './components/mentor/MentorLayout';
import { MentorProvider } from './context/MentorContext';
import TeamDetails from './pages/mentor/TeamDetails';
import MentorSessions from './pages/mentor/MentorSessions';
import MentorHackathons from './pages/mentor/MentorHackathons';
import MentorMessages from './pages/mentor/MentorMessages';
import MentorResources from './pages/mentor/MentorResources';
import MentorWorkspace from './pages/mentor/MentorWorkspace';
import MentorAICoMentor from './pages/mentor/MentorAICoMentor';
import TeamMentorshipWorkspace from './pages/mentor/TeamMentorshipWorkspace';
import AdminDashboard from './pages/admin/Dashboard';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import OrganizerApprovals from './pages/admin/OrganizerApprovals';
import HackathonApprovals from './pages/admin/HackathonApprovals';
import AdminAnalytics from './pages/admin/Analytics';
import AdminDisputes from './pages/admin/Disputes';
import AdminCertificates from './pages/admin/Certificates';
import AdminSubmissions from './pages/admin/Submissions';
import HackathonChangeRequest from './pages/admin/HackathonChangeRequest';
import UsersManagement from './pages/admin/UsersManagement';
import AdminSettings from './pages/admin/Settings';
import AdminProfile from './pages/admin/AdminProfile';
import StudentSettings from './pages/student/StudentSettings';
import OrganizerSettings from './pages/organizer/OrganizerSettings';
import MentorSettings from './pages/mentor/MentorSettings';
import AssignedTeams from './pages/mentor/AssignedTeams';
import DiscoverTeams from './pages/mentor/DiscoverTeams';
import CreateTeam from './pages/mentor/CreateTeam';
import EditOrganizerProfile from './pages/organizer/EditOrganizerProfile';
import EditMentorProfile from './pages/mentor/EditMentorProfile';
import EditAdminProfile from './pages/admin/EditAdminProfile';

import EvaluationCriteria from './pages/organizer/EvaluationCriteria';
import InitializeEvent from './pages/organizer/InitializeEvent';
import InviteMentors from './pages/organizer/InviteMentors';
import PublicVerifyCertificate from './pages/PublicVerifyCertificate';

import './App.css';

// Universal Protected Route Component with Hydration Guard
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-xs font-medium animate-pulse">Restoring workspace session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && (userRole || '').toLowerCase() !== (requiredRole || '').toLowerCase()) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

function AppContent() {
  const location = useLocation();

  // Define paths where the Footer should NOT be displayed
  const hideFooterPaths = [
    '/login',
    '/signup',
    '/get-started',
    '/role-selection',
    '/forgot-password',
    '/oauth/callback',
  ];

  // Check if the current path is in the hide list or starts with dashboard prefixes
  const shouldHideFooter =
    hideFooterPaths.includes(location.pathname) ||
    location.pathname.startsWith('/student') ||
    location.pathname.startsWith('/organizer') ||
    location.pathname.startsWith('/mentor') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/unauthorized');

  return (
    <div className="flex flex-col min-h-screen text-slate-900 dark:text-white bg-slate-50 dark:bg-navy-900 transition-colors duration-300">
      <MaintenanceBanner />
      <Routes>
        {/* Main Landing Page */}
        <Route path="/" element={<Home />} />

        {/* Role Selection - Step 1: Choose Your Role */}
        <Route path="/get-started" element={<RoleSelection />} />
        <Route path="/role-selection" element={<RoleSelection />} />

        {/* Signup - Step 2: Create Account (role pre-filled) */}
        <Route path="/signup" element={<Signup />} />

        {/* Login - For Returning Users */}
        <Route path="/login" element={<Login />} />

        {/* OAuth Callback */}
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        {/* Forgot Password */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Unauthorized Access Page */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Public Certificate Verification Routes */}
        <Route path="/verify" element={<PublicVerifyCertificate />} />
        <Route path="/verify/:certId" element={<PublicVerifyCertificate />} />

        {/* Student Dashboard Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute requiredRole="student">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="submissions" element={<StudentSubmissions />} />
          <Route path="hackathons" element={<StudentHackathons />} />
          <Route path="hackathons/:hackathonId" element={<StudentHackathonDetails />} />
          <Route path="hackathons/:hackathonId/register" element={<StudentHackathonRegistration />}>
            <Route index element={<Navigate to="step-1" replace />} />
            <Route path="step-1" element={<HackathonRegistrationStepOne />} />
            <Route path="step-2" element={<HackathonRegistrationStepTwo />} />
            <Route path="step-3" element={<HackathonRegistrationStepThree />} />
            <Route path="success" element={<StudentRegistrationSuccess />} />
          </Route>
          <Route path="teams">
            <Route index element={<StudentTeamOverview />} />
            <Route path="create" element={<StudentCreateTeam />} />
            <Route path="join" element={<StudentJoinTeam />} />
            <Route path="members" element={<StudentTeamMembers />} />
            <Route path=":teamId/workspace" element={<StudentTeamWorkspace />} />
            <Route path=":teamId/members" element={<StudentTeamMembers />} />
          </Route>
          <Route path="workspace" element={<StudentWorkspace />} />
          <Route path="chat" element={<StudentChat />} />
          <Route path="mentor-profile" element={<StudentMentorProfile />} />
          <Route path="mentor" element={<StudentMentorProfile />} />
          <Route path="mentor-request" element={<StudentMentorRequest />} />
          <Route path="mentor-request-status" element={<StudentMentorRequestStatus />} />
          <Route path="feedback" element={<StudentFeedback />} />
          <Route path="materials" element={<StudentMaterials />} />
          <Route path="project-info" element={<StudentProjectInfo />} />
          <Route path="project" element={<StudentProjectInfo />} />
          <Route path="submission" element={<StudentSubmission />} />
          <Route path="submission-status" element={<StudentSubmissionStatus />} />
          <Route path="file-sharing" element={<StudentFileSharing />} />
          <Route path="files" element={<StudentFileSharing />} />
          <Route path="ai-assistant" element={<StudentAIAssistant />} />
          <Route path="ai assistant" element={<Navigate to="/student/ai-assistant" replace />} />
          <Route path="ai_assistant" element={<Navigate to="/student/ai-assistant" replace />} />
          <Route path="ai" element={<Navigate to="/student/ai-assistant" replace />} />
          <Route path="certificates">
            <Route index element={<StudentCertificates />} />
            <Route path="verify" element={<StudentCertificateVerification />} />
          </Route>
          <Route path="profile">
            <Route index element={<StudentProfile />} />
            <Route path="edit" element={<EditStudentProfile />} />
          </Route>
          <Route path="settings" element={<StudentSettings />} />
        </Route>

        {/* Organizer Dashboard Routes */}
        <Route
          path="/organizer"
          element={
            <ProtectedRoute requiredRole="organizer">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OrganizerDashboard />} />
          <Route path="my-hackathons" element={<MyHackathons />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="teams-mentors" element={<TeamsMentors />} />
          <Route path="registrations" element={<TeamsMentors />} />
          <Route path="timeline" element={<TeamsMentors />} />
          <Route path="approval-status" element={<HackathonApprovalStatus />} />
          <Route path="approval-status/:hackathonId" element={<HackathonApprovalStatus />} />
          <Route path="create-hackathon" element={<CreateHackathon />}>
            <Route index element={<Navigate to="step-1" replace />} />
            <Route path="step-1" element={<CreateHackathonStepOne />} />
            <Route path="step-2" element={<CreateHackathonStepTwo />} />
            <Route path="step-3" element={<CreateHackathonStepThree />} />
            <Route path="step-4" element={<CreateHackathonStepFour />} />
            <Route path="status" element={<HackathonApprovalStatus />} />
          </Route>
          <Route path="manage-hackathon" element={<ManageHackathon />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OrganizerDashboard />} />
            <Route path="criteria" element={<EvaluationCriteria />} />
            <Route path="initialize" element={<InitializeEvent />} />
            <Route path="invite-mentors" element={<InviteMentors />} />
          </Route>
          <Route path="manage-hackathon/:hackathonId" element={<ManageHackathon />} />
          <Route path="hackathons/:hackathonId/manage" element={<ManageHackathon />} />
          <Route path="edit-timeline" element={<EditTimeline />} />
          <Route path="edit-timeline/:hackathonId" element={<EditTimeline />} />
          <Route path="hackathons/:hackathonId/edit-timeline" element={<EditTimeline />} />
          <Route path="submissions" element={<Submissions />} />
          <Route path="operations" element={<HackathonOperations />} />
          <Route path="evaluation" element={<HackathonOperations />} />
          <Route path="evaluation-panel" element={<EvaluationPanel />} />
          <Route path="evaluation/criteria" element={<EvaluationCriteria />} />
          <Route path="results" element={<ResultsCertificates />} />
          <Route path="results-certificates" element={<Navigate to="/organizer/results" replace />} />
          <Route path="invite-mentors" element={<Navigate to="/organizer/evaluation" replace />} />
          <Route path="profile" element={<OrganizerProfile />} />
          <Route path="profile/edit" element={<EditOrganizerProfile />} />
          <Route path="settings" element={<OrganizerSettings />} />
        </Route>

        {/* Mentor Dashboard Routes */}
        <Route
          path="/mentor"
          element={
            <ProtectedRoute requiredRole="mentor">
              <MentorProvider>
                <MentorLayout />
              </MentorProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MentorDashboard />} />
          <Route path="hackathons" element={<MentorHackathons />} />
          <Route path="mentorship-requests" element={<MentorshipRequests />} />
          <Route path="requests" element={<MentorshipRequests />} />
          <Route path="teams">
            <Route index element={<AssignedTeams />} />
            <Route path=":teamId" element={<TeamDetails />} />
            <Route path=":teamId/workspace" element={<TeamDetails />} />
            <Route path="join" element={<DiscoverTeams />} />
            <Route path="create" element={<CreateTeam />} />
          </Route>
          <Route path="assigned-teams" element={<Navigate to="/mentor/teams" replace />} />
          <Route path="discover-teams" element={<Navigate to="/mentor/teams/join" replace />} />
          <Route path="create-team" element={<Navigate to="/mentor/teams/create" replace />} />
          <Route path="sessions" element={<MentorSessions />} />
          <Route path="messages" element={<MentorMessages />} />
          <Route path="resources" element={<MentorResources />} />
          <Route path="materials" element={<MentorResources />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="reviews" element={<MentorWorkspace initialTab="reviews" />} />
          <Route path="forum" element={<MentorWorkspace initialTab="forum" />} />
          <Route path="ai-co-mentor" element={<MentorAICoMentor />} />
          <Route path="profile">
            <Route index element={<MentorProfile />} />
            <Route path="edit" element={<EditMentorProfile />} />
          </Route>
          <Route path="settings" element={<MentorSettings />} />
        </Route>

        {/* Admin Dashboard Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="profile/edit" element={<EditAdminProfile />} />
          <Route path="organizer-approvals" element={<OrganizerApprovals />} />
          <Route path="hackathon-approvals" element={<HackathonApprovals />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="disputes" element={<AdminDisputes />} />
          <Route path="certificates" element={<AdminCertificates />} />
          <Route path="submissions" element={<AdminSubmissions />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="hackathon-change-requests" element={<HackathonChangeRequest />} />
          <Route path="hackathon-change-requests/:requestId" element={<HackathonChangeRequest />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Catch-all route for 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Conditionally render Footer */}
      {!shouldHideFooter && <Footer />}
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.body.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <ThemeProvider>
      <PlatformSettingsProvider>
        <AuthProvider>
          <Router>
            <ScrollToTop />
            <AppContent />
          </Router>
        </AuthProvider>
      </PlatformSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
