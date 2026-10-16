import apiClient from '../../api/api';

/**
 * Admin Submissions Governance & Investigation API Service
 */

export const fetchAdminSubmissions = async (filters = {}) => {
    try {
        const { status, hackathonId } = filters;
        const params = new URLSearchParams();
        if (status && status !== 'All') params.append('status', status);
        if (hackathonId) params.append('hackathonId', hackathonId);
        
        const qs = params.toString() ? `?${params.toString()}` : '';
        const { data } = await apiClient.get(`/submissions/admin/all${qs}`);
        return data || [];
    } catch (error) {
        console.error('Failed to fetch admin submissions:', error);
        throw error;
    }
};

export const updateSubmissionStatus = async (id, newStatus, reason = '') => {
    try {
        const payload = { status: newStatus };
        if (reason) payload.reason = reason;
        const { data } = await apiClient.put(`/submissions/${id}/status`, payload);
        return data;
    } catch (error) {
        console.error('Failed to update submission status:', error);
        throw error;
    }
};

export const requestSubmissionChanges = async (id, issues, message, deadline = "24 hours") => {
    try {
        const { data } = await apiClient.post(`/submissions/${id}/request-changes`, {
            issues,
            message,
            deadline
        });
        return data;
    } catch (error) {
        console.error('Failed to request submission changes:', error);
        throw error;
    }
};

export const flagSubmissionInvestigation = async (id, reason) => {
    try {
        const { data } = await apiClient.post(`/submissions/${id}/flag-investigation`, { reason });
        return data;
    } catch (error) {
        console.error('Failed to flag submission:', error);
        throw error;
    }
};

export const addInternalAdminNote = async (id, text) => {
    try {
        const { data } = await apiClient.post(`/submissions/${id}/add-note`, { text });
        return data;
    } catch (error) {
        console.error('Failed to add internal note:', error);
        throw error;
    }
};

export const performBulkSubmissionsAction = async (submissionIds, action) => {
    try {
        const { data } = await apiClient.post('/submissions/admin/bulk-action', { submissionIds, action });
        return data;
    } catch (error) {
        console.error('Failed to perform bulk action:', error);
        throw error;
    }
};

export const fetchSubmissionAiReview = async (id) => {
    try {
        const { data } = await apiClient.get(`/submissions/${id}/ai-review`);
        return data?.review || null;
    } catch (error) {
        console.error('Failed to fetch submission AI review:', error);
        throw error;
    }
};
