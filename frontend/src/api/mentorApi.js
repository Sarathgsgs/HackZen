import apiClient from './api';

// Use the shared API client so mentor requests share the configured base URL,
// session token handling, and global authentication behavior.
export const getDashboardOverview = async () => {
  const { data } = await apiClient.get('/mentor/overview');
  return data.data;
};

export const createTask = async (taskData) => {
  const { data } = await apiClient.post('/mentor/tasks', taskData);
  return data.data;
};

export const getMentorTasks = async (studentId = null) => {
  const { data } = await apiClient.get('/mentor/tasks', { params: studentId ? { student_id: studentId } : {} });
  return data.data;
};

export const updateTask = async (taskId, status, progress) => {
  const { data } = await apiClient.patch(`/mentor/tasks/${taskId}`, { status, progress });
  return data;
};

export const createFeedback = async (feedbackData) => {
  const { data } = await apiClient.post('/mentor/feedback', feedbackData);
  return data.data;
};

export const getStudentFeedback = async (studentId) => {
  const { data } = await apiClient.get(`/mentor/feedback/student/${studentId}`);
  return data.data;
};

export const createMeeting = async (meetingData) => {
  const { data } = await apiClient.post('/mentor/meetings', meetingData);
  return data.data;
};

export const getMentorMeetings = async (upcomingOnly = true) => {
  const { data } = await apiClient.get('/mentor/meetings', { params: { upcoming_only: upcomingOnly } });
  return data.data;
};

export const getStudentProgress = async (studentId) => {
  const { data } = await apiClient.get(`/mentor/progress/student/${studentId}`);
  return data.data;
};

export const getAssignedStudents = async () => {
  const { data } = await apiClient.get('/mentor/students');
  return data.data;
};

export const getPerformanceMetrics = async (studentId) => {
  const { data } = await apiClient.get(`/mentor/performance/student/${studentId}`);
  return data.data;
};

export const generateStudentReport = async (studentId, reportType = 'weekly') => {
  const { data } = await apiClient.get(`/mentor/reports/student/${studentId}`, { params: { report_type: reportType } });
  return data.data;
};

export default apiClient;
