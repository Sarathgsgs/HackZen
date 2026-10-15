import apiClient from '../../api/api';

/**
 * Mentor Assigned Teams API
 * Uses real team assignments and mentor assignment notifications.
 */

export const fetchAssignedTeams = async () => {
        const { data: teams } = await apiClient.get('/teams/mentor-teams');
        const mappedTeams = teams.map(team => ({
            id: String(team._id || team.id),
            name: team.teamName || team.name || 'Unnamed team',
            hackathonId: String(team.hackathonId || ''),
            // hackathonId is a database reference, not a human-readable event name.
            hackathon: team.hackathonName || team.hackathonTitle || team.hackathon || team.hackathonId || 'Active Hackathon',
            domain: team.domain || 'Technology',
            status: team.status || 'Active',
            progress: team.progress || 0,
            nextAction: team.nextAction || 'Check in with team',
            nextActionTime: team.nextActionTime || 'TBD',
            alert: team.alert || null,
            members: team.memberCount || 0,
            icon: (team.teamName || team.name || 'T')[0]
        }));
        const isPast = (team) => ['completed', 'past', 'concluded'].includes(String(team.status || '').toLowerCase());
        return {
            activeTeams: mappedTeams.filter((_, index) => !isPast(teams[index])),
            pastTeams: mappedTeams.filter((_, index) => isPast(teams[index])),
        };
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
                hackathon: data.hackathonId || 'Open Challenge',
                domain: data.domain || 'General',
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
                hackathon: team.hackathonId || 'Active Hackathon',
                domain: team.domain || 'Technology',
                description: team.description || 'This team is looking for a mentor.',
                requiredSkills: team.requiredSkills || [],
                members: team.memberCount || 0,
                maxSize: team.maxSize || 4,
                progress: team.progress || 0,
                status: team.status || 'Active',
                requested: false,
                icon: (team.teamName || 'T')[0]
            }));
    } catch (error) {
        console.error('Failed to fetch discoverable teams:', error);
        return [];
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
        return [];
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
