import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/SignUp';
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
import Submissions from './pages/organizer/Submissions';
import EvaluationPanel from './pages/organizer/EvaluationPanel';
import ResultsCertificates from './pages/organizer/ResultsCertificates';
import OrganizerProfile from './pages/organizer/OrganizerProfile';
import EditTimeline from './pages/organizer/EditTimeline';
import ManageHackathon from './pages/organizer/ManageHackathon';
import MentorDashboard from './pages/mentor/MentorDashboard';
import MentorshipRequests from './pages/mentor/MentorshipRequests';
import Feedback from './pages/mentor/Feedback';
import MentorProfile from './pages/mentor/MentorProfile';
import AdminDashboard from './pages/admin/Dashboard';
import Unauthorized from './pages/Unauthorized';
import OrganizerApprovals from './pages/admin/OrganizerApprovals';
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
import StudentWorkspace from './pages/student/StudentWorkspace';


import './App.css';

// Universal Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const userRole = sessionStorage.getItem('userRole');
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
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
    '/forgot-password',
  ];

  // Check if the current path is in the hide list or starts with /student (dashboard)
  const shouldHideFooter =
    hideFooterPaths.includes(location.pathname) ||
    location.pathname.startsWith('/student') ||
    location.pathname.startsWith('/organizer') ||
    location.pathname.startsWith('/mentor') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/unauthorized');

  return (
    <div className="flex flex-col min-h-screen text-white bg-navy-900">
      <Routes>
        {/* Main Landing Page */}
        <Route path="/" element={<Home />} />

        {/* Role Selection - Step 1: Choose Your Role */}
        <Route path="/get-started" element={<RoleSelection />} />

        {/* Signup - Step 2: Create Account (role pre-filled) */}
        <Route path="/signup" element={<Signup />} />

        {/* Login - For Returning Users */}
        <Route path="/login" element={<Login />} />

        {/* Forgot Password */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Unauthorized Access Page */}
        <Route path="/unauthorized" element={<Unauthorized />} />

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
          <Route path="create-hackathon" element={<CreateHackathon />}>
            <Route index element={<Navigate to="step-1" replace />} />
            <Route path="step-1" element={<CreateHackathonStepOne />} />
            <Route path="step-2" element={<CreateHackathonStepTwo />} />
            <Route path="step-3" element={<CreateHackathonStepThree />} />
          </Route>
          <Route path="dashboard" element={<OrganizerDashboard />} />
          <Route path="my-hackathons" element={<MyHackathons />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="teams-mentors" element={<TeamsMentors />} />
          <Route path="submissions" element={<Submissions />} />
          <Route path="evaluation" element={<EvaluationPanel />} />
          <Route path="evaluation/criteria" element={<EvaluationCriteria />} />
          <Route path="initialize-event" element={<InitializeEvent />} />
          <Route path="invite-mentors" element={<InviteMentors />} />
          <Route path="results" element={<ResultsCertificates />} />
          <Route path="hackathons/:hackathonId/edit-timeline" element={<EditTimeline />} />
          <Route path="hackathons/:hackathonId/manage" element={<ManageHackathon />} />
          <Route path="profile">
            <Route index element={<OrganizerProfile />} />
            <Route path="edit" element={<EditOrganizerProfile />} />
          </Route>
          <Route path="settings" element={<OrganizerSettings />} />

        </Route>

        {/* Mentor Dashboard Routes */}
        <Route
          path="/mentor"
          element={
            <ProtectedRoute requiredRole="mentor">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MentorDashboard />} />
          <Route path="mentorship-requests" element={<MentorshipRequests />} />
          <Route path="teams">
            <Route index element={<AssignedTeams />} />
            <Route path=":teamId/workspace" element={<TeamsPage />} />
            <Route path="join" element={<DiscoverTeams />} />
            <Route path="create" element={<CreateTeam />} />
          </Route>
          <Route path="feedback" element={<Feedback />} />
          <Route path="profile">
            <Route index element={<MentorProfile />} />
            <Route path="edit" element={<EditMentorProfile />} />
          </Route>
          <Route path="settings" element={<MentorSettings />} />

        </Route>

        {/* Admin Dashboard Routes - Protected */}
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
          <Route path="organizer-approvals" element={<OrganizerApprovals />} />
          <Route path="hackathon-approvals">
            <Route index element={<div className="p-10 space-y-4">
              <h2 className="text-2xl font-bold">Hackathon Approvals</h2>
              <div className="glass p-6 rounded-2xl border border-white/10 flex justify-between items-center group cursor-pointer hover:border-blue-500/50 transition-all" onClick={() => window.location.href = '/admin/hackathon-approvals/detail'}>
                <div>
                  <h3 className="font-bold text-lg group-hover:text-blue-400 transition-colors">Global Hackathon 2025</h3>
                  <p className="text-sm text-gray-400">Status: Changes Requested</p>
                </div>
                <button className="px-4 py-2 bg-blue-600/10 text-blue-400 rounded-xl text-sm font-bold border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all">Review Changes</button>
              </div>
            </div>} />
            <Route path="detail" element={<HackathonChangeRequest />} />
          </Route>
          <Route path="users" element={<UsersManagement />} />
          <Route path="submissions" element={<AdminSubmissions />} />
          <Route path="certificates" element={<AdminCertificates />} />
          <Route path="disputes" element={<AdminDisputes />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="profile">
            <Route index element={<AdminProfile />} />
            <Route path="edit" element={<EditAdminProfile />} />
          </Route>
          <Route path="settings" element={<AdminSettings />} />

        </Route>

        {/* Catch-all route for 404 */}
        <Route path="*" element={<div className="text-white p-10 font-bold text-2xl flex items-center justify-center min-h-[50vh]">404 | Page not found</div>} />
      </Routes>

      {/* Conditionally render Footer */}
      {!shouldHideFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
