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
                    stageId: sub.stageId || null,
                    project: sub.project || null,
                    hackathon: sub.hackathonTitle || null,
                    submittedAt: sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : null,
                    status: sub.status || null,
                    desc: sub.desc || '',
                    fileUrl: sub.fileUrl || null,
                    version: sub.version ?? null,
                    score: sub.score ?? null,
                    feedback: sub.feedback ?? null,
                    resources: sub.fileUrl ? ['Download Project'] : []
                }));
        }

        const { data } = await apiClient.get(`/submissions/team/${teamId}`);
        return data.map((sub) => ({
            id: sub._id,
            stageId: sub.stageId || null,
            project: sub.project || null,
            hackathon: sub.hackathonTitle || null,
            submittedAt: sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : null,
            status: sub.status || null,
            desc: sub.desc || '',
            fileUrl: sub.fileUrl || null,
            version: sub.version ?? null,
            score: sub.score ?? null,
            feedback: sub.feedback ?? null,
            resources: sub.fileUrl ? ['Download Project'] : []
        }));
    } catch (error) {
        console.error('Failed to fetch student submissions:', error);
        throw error;
    }
};

export const submitProject = async (submissionData) => {
    try {
        if (!submissionData?.teamId || !submissionData?.stageId || !submissionData?.fileUrl) {
            throw new Error('A team, current stage, and project file URL are required.');
        }
        const { data: teamSubs } = await apiClient.get(`/submissions/team/${submissionData.teamId}`);
        const nextVersion = teamSubs.filter((submission) => submission.stageId === submissionData.stageId).length + 1;

        const payload = {
            teamId: submissionData.teamId,
            stageId: submissionData.stageId,
            fileUrl: submissionData.fileUrl,
            project: submissionData.project,
            desc: submissionData.desc || '',
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
