import apiClient from '../../api/api';

/**
 * Mentor Assigned Teams API
 * Uses real team assignments and mentor assignment notifications.
 */

export const fetchAssignedTeams = async () => {
    try {
        const { data: teams } = await apiClient.get('/teams/mentor-teams');

        const activeTeams = teams.map(team => ({
            id: team._id,
            name: team.teamName,
            hackathon: team.hackathonTitle || '',
            domain: team.domain || '',
            status: team.status || '',
            progress: team.progress ?? 0,
            nextAction: team.nextAction || '',
            nextActionTime: team.nextActionTime || '',
            alert: team.alert || null,
            members: team.memberCount || 0,
            icon: (team.teamName || 'T')[0]
        }));

        return { activeTeams, pastTeams: [] };
    } catch (error) {
        console.error('Failed to fetch assigned teams:', error);
        throw error;
    }
};

export const joinTeam = async (code) => {
    try {
        const { data } = await apiClient.post(`/teams/join/${code}`);
        const teamName = data.teamName || `Team ${code}`;

        return {
            success: true,
            message: 'Successfully joined team',
            team: {
                id: data._id || data.teamId,
                name: teamName,
                hackathon: data.hackathonTitle || '',
                domain: data.domain || '',
                status: 'Active',
                progress: 0,
                nextAction: 'Onboarding',
                nextActionTime: 'Pending',
                alert: null,
                members: 1,
                icon: teamName[0]
            }
        };
    } catch (error) {
        console.error('Failed to join team:', error);
        throw error;
    }
};

export const fetchDiscoverableTeams = async () => {
    try {
        const { data: teams } = await apiClient.get('/teams/my-teams');
        return teams
            .filter(team => !team.mentorId)
            .map(team => ({
                id: team._id,
                name: team.teamName,
                hackathon: team.hackathonTitle || '',
                domain: team.domain || '',
                description: team.description || '',
                requiredSkills: team.requiredSkills || [],
                members: team.memberCount || 0,
                maxSize: team.maxSize ?? 0,
                progress: team.progress ?? 0,
                status: team.status || '',
                requested: false,
                icon: (team.teamName || 'T')[0]
            }));
    } catch (error) {
        console.error('Failed to fetch discoverable teams:', error);
        throw error;
    }
};

export const requestMentorTeam = async (teamId) => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        await apiClient.post(`/teams/${teamId}/assign-mentor`, { mentorId: user._id || user.id });
        return { success: true, message: 'Mentorship request sent successfully.' };
    } catch (error) {
        console.error('Failed to request mentor team:', error);
        throw error;
    }
};

export const createTeam = async (teamData) => {
    try {
        const { data } = await apiClient.post('/teams/', {
            teamName: teamData.name || teamData.teamName,
            hackathonId: teamData.hackathonId,
            domain: teamData.domain || 'Technology',
            description: teamData.description || ''
        });

        return {
            success: true,
            message: `Team ${data.teamName} created successfully!`,
            team: {
                id: data._id,
                name: data.teamName,
                hackathon: data.hackathonId,
                domain: data.domain || 'Technology',
                status: 'Active',
                progress: 0,
                nextAction: 'Initial Meeting',
                nextActionTime: 'TBD',
                alert: null,
                members: 1,
                icon: (data.teamName || 'T')[0]
            }
        };
    } catch (error) {
        console.error('Failed to create team:', error);
        throw error;
    }
};

export const fetchMentorshipRequests = async () => {
    try {
        const { data: notifications } = await apiClient.get('/inbox/?type=mentor_assignment');

        return notifications.map(notif => ({
            id: notif._id,
            teamId: notif.teamId,
            team: (notif.message || '').replace('You have been assigned to mentor ', '').replace('.', '') || 'New Team',
            domain: 'Mentorship',
            desc: notif.message,
            date: new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            time: notif.read ? 'Reviewed' : 'New assignment',
            priority: notif.read === false,
            icon: 'M'
        }));
    } catch (error) {
        console.error('Failed to fetch mentorship requests:', error);
        throw error;
    }
};

export const markMentorshipRequestRead = async (notificationId) => {
    try {
        await apiClient.put(`/inbox/${notificationId}/read`);
        return { success: true };
    } catch (error) {
        console.error('Failed to mark mentorship request as read:', error);
        throw error;
    }
};

export const graduateTeam = async (teamId) => {
    try {
        await apiClient.put(`/teams/${teamId}`, { status: 'completed' });
        return { success: true, message: 'Team graduated successfully' };
    } catch (error) {
        console.error('Failed to graduate team:', error);
        throw error;
    }
};
