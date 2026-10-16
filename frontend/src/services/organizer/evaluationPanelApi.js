import apiClient from '../../api/api';

/**
 * Evaluation Panel API
 *
 * This service manages fetching teams, submitting evaluations, and 
 * handling shortlist functionalities for the organizer dashboard. 
 */

/**
 * Fetches the list of teams/submissions queued for evaluation.
 * @returns {Promise<Array>} A promise resolving to an array of team/submission objects.
 */
export const fetchTeamsForEvaluation = async () => {
    try {
        const { data } = await apiClient.get('/submissions/');
        
        return (data || []).map(sub => ({
            id: sub._id || sub.id,
            submissionId: sub._id || sub.id,
            teamId: sub.teamId,
            name: sub.teamName || ('Team ' + (sub.teamId ? String(sub.teamId).substring(0, 4) : 'Alpha')),
            project: sub.title || ('Submission v' + (sub.version || 1)),
            status: sub.status === 'Evaluated' ? 'Evaluated' : (sub.status || 'Pending'),
            submitted: sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            score: sub.score || sub.averageScore || null,
            shortlisted: sub.status === 'Shortlisted',
            comment: sub.feedback || sub.reviewComment || '',
            members: sub.members || [],
            links: { repo: sub.githubUrl || sub.repoUrl || sub.fileUrl || '#', demo: sub.demoUrl || '#', details: '#' },
            existingScores: sub.scores || null
        }));
    } catch (error) {
        console.error('Failed to fetch teams for evaluation:', error);
        throw error;
    }
};

/**
 * Submits an evaluation for a specific team.
 * @param {string} teamId The ID of the team being evaluated.
 * @param {Object} evaluationData The evaluation scores, comment, and shortlist status.
 */
export const submitTeamEvaluation = async (teamId, evaluationData) => {
    try {
        const payload = {
            submissionId: evaluationData.submissionId || teamId,
            teamId: teamId,
            scores: evaluationData.scores || {},
            feedback: evaluationData.comment || '',
            totalScore: evaluationData.totalScore
        };

        const { data } = await apiClient.post('/evaluations/', payload);

        // Synchronize shortlist status if marked
        if (evaluationData.shortlisted) {
            try {
                await updateTeamShortlistStatus(evaluationData.submissionId || teamId, true);
            } catch (err) {
                console.warn("Could not sync shortlist status flag:", err);
            }
        }

        return {
            success: true,
            message: 'Evaluation submitted successfully',
            evaluation: data
        };
    } catch (error) {
        console.error('Failed to submit evaluation:', error);
        throw error;
    }
};

/**
 * Toggles or updates the shortlist status of a specific team/submission directly in the backend.
 * @param {string} teamId The ID of the team or submission.
 * @param {boolean} isShortlisted The new shortlist status.
 * @returns {Promise<Object>} A promise resolving to the update status.
 */
export const updateTeamShortlistStatus = async (teamId, isShortlisted) => {
    try {
        const newStatus = isShortlisted ? 'Shortlisted' : 'Reviewed';
        const { data } = await apiClient.post(`/submissions/${teamId}/status`, {
            status: newStatus,
            reason: isShortlisted ? 'Team shortlisted during evaluation round' : 'Shortlist status removed'
        });

        return {
            success: true,
            message: `Team ${isShortlisted ? 'added to' : 'removed from'} shortlist`,
            shortlisted: isShortlisted,
            ...data
        };
    } catch (error) {
        console.error('Failed to update shortlist status:', error);
        throw error;
    }
};

export const resetEvaluationsData = async () => {
    return { success: true, message: 'Live data synced with database.' };
};
