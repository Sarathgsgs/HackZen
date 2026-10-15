import apiClient from '../../api/api';

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
            let hackathonName = 'Hackathon';
            let memberCount = 1;
            let progress = 0;

            if (team.hackathonId) {
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
                status: 'Active',
                lastMessage: 'Workspace ready',
                time: 'Active',
                unread: 0,
                gradient: idx % 2 === 0 ? 'from-blue-600 to-indigo-600' : 'from-emerald-500 to-teal-600',
                isOnline: true,
                progress,
                members: memberCount,
                domain: 'Technology',
                roleInTeam: 'Member',
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

        return {
            id: teamId,
            name: team.teamName || null,
            hackathon: team.hackathonName || null,
            members: team.memberCount !== null && team.memberCount !== undefined && Number.isFinite(Number(team.memberCount)) ? Number(team.memberCount) : null,
            progress,
            roleInTeam: team.myRole || null,
        };
    }));
};

/**
 * Fetches workspace data for a specific team (messages, tasks, files)
 */
export const fetchTeamWorkspace = async (teamId) => {
    try {
        const [msgRes, progressRes] = await Promise.all([
            apiClient.get(`/chat/${teamId}/messages`),
            apiClient.get(`/progress/team/${teamId}`).catch(() => ({ data: null }))
        ]);

        const messages = (msgRes.data || []).map(m => ({
            id: m._id,
            text: m.content,
            sender: m.senderId === JSON.parse(localStorage.getItem('user') || '{}')._id ? 'me' : 'them',
            user: m.senderName || 'Teammate',
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: m.messageType || 'text'
        }));

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
            files: [] // Placeholder for files router
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
 * Sends a message in a team workspace
 */
export const sendMessage = async (teamId, messageData) => {
    try {
        // Most messaging happens via WebSocket in the component
        // This is a fallback or for HTTP-based sending
        const { data } = await apiClient.post(`/chat/${teamId}/send`, messageData);
        return { success: true, message: data };
    } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
    }
};

/**
 * Updates a task status
 */
export const updateTaskStatus = async (teamId, taskId, newStatus) => {
    try {
        // This would typically hit a progress/milestone update endpoint
        await apiClient.put(`/progress/milestones/${taskId}`, { completed: newStatus === 'Done' });
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
                id: app._id,
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
