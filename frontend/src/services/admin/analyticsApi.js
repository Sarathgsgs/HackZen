import apiClient from '../../api/api';

/**
 * Admin Analytics API Service
 * Connects frontend charts & KPI sections to live MongoDB analytics endpoints
 */

export const fetchAnalyticsOverview = async (params = {}) => {
    try {
        const { data } = await apiClient.get('/admin/analytics/overview', { params });
        return data;
    } catch (error) {
        console.error('Failed to fetch analytics overview:', error);
        return null;
    }
};

export const fetchUserAnalytics = async (params = {}) => {
    try {
        const { data } = await apiClient.get('/admin/analytics/users', { params });
        return data;
    } catch (error) {
        console.error('Failed to fetch user analytics:', error);
        return null;
    }
};

export const fetchRegistrationTrend = async (params = {}) => {
    try {
        const { data } = await apiClient.get('/admin/analytics/registrations', { params });
        return data;
    } catch (error) {
        console.error('Failed to fetch registration trend:', error);
        return null;
    }
};

export const fetchHackathonAnalytics = async (params = {}) => {
    try {
        const { data } = await apiClient.get('/admin/analytics/hackathons', { params });
        return data;
    } catch (error) {
        console.error('Failed to fetch hackathon analytics:', error);
        return null;
    }
};

export const fetchTeamsSubmissionsAnalytics = async (params = {}) => {
    try {
        const { data } = await apiClient.get('/admin/analytics/teams-submissions', { params });
        return data;
    } catch (error) {
        console.error('Failed to fetch teams/submissions analytics:', error);
        return null;
    }
};

export const fetchMentorsJudgesAnalytics = async (params = {}) => {
    try {
        const { data } = await apiClient.get('/admin/analytics/mentors-judges', { params });
        return data;
    } catch (error) {
        console.error('Failed to fetch mentors/judges analytics:', error);
        return null;
    }
};

export const fetchAiCertificatesAnalytics = async (params = {}) => {
    try {
        const { data } = await apiClient.get('/admin/analytics/ai-certificates', { params });
        return data;
    } catch (error) {
        console.error('Failed to fetch AI/certificates analytics:', error);
        return null;
    }
};

export const fetchSecurityPerformanceAnalytics = async (params = {}) => {
    try {
        const { data } = await apiClient.get('/admin/analytics/security-performance', { params });
        return data;
    } catch (error) {
        console.error('Failed to fetch security/performance analytics:', error);
        return null;
    }
};

export const fetchSmartAiInsights = async () => {
    try {
        const { data } = await apiClient.get('/admin/analytics/insights');
        return data;
    } catch (error) {
        console.error('Failed to fetch smart AI insights:', error);
        return null;
    }
};

/**
 * Downloads official PDF analytics report as binary blob
 */
export const exportAnalyticsPdf = async (params = {}) => {
    try {
        const response = await apiClient.get('/admin/analytics/export/pdf', {
            params,
            responseType: 'blob'
        });
        return response.data;
    } catch (error) {
        console.error('Failed to export analytics PDF:', error);
        throw error;
    }
};

/**
 * Downloads official styled Excel spreadsheet as binary blob
 */
export const exportAnalyticsExcel = async (params = {}) => {
    try {
        const response = await apiClient.get('/admin/analytics/export/excel', {
            params,
            responseType: 'blob'
        });
        return response.data;
    } catch (error) {
        console.error('Failed to export analytics Excel:', error);
        throw error;
    }
};
