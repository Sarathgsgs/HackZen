import apiClient from '../../api/api';

/**
 * Student Submissions API
 */

export const fetchSubmissions = async (teamId) => {
    try {
        if (!teamId) {
            const { data: teams } = await apiClient.get('/teams/my-teams');
            if (!teams || teams.length === 0) return [];

            const results = await Promise.all(
                teams.map((team) => apiClient.get(`/submissions/team/${team._id || team.id}`))
            );

            return results
                .flatMap((response) => response.data || [])
                .map((sub) => ({
                    id: sub._id,
                    project: sub.project || `Project Submission v${sub.version || 1}`,
                    hackathon: sub.hackathonTitle || 'Current Hackathon',
                    submittedAt: new Date(sub.submittedAt).toLocaleDateString(),
                    status: sub.status || 'Submitted',
                    score: sub.score ?? null,
                    feedback: sub.feedback ?? null,
                    resources: sub.fileUrl ? ['Download Project'] : ['Submission File']
                }));
        }

        const { data } = await apiClient.get(`/submissions/team/${teamId}`);
        return data.map((sub) => ({
            id: sub._id,
            project: sub.project || `Project Submission v${sub.version || 1}`,
            hackathon: sub.hackathonTitle || 'Current Hackathon',
            submittedAt: new Date(sub.submittedAt).toLocaleDateString(),
            status: sub.status || 'Submitted',
            score: sub.score ?? null,
            feedback: sub.feedback ?? null,
            resources: sub.fileUrl ? ['Download Project'] : ['Submission File']
        }));
    } catch (error) {
        console.error('Failed to fetch student submissions:', error);
        return [];
    }
};

export const submitProject = async (submissionData) => {
    try {
        const { data: teamSubs } = await apiClient.get(`/submissions/team/${submissionData.teamId}`);
        const nextVersion = teamSubs.length + 1;

        const payload = {
            teamId: submissionData.teamId,
            stageId: submissionData.stageId || 'initial_stage',
            fileUrl: submissionData.fileUrl || 'pending_upload',
            project: submissionData.project || 'Untitled Project',
            desc: submissionData.desc || '',
            category: submissionData.category || 'General',
            status: submissionData.status || 'Pending',
            version: nextVersion
        };

        const { data } = await apiClient.post('/submissions/', payload);
        return { success: true, submission: data };
    } catch (error) {
        console.error('Project submission failed:', error);
        throw error;
    }
};

export const fetchSubmissionEvaluations = async (submissionId) => {
    try {
        if (!submissionId) return [];
        const { data } = await apiClient.get(`/evaluations/submission/${submissionId}`);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Failed to fetch submission evaluations:', error);
        return [];
    }
};
