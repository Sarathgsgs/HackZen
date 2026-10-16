import apiClient from '../../api/api';

/**
 * Mentorship Requests API
 * Provides service functions for fetching and managing mentorship requests
 * using real backend data.
 */

/**
 * Fetches the list of all mentorship requests directed to the mentor.
 * This fetches teams that don't have a mentor assigned yet.
 */
export const fetchMentorshipRequests = async (status, filters = {}) => {
    try {
        const { data: response } = await apiClient.get('/teams/mentor/requests', { params: { status, limit: 50, ...filters } });
        const requests = response.data || response;
        const mappedRequests = requests.map(request => {
            const status = request.status || 'pending';
            
            return {
                id: request._id || request.id,
                teamName: request.teamName,
                description: request.description || request.message || '',
                createdAt: request.createdAt,
                requestDate: new Date(request.createdAt).toLocaleDateString(),
                appliedDate: new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                domain: request.domain || '',
                teamSize: request.memberCount || 0,
                message: request.message || '',
                status: status,
                rawStatus: request.status,
                requiredSkills: request.requiredSkills || [],
            };
        });

        return mappedRequests;
    } catch (error) {
        console.error('Failed to fetch mentorship requests:', error);
        throw error;
    }
};

/**
 * Accepts or rejects a mentorship request.
 */
export const updateMentorshipRequestStatus = async (requestId, actionType) => {
    try {
        const { data } = await apiClient.patch(`/teams/mentor/requests/${requestId}`, { decision: actionType === 'accept' ? 'approved' : 'rejected' });
        return data;
    } catch (error) {
        console.error(`Failed to ${actionType} mentorship request:`, error);
        throw error;
    }
};
