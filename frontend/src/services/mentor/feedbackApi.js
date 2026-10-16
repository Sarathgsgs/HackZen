import apiClient from '../../api/api';

/**
 * Mentor Feedback API Service
 * Connects the frontend to real backend evaluation criteria, persistent drafts,
 * and feedback submission workflows.
 */

const labelForRating = (rating) => {
    if (typeof rating === 'string') return rating;
    const num = Number(rating);
    if (num >= 4.5) return 'Excellent';
    if (num >= 3.5) return 'Good';
    if (num >= 2.5) return 'Average';
    if (num >= 1) return 'Needs Improvement';
    return 'Good';
};

const formatFeedbackEntry = (item) => ({
    id: item.feedbackId || item._id || item.id,
    type: item.feedbackType || item.title || (item.type ? item.type.replace('_', ' ') : 'General'),
    title: item.title || item.feedbackType || 'Evaluation Feedback',
    message: item.content || item.guidance || item.comments || '',
    guidance: item.guidance || item.content || item.comments || '',
    rating: typeof item.rating === 'number' ? labelForRating(item.rating) : item.rating || 'Good',
    ratingScore: item.overallScore || item.rating || 4,
    criteriaRatings: item.criteriaRatings || {},
    status: item.status || 'submitted',
    date: item.submittedAt
        ? new Date(item.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : item.createdAt
        ? new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Date unavailable',
    rawDate: item.submittedAt || item.createdAt,
    mentorName: item.mentorName || 'Mentor',
});

/**
 * Fetch all teams assigned to the mentor with their feedback history and drafts.
 * @returns {Promise<Array>}
 */
export const fetchTeams = async () => {
    try {
        const { data: { data: response } } = await apiClient.get('/mentor/feedback/teams');
        const allTeams = response.map((team, index) => ({
            id: team._id || team.id,
            name: team.name || team.teamName || 'Assigned team',
            domain: team.domain || 'General',
            memberCount: team.memberCount || 0,
            stage: team.stage || team.currentStage || 'Exploration',
            status: 'online',
            hasNewActivity: false,
            avatarColor: ['from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-orange-500 to-red-500', 'from-teal-500 to-green-500'][index % 4],
            members: team.members || [],
            progress: Number.isFinite(Number(team.progress)) ? Number(team.progress) : 0,
            progressHistory: team.progressHistory || [],
            draft: team.draft ? formatFeedbackEntry(team.draft) : null,
            recentFeedback: (team.feedback || []).map(formatFeedbackEntry),
        }));
        return allTeams;
    } catch (error) {
        console.error('Failed to fetch teams for feedback:', error);
        throw error;
    }
};

/**
 * Fetch only the selected team's persistent feedback history and active draft.
 * @param {string} teamId
 * @returns {Promise<{ history: Array, draft: Object|null }>}
 */
export const fetchTeamFeedback = async (teamId) => {
    try {
        const { data } = await apiClient.get(`/mentor/feedback/team/${teamId}`);
        const historyList = Array.isArray(data.data) ? data.data : (data.history || []);
        const draftObj = data.draft ? formatFeedbackEntry(data.draft) : null;
        return {
            history: historyList.map(formatFeedbackEntry),
            draft: draftObj,
        };
    } catch (error) {
        console.error(`Failed to fetch feedback for team ${teamId}:`, error);
        throw error;
    }
};

/**
 * Save draft feedback in the database.
 * @param {string} teamId
 * @param {Object} draftData - { criteriaRatings, guidance, type, title }
 * @returns {Promise<Object>}
 */
export const saveFeedbackDraft = async (teamId, draftData) => {
    try {
        const { data } = await apiClient.post('/mentor/feedback', {
            teamId,
            criteriaRatings: draftData.criteriaRatings || {},
            guidance: draftData.guidance || '',
            content: draftData.guidance || '',
            type: draftData.type || 'general',
            feedbackType: draftData.type || 'General',
            title: draftData.title || `${draftData.type || 'General'} Feedback`,
            status: 'draft',
        });
        return formatFeedbackEntry(data.data);
    } catch (error) {
        const message = error.response?.data?.error?.message || error.response?.data?.detail || 'Failed to save draft';
        console.error('Failed to save feedback draft:', message);
        throw new Error(message);
    }
};

/**
 * Submit feedback with full 8 evaluation criteria ratings and written guidance.
 * @param {string} teamId
 * @param {Object} feedbackData - { criteriaRatings, guidance, type, title }
 * @returns {Promise<Object>}
 */
export const submitFeedback = async (teamId, feedbackData) => {
    try {
        const { data } = await apiClient.post('/mentor/feedback', {
            teamId,
            criteriaRatings: feedbackData.criteriaRatings || {},
            guidance: feedbackData.guidance || '',
            content: feedbackData.guidance || '',
            type: feedbackData.type || 'general',
            feedbackType: feedbackData.type || 'General',
            title: feedbackData.title || `${feedbackData.type || 'General'} Feedback`,
            status: 'submitted',
        });
        return formatFeedbackEntry(data.data);
    } catch (error) {
        const message = error.response?.data?.error?.message || error.response?.data?.detail || 'Failed to submit feedback';
        console.error('Failed to submit feedback:', message);
        throw new Error(message);
    }
};

/**
 * Reset a team's new activity marker.
 */
export const markTeamActivityViewed = async () => {
    return Promise.resolve();
};
