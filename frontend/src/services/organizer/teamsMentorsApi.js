import apiClient from '../../api/api';

/**
 * Teams & Mentors API
 *
 * This service manages fetching teams, mentors, and judges for the organizer dashboard,
 * and handles assigning mentors to teams using real backend endpoints.
 */

/**
 * Fetches the list of all teams, mentors, and judges.
 */
export const fetchTeamsMentorsJudges = async () => {
    try {
        const [mentorsRes, teamsRes, judgesRes] = await Promise.all([
            apiClient.get('/profile/mentors'),
            apiClient.get('/teams/organizer/all'),
            apiClient.get('/teams/organizer/judges')
        ]);

        const mentors = mentorsRes.data.map(m => ({
            id: m.userId,
            name: m.name || 'Anonymous Mentor',
            avatar: (m.name || 'M')[0],
            domain: m.expertiseDomains?.[0] || 'Tech',
            assignedTeams: 0,
            expertise: m.expertiseDomains || []
        }));

        const mentorMap = new Map(mentors.map(mentor => [mentor.id, mentor]));
        const teams = teamsRes.data.map(team => {
            const memberCount = Number(team.members) || (team.memberDetails ? team.memberDetails.length : 1);
            const mentor = team.mentorId ? mentorMap.get(team.mentorId) : null;
            
            let rawTrack = team.track ?? team.domain;
            if (Array.isArray(rawTrack)) rawTrack = rawTrack[0];
            const track = (typeof rawTrack === 'string' && rawTrack.trim()) ? rawTrack.trim() : 'AI & ML';

            let rawStatus = team.status;
            if (Array.isArray(rawStatus)) rawStatus = rawStatus[0];
            const status = (typeof rawStatus === 'string' && rawStatus.trim()) ? rawStatus.trim() : 'Approved';

            const memberDetails = (team.memberDetails && Array.isArray(team.memberDetails) && team.memberDetails.length > 0)
                ? team.memberDetails
                : Array.from({ length: memberCount }, (_, idx) => ({
                    id: `${team.id || team._id}-${idx}`,
                    name: `Member ${idx + 1}`,
                    avatar: null
                }));

            return {
                id: team.id || team._id,
                hackathonId: team.hackathonId,
                hackathonTitle: team.hackathonTitle || 'Hackathon',
                name: team.name || team.teamName || 'Untitled Team',
                domain: track,
                track,
                logo: (team.name || team.teamName || 'T')[0],
                members: memberDetails,
                memberDetails,
                memberCount,
                leader: team.leader || (memberDetails[0]?.name) || 'Team Leader',
                status,
                mentor: mentor ? {
                    id: mentor.id,
                    name: mentor.name,
                    avatar: mentor.avatar
                } : null,
                registrationDate: team.registrationDate || 'Oct 2, 2023',
                registrationTime: team.registrationTime || '09:41 AM',
                createdAt: team.registrationDate || new Date().toISOString(),
                submissionStatus: team.submissionStatus || 'Pending'
            };
        });

        const mentorAssignments = teams.reduce((counts, team) => {
            if (team.mentor?.id) {
                counts[team.mentor.id] = (counts[team.mentor.id] || 0) + 1;
            }
            return counts;
        }, {});

        const mentorsWithCounts = mentors.map(mentor => ({
            ...mentor,
            assignedTeams: mentorAssignments[mentor.id] || 0
        }));

        return {
            teams,
            mentors: mentorsWithCounts,
            judges: judgesRes.data.map(judge => ({
                id: judge.id,
                name: judge.name,
                avatar: judge.avatar || (judge.name || 'J')[0],
                affiliation: judge.affiliation || 'Evaluator',
                domain: judge.domain || 'Evaluation',
                reviews: judge.reviews || 0,
                eligible: Boolean(judge.eligible),
                bio: judge.bio || `${judge.reviews || 0} review(s) submitted for your hackathons.`
            }))
        };
    } catch (error) {
        console.error('Failed to fetch teams and mentors:', error);
        throw error;
    }
};

/**
 * Assigns a mentor to a team.
 * @param {string} teamId The ID of the team.
 * @param {Object|null} mentor The mentor object to assign.
 */
export const assignMentorToTeam = async (teamId, mentor) => {
    try {
        if (!mentor) {
            const { data } = await apiClient.delete(`/teams/${teamId}/mentor`);
            return {
                success: true,
                message: 'Mentor removed successfully',
                team: data
            };
        }

        const { data } = await apiClient.post(`/teams/${teamId}/assign-mentor`, {
            mentorId: mentor.id
        });

        return {
            success: true,
            message: 'Mentor assigned successfully',
            team: data
        };
    } catch (error) {
        console.error('Failed to assign mentor:', error);
        throw error;
    }
};

/**
 * Sends invitations to a list of mentors.
 */
export const inviteMentors = async (invitationData) => {
    const { data } = await apiClient.post('/teams/mentor-invitations', invitationData);
    return data;
};

/**
 * Fetches the history of sent invitations.
 */
export const fetchInvitationHistory = async () => {
    const { data } = await apiClient.get('/teams/mentor-invitations');
    return data.map(invite => ({
        id: invite._id || invite.id,
        email: invite.email,
        role: invite.role,
        domain: invite.domain,
        status: invite.status,
        emailSent: Boolean(invite.emailSent),
        emailStatus: invite.emailStatus || (invite.emailSent ? 'sent' : 'failed'),
        notificationSent: Boolean(invite.notificationSent),
        sentAt: invite.sentAt
    }));
};

export const exportRowsToCsv = (rows, filename) => {
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

/**
 * Updates team registration status (Approved, Pending, Rejected)
 */
export const updateTeamStatus = async (teamId, status) => {
    try {
        const { data } = await apiClient.patch(`/teams/${teamId}/status`, { status });
        return data;
    } catch (error) {
        console.error('Failed to update team status:', error);
        throw error;
    }
};

/**
 * Exports registered teams into a formatted CSV file
 */
export const exportRegistrationsCsv = (teams, filename = 'team_registrations.csv') => {
    const headers = ['Team Name', 'Track', 'Status', 'Registration Date', 'Registration Time', 'Members', 'Leader', 'Event'];
    const rows = [
        headers,
        ...teams.map(t => [
            t.name || 'Untitled Team',
            t.track || t.domain || 'AI & ML',
            t.status || 'Approved',
            t.registrationDate || '',
            t.registrationTime || '',
            t.memberCount || t.members?.length || 1,
            t.leader || 'Team Leader',
            t.hackathonTitle || 'Hackathon'
        ])
    ];
    exportRowsToCsv(rows, filename);
};

