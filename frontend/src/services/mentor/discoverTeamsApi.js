import apiClient from '../../api/api';

/**
 * Mentor Discover Teams API
 * Real backend integration for discovering and requesting teams in the Mentor Dashboard.
 */

/**
 * Fetch all teams that don't have a mentor assigned yet.
 * @returns {Promise<Array>}
 */
export const fetchDiscoverableTeams = async () => {
    try {
        const { data: teams } = await apiClient.get('/teams/discoverable');

        return (teams || [])
            .map(team => ({
                id: team._id,
                name: team.teamName,
                hackathon: team.hackathonTitle || 'Untitled Hackathon',
                domain: team.domain || 'Technology',
                description: team.description || 'This team is looking for a mentor.',
                requiredSkills: team.requiredSkills || [],
                members: team.memberCount || 0,
                maxSize: team.maxSize || 4,
                progress: team.progress || 0,
                status: team.status || 'Active',
                requested: false,
                icon: '⚛️'
            }));
    } catch (error) {
        console.error('Failed to fetch discoverable teams:', error);
        throw error;
    }
};

/**
 * Request to mentor a team by assigning yourself as the mentor.
 * @param {string} teamId
 */
export const requestMentorTeam = async (teamId) => {
    try {
        await apiClient.post(`/teams/${teamId}/request-mentor`);
        return { success: true, message: 'You are now mentoring this team.' };
    } catch (error) {
        console.error('Mentor team request failed:', error);
        throw error;
    }
};
