import apiClient from '../../api/api';

/**
 * Evaluation Criteria & Submission API Integration
 */

// Default Criteria (mirrored in backend/routers/evaluation.py)
const DEFAULT_CRITERIA = [
    { id: 'innovation', label: 'Innovation & Originality', description: 'Is the idea unique and novel?', weight: 10, minScore: 0, maxScore: 10 },
    { id: 'technical', label: 'Technical Implementation', description: 'Code quality and complexity.', weight: 10, minScore: 0, maxScore: 10 },
    { id: 'design', label: 'Design & User Experience', description: 'UI/UX and ease of use.', weight: 10, minScore: 0, maxScore: 10 },
    { id: 'presentation', label: 'Presentation Quality', description: 'Clarity of the pitch/demo.', weight: 10, minScore: 0, maxScore: 10 },
    { id: 'feasibility', label: 'Business Feasibility', description: 'Market potential and viability.', weight: 10, minScore: 0, maxScore: 10 }
];

/**
 * Fetch evaluation criteria (persisted per organizer on the backend).
 */
export const fetchCriteria = async () => {
    try {
        const { data } = await apiClient.get('/evaluations/criteria');
        return Array.isArray(data) && data.length > 0 ? data : DEFAULT_CRITERIA;
    } catch (error) {
        console.error('Failed to fetch evaluation criteria:', error);
        return DEFAULT_CRITERIA;
    }
};

/**
 * Fetch all submissions owned by this organizer, mapped for the evaluation panel.
 * Uses the enriched organizer endpoint so team/project names are correct.
 */
export const fetchSubmissionsForEvaluation = async () => {
    try {
        const { data } = await apiClient.get('/submissions/organizer/all');

        const rows = data.map(sub => ({
            id: sub.id,
            submissionId: sub.id,
            teamId: sub.teamId,
            name: sub.team || 'Unknown Team',
            project: sub.title || 'Untitled Project',
            status: sub.status === 'Evaluated' || (sub.evaluationCount || 0) > 0
                ? 'Evaluated'
                : (sub.status === 'Pending Review' ? 'Pending' : (sub.status || 'Pending')),
            submitted: sub.time || (sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : ''),
            score: sub.score ?? null,
            shortlisted: sub.status === 'Shortlisted',
            members: [],
            existingScores: null,
            comment: ''
        }));

        // Prefill previous scores/feedback for already-evaluated submissions
        const evaluated = rows.filter(r => r.status === 'Evaluated');
        await Promise.all(evaluated.map(async (row) => {
            try {
                const { data: evals } = await apiClient.get(`/evaluations/submission/${row.submissionId}`);
                if (evals.length > 0) {
                    const latest = evals[evals.length - 1];
                    row.existingScores = latest.scores || null;
                    row.comment = latest.feedback || '';
                }
            } catch (err) {
                console.error(`Failed to load evaluations for submission ${row.submissionId}:`, err);
            }
        }));

        return rows;
    } catch (error) {
        console.error("Failed to fetch submissions for evaluation:", error);
        throw error;
    }
};

/**
 * Submit a real evaluation to evaluation.py backend
 */
export const submitEvaluation = async (evalData) => {
    try {
        const payload = {
            submissionId: evalData.submissionId,
            teamId: evalData.teamId,
            scores: evalData.scores,
            feedback: evalData.feedback,
            totalScore: evalData.totalScore
        };

        const { data } = await apiClient.post('/evaluations/', payload);
        return { success: true, data };
    } catch (error) {
        console.error("Evaluation submission failed:", error);
        throw error;
    }
};

/**
 * Save evaluation criteria (persisted on backend per organizer).
 */
export const saveCriteria = async (criteria) => {
    const { data } = await apiClient.put('/evaluations/criteria', criteria);
    return { success: true, message: 'Criteria updated successfully', data };
};

/**
 * Reset criteria back to defaults (persists immediately).
 */
export const resetCriteria = async () => {
    const { data } = await apiClient.put('/evaluations/criteria', DEFAULT_CRITERIA);
    return data;
};
