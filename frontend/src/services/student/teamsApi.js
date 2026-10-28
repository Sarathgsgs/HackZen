import apiClient from '../../api/api';
import { updateMilestoneProgress } from '../../api/progressApi';

const currentUserId = () => {
    const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    return user._id || user.id || '';
};

const toWorkspaceMessage = (message) => ({
    id: message._id || message.id,
    text: message.content,
    sender: message.senderId === currentUserId() ? 'me' : 'them',
    user: message.senderName || 'Team member',
    time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: message.messageType || 'text',
});

const toWorkspaceFile = (file) => ({
    id: file._id || file.id || file.fileId,
    fileId: file._id || file.id || file.fileId,
    name: file.name || file.fileName,
    size: `${(Number(file.size || 0) / (1024 * 1024)).toFixed(1)} MB`,
    type: (file.name || file.fileName || '').split('.').pop()?.toUpperCase() || 'FILE',
    uploader: file.uploadedByName || file.uploadedBy || 'Team member',
    time: new Date(file.createdAt || Date.now()).toLocaleString(),
    url: file.url,
    attachmentType: file.attachmentType,
    attachmentSize: Number(file.size || 0),
});

/**
 * Student Teams API
 * Provides service functions for team management and collaboration using the real backend.
 */

/**
 * Fetches all teams the user is part of
 */
export const fetchMyTeams = async () => {
    try {
        const { data } = await apiClient.get('/teams/my-teams');

        const mappedTeams = await Promise.all(data.map(async (team, idx) => {
            let hackathonName = team.hackathonName || 'Hackathon';
            let memberCount = 1;
            let progress = 0;

            if (team.hackathonId && !team.hackathonName) {
                try {
                    const hackathonRes = await apiClient.get(`/hackathon/${team.hackathonId}`);
                    hackathonName = hackathonRes?.data?.title || hackathonName;
                } catch (error) {
                    // Ignore missing hackathon metadata; keep the fallback label.
                }
            }

            try {
                const membersRes = await apiClient.get(`/teams/${team._id}/members`);
                memberCount = Array.isArray(membersRes.data) ? membersRes.data.length : memberCount;
            } catch (error) {
                // Ignore missing teammate metadata; keep a safe fallback.
            }

            try {
                const progressRes = await apiClient.get(`/progress/team/${team._id}`);
                const percentage = progressRes?.data?.percentage ?? progressRes?.data?.progress ?? 0;
                progress = Number(percentage) || 0;
            } catch (error) {
                // No progress data is valid for a newly created team.
            }

            return {
                id: team._id,
                name: team.teamName,
                hackathon: hackathonName,
                hackathonId: team.hackathonId,
                teamCode: team.teamCode || null,
                status: 'Active',
                lastMessage: 'Workspace ready',
                time: 'Active',
                unread: 0,
                gradient: idx % 2 === 0 ? 'from-blue-600 to-blue-500' : 'from-emerald-500 to-teal-600',
                isOnline: true,
                progress,
                members: memberCount,
                domain: 'Technology',
                roleInTeam: (team.myRole === 'leader' || team.leaderId === currentUserId() || team.createdBy === currentUserId()) ? 'Team Lead' : 'Member',
                activity: []
            };
        }));

        return mappedTeams;
    } catch (error) {
        console.error('Failed to fetch teams:', error);
        return [];
    }
};

/** Fetch the authenticated student's teams using only backend-confirmed fields. */
export const fetchStudentTeams = async () => {
    const { data } = await apiClient.get('/teams/my-teams');
    if (!Array.isArray(data)) return [];

    return Promise.all(data.map(async (team) => {
        let progress = null;
        const teamId = team._id || team.id;
        if (teamId) {
            try {
                const { data: progressData } = await apiClient.get(`/progress/team/${teamId}`);
                const value = progressData?.percentage ?? progressData?.progress;
                progress = value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
            } catch {
                // A missing progress record is represented as unavailable.
            }
        }

        const isLead = team.myRole === 'leader' || team.leaderId === currentUserId() || team.createdBy === currentUserId();

        return {
            id: teamId,
            name: team.teamName || null,
            hackathon: team.hackathonName || null,
            members: team.memberCount !== null && team.memberCount !== undefined && Number.isFinite(Number(team.memberCount)) ? Number(team.memberCount) : null,
            progress,
            roleInTeam: isLead ? 'Team Lead' : (team.myRole || 'Member'),
            teamCode: team.teamCode || null,
        };
    }));
};

/**
 * Fetches workspace data for a specific team (messages, tasks, files)
 */
export const fetchTeamWorkspace = async (teamId) => {
    try {
        const [msgRes, progressRes, filesRes] = await Promise.all([
            apiClient.get(`/chat/${teamId}/messages`),
            apiClient.get(`/progress/team/${teamId}`).catch(() => ({ data: null })),
            apiClient.get(`/chat/${teamId}/files`).catch(() => ({ data: [] })),
        ]);

        const messages = (msgRes.data || []).map(toWorkspaceMessage);

        // Fetch milestones if progress exists
        let tasks = [];
        if (progressRes.data) {
            const { data: milestones } = await apiClient.get(`/progress/milestones/${progressRes.data._id}`);
            tasks = milestones.map(m => ({
                id: m._id,
                title: m.milestoneId,
                status: m.completed ? 'Done' : 'In Progress',
                priority: 'High',
                assignedTo: 'Team'
            }));
        }

        return {
            messages,
            tasks,
            files: (filesRes.data || []).map(toWorkspaceFile)
        };
    } catch (error) {
        console.error('Failed to fetch team workspace:', error);
        throw error;
    }
};

/**
 * Creates a new team
 */
export const createTeam = async (teamData) => {
    try {
        const normalizedPayload = {
            hackathonId: teamData.hackathonId || teamData.hackathon,
            teamName: teamData.teamName || teamData.name,
        };

        if (!normalizedPayload.hackathonId || !normalizedPayload.teamName) {
            throw new Error('A valid hackathon and team name are required.');
        }

        const { data } = await apiClient.post('/teams/', normalizedPayload);
        return { success: true, team: data, message: 'Team created successfully.' };
    } catch (error) {
        console.error('Failed to create team:', error);
        throw error;
    }
};

/**
 * Joins a team using an invite code
 */
export const joinTeamByCode = async (inviteCode) => {
    try {
        const { data } = await apiClient.post(`/teams/join/${inviteCode}`);
        return { success: true, message: 'Successfully joined team', data };
    } catch (error) {
        console.error('Failed to join team:', error);
        throw error;
    }
};

/**
 * Leaves a team
 */
export const leaveTeam = async (teamId) => {
    try {
        const { data } = await apiClient.delete(`/teams/${teamId}/members/me`);
        return data;
    } catch (error) {
        console.error('Failed to leave team:', error);
        throw error;
    }
};

/**
 * Sends a message in a team workspace
 */
export const sendMessage = async (teamId, messageData) => {
    try {
        const { data } = await apiClient.post(`/chat/${teamId}/messages`, {
            content: messageData.text || messageData.content,
            messageType: messageData.type || 'text'
        });
        return { success: true, message: toWorkspaceMessage(data) };
    } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
    }
};

export const fetchTeamFiles = async (teamId) => {
    const { data } = await apiClient.get(`/chat/${teamId}/files`);
    return data || [];
};

export const uploadTeamFile = async (teamId, file, message = '') => {
    const form = new FormData();
    form.append('file', file);
    if (message) {
        form.append('message', message);
    }
    const { data } = await apiClient.post(`/chat/${teamId}/files`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return {
        ...toWorkspaceFile(data),
        chatMessage: data.chatMessage,
    };
};

export const downloadTeamFile = async (file) => {
    const fileUrl = (file.url || '').replace(/^\/api/, '');
    const { data } = await apiClient.get(fileUrl, { responseType: 'blob' });
    const href = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = href;
    link.download = file.name || file.fileName || 'file';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(href);
};

/**
 * Updates a task status
 */
export const updateTaskStatus = async (teamId, taskId, newStatus) => {
    try {
        await updateMilestoneProgress(taskId, newStatus === 'Done');
        return { success: true, taskId, newStatus };
    } catch (error) {
        console.error('Failed to update task:', error);
        throw error;
    }
};

/**
 * Fetches alerts and registered hackathons for the overview
 */
export const fetchTeamsMeta = async () => {
    try {
        const [inboxRes, appsRes] = await Promise.all([
            apiClient.get('/inbox/').catch(() => ({ data: [] })),
            apiClient.get('/applications/my').catch(() => ({ data: [] }))
        ]);

        const registrations = await Promise.all((appsRes.data || []).map(async (app) => {
            let name = 'Hackathon';

            if (app.hackathonId) {
                try {
                    const hackathonRes = await apiClient.get(`/hackathon/${app.hackathonId}`);
                    name = hackathonRes?.data?.title || name;
                } catch (error) {
                    // Keep the fallback label when metadata is unavailable.
                }
            }

            return {
                id: app._id || app.hackathonId,
                hackathonId: app.hackathonId,
                name,
                date: app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'N/A',
                status: app.status,
                color: 'text-blue-400'
            };
        }));

        return {
            alerts: (inboxRes.data || []).filter((n) => !n.isRead).map((n) => ({ id: n._id, type: 'warning', message: n.title })),
            registrations,
        };
    } catch (error) {
        console.error('Failed to fetch teams meta:', error);
        return { alerts: [], registrations: [] };
    }
};
