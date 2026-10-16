import apiClient from '../../api/api';

/** Returns the signed-in mentor's dashboard summary. */
export const fetchMentorOverview = async () => {
    const { data } = await apiClient.get('/mentor/overview');
    return data.data;
};

/** Returns the live data used by the mentor's action-focused dashboard. */
export const fetchMentorDashboard = async () => {
    const { data } = await apiClient.get('/mentor/dashboard');
    return data.data;
};

export const resolveMentorshipRequest = async (notificationId, action) => {
    if (action === 'decline') {
        await apiClient.delete(`/inbox/${notificationId}`);
    } else {
        await apiClient.put(`/inbox/${notificationId}/read`);
    }
};
