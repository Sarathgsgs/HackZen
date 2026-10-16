import apiClient from '../../api/api';

export const SUBMISSION_STATUSES = [
    'Pending Review',
    'Reviewed',
    'Shortlisted',
    'Evaluated',
    'Approved',
    'Flagged for Investigation',
    'Rejected',
    'Disqualified'
];

export const fetchSubmissions = async () => {
    const { data } = await apiClient.get('/submissions/organizer/all');
    return (data || []).map(submission => ({
        id: submission.id || submission._id,
        team: submission.team || 'Unknown Team',
        logo: submission.logo || (submission.team || 'T')[0],
        teamId: submission.teamId,
        teamCode: submission.teamCode || 'N/A',
        hackathon: submission.hackathon || 'Unknown Hackathon',
        hackathonId: submission.hackathonId,
        status: submission.status || 'Pending Review',
        title: submission.title || 'Untitled Submission',
        description: submission.description || '',
        time: submission.time || 'N/A',
        submittedAt: submission.submittedAt,
        score: submission.score ? `${submission.score}/100` : null,
        plagiarismScore: submission.plagiarismScore !== undefined ? submission.plagiarismScore : (submission.similarityScore !== undefined ? submission.similarityScore : (submission.similarity || 12)),
        track: submission.track || 'General',
        fileUrl: submission.fileUrl || '',
        version: submission.version || 1,
        evaluationCount: submission.evaluationCount || 0,
        docs: submission.fileUrl ? ['Submission Deliverable'] : []
    }));
};

export const updateSubmissionStatus = async (submissionId, status, reason = '') => {
    try {
        const { data } = await apiClient.post(`/submissions/${submissionId}/status`, { status, reason });
        return data;
    } catch (err) {
        const { data } = await apiClient.put(`/submissions/${submissionId}/status`, { status, reason });
        return data;
    }
};

export const exportSubmissionsToCsv = (submissions, filename = 'submissions-export.csv') => {
    const rows = [
        ['Project', 'Team', 'Hackathon', 'Track', 'Status', 'Submitted', 'Evaluations', 'File URL'],
        ...submissions.map(item => [
            item.title,
            item.team,
            item.hackathon,
            item.track,
            item.status,
            item.time,
            item.evaluationCount,
            item.fileUrl
        ])
    ];

    const csvRows = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','));
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
