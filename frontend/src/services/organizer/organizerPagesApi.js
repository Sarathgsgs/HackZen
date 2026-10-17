import apiClient from '../../api/api';

/**
 * Organizer Portal API services for:
 * 1. Hackathon Approval Status
 * 2. Manage Registrations & Timeline
 * 3. Hackathon Operations (Mentors, Judges, Submissions, Evaluation)
 */

// 1. Hackathon Approval Status
export const fetchHackathonApprovalStatus = async (hackathonId) => {
    const params = hackathonId ? { hackathonId } : {};
    const { data } = await apiClient.get('/dashboard/organizer-approval-status', { params });
    return data;
};

export const toggleApprovalStep = async (stepId, completed) => {
    const { data } = await apiClient.post('/dashboard/organizer-approval-status/toggle-step', {
        stepId,
        completed
    });
    return data;
};

// 2. Manage Registrations & Timeline
export const fetchOrganizerRegistrations = async ({ track = 'All Tracks', status = 'All Statuses', search = '', page = 1, limit = 8 } = {}) => {
    const { data } = await apiClient.get('/dashboard/organizer-registrations-teams', {
        params: { track, status, search, page, limit }
    });
    return data;
};

// 3. Hackathon Operations Directory
export const fetchOperationsDirectory = async ({ role = 'all', search = '', page = 1, limit = 6 } = {}) => {
    const { data } = await apiClient.get('/dashboard/organizer-operations-directory', {
        params: { role, search, page, limit }
    });
    return data;
};

export const inviteOperationsExpert = async (payload) => {
    const { data } = await apiClient.post('/dashboard/organizer-operations-invite', payload);
    return data;
};
