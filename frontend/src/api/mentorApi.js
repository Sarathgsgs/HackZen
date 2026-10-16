import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const mentorApi = axios.create({
    baseURL: `${API_BASE_URL}/mentor`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
mentorApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ============= DASHBOARD OVERVIEW =============
export const getDashboardOverview = async () => {
    const { data } = await mentorApi.get('/overview');
    return data.data;
};

// ============= TASK MANAGEMENT =============
export const createTask = async (taskData) => {
    const { data } = await mentorApi.post('/tasks', taskData);
    return data.data;
};

export const getMentorTasks = async (studentId = null) => {
    const params = studentId ? { student_id: studentId } : {};
    const { data } = await mentorApi.get('/tasks', { params });
    return data.data;
};

export const updateTask = async (taskId, status, progress) => {
    const { data } = await mentorApi.patch(`/tasks/${taskId}`, { status, progress });
    return data;
};

// ============= FEEDBACK SYSTEM =============
export const createFeedback = async (feedbackData) => {
    const { data } = await mentorApi.post('/feedback', feedbackData);
    return data.data;
};

export const getStudentFeedback = async (studentId) => {
    const { data } = await mentorApi.get(`/feedback/student/${studentId}`);
    return data.data;
};

// ============= MEETING SCHEDULER =============
export const createMeeting = async (meetingData) => {
    const { data } = await mentorApi.post('/meetings', meetingData);
    return data.data;
};

export const getMentorMeetings = async (upcomingOnly = true) => {
    const { data } = await mentorApi.get('/meetings', { params: { upcoming_only: upcomingOnly } });
    return data.data;
};

// ============= PROGRESS TRACKING =============
export const getStudentProgress = async (studentId) => {
    const { data } = await mentorApi.get(`/progress/student/${studentId}`);
    return data.data;
};

export const getAssignedStudents = async () => {
    const { data } = await mentorApi.get('/students');
    return data.data;
};

// ============= PERFORMANCE ANALYTICS =============
export const getPerformanceMetrics = async (studentId) => {
    const { data } = await mentorApi.get(`/performance/student/${studentId}`);
    return data.data;
};

// ============= REPORT GENERATION =============
export const generateStudentReport = async (studentId, reportType = 'weekly') => {
    const { data } = await mentorApi.get(`/reports/student/${studentId}`, {
        params: { report_type: reportType }
    });
    return data.data;
};

export default mentorApi;
