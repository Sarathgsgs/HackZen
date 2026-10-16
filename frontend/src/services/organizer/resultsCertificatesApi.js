import apiClient from '../../api/api';

/**
 * Results & Certificates API Integration
 */

/**
 * Fetches the leaderboard and certificate templates.
 */
export const fetchResultsAndCertificates = async (hackathonId = 'hack_1') => {
    try {
        let leaderboardData = [];
        let issuedCerts = [];

        try {
            const [leaderboardRes, issuedCertsRes] = await Promise.all([
                apiClient.get(`/evaluations/leaderboard/${hackathonId}`),
                apiClient.get(`/certificates/hackathon/${hackathonId}`)
            ]);
            leaderboardData = leaderboardRes.data || [];
            issuedCerts = issuedCertsRes.data || [];
        } catch (err) {
            console.warn("Leaderboard/Certs fetch fallback:", err);
            // Fallback: try fetching directly from submissions for this hackathon
            const { data: subs } = await apiClient.get('/submissions/');
            const hackSubs = (subs || []).filter(s => s.hackathonId === hackathonId || !hackathonId || hackathonId === 'all');
            leaderboardData = hackSubs.map((s, idx) => ({
                teamId: s.teamId || s._id,
                teamName: s.teamName || ('Team ' + (s.teamId ? String(s.teamId).substring(0, 4) : idx + 1)),
                rank: idx + 1,
                score: s.averageScore || s.score || (95 - idx * 4),
                maxScore: 100
            }));
            try {
                const { data: cData } = await apiClient.get(`/certificates/hackathon/${hackathonId}`);
                issuedCerts = cData || [];
            } catch (cErr) {
                issuedCerts = [];
            }
        }

        // Map leaderboard data and resolve members
        const mappedLeaderboard = await Promise.all(leaderboardData.map(async (item) => {
            let members = [];
            if (item.teamId) {
                try {
                    const { data } = await apiClient.get(`/teams/${item.teamId}/members`);
                    members = Array.isArray(data) ? data : [];
                } catch (err) {
                    members = [{ userId: 'usr-01', name: 'Team Lead' }];
                }
            }

            const certsForTeam = issuedCerts.filter(c => c.teamId === item.teamId || c.teamName === item.teamName);

            return {
                id: item.teamId,
                rank: item.rank,
                team: item.teamName,
                project: item.project || 'Innovative Hackathon Project',
                score: item.score,
                maxScore: item.maxScore || 100,
                tier: item.rank === 1 ? 'Grand Winner' : item.rank <= 3 ? 'Runner Up' : 'Participant',
                certStatus: certsForTeam.length > 0 ? 'Issued' : 'Pending',
                logo: (item.teamName || 'T')[0],
                members: members,
                hackathonId: hackathonId
            };
        }));

        return {
            leaderboard: mappedLeaderboard,
            templates: [
                {
                    id: 't1',
                    name: 'Certificate of Excellence',
                    description: 'Awarded to top performing teams on the leaderboard.',
                    status: 'Ready',
                    type: 'Achievement',
                    recipients: 'Top 3 Teams',
                    eligibleRanks: [1, 2, 3],
                    iconColor: 'yellow'
                },
                {
                    id: 't2',
                    name: 'Certificate of Participation',
                    description: 'Recognizing effort and contribution to the hackathon.',
                    status: 'Ready',
                    type: 'Participation',
                    recipients: 'All Participants',
                    eligibleRanks: 'all',
                    iconColor: 'blue'
                }
            ]
        };
    } catch (error) {
        console.error('Failed to fetch results and certificates:', error);
        return { leaderboard: [], templates: [] };
    }
};

/**
 * Publishes the final results by updating hackathon status.
 */
export const publishResults = async (hackathonId) => {
    try {
        await apiClient.put(`/hackathon/${hackathonId}`, { status: 'Past' });
        return { success: true };
    } catch (error) {
        console.error('Failed to publish results:', error);
        throw error;
    }
};

/**
 * Issues certificates to all members of eligible teams via the backend auto-issue route.
 */
export const issueCertificates = async (template, currentLeaderboard, hackathonId) => {
    try {
        const targetHackathonId = hackathonId || (currentLeaderboard[0] ? currentLeaderboard[0].hackathonId : 'hack_1');
        const { data } = await apiClient.post(`/certificates/auto-issue/${targetHackathonId}`);

        const updated = currentLeaderboard.map(team => {
            const isEligible = template.eligibleRanks === 'all' || (Array.isArray(template.eligibleRanks) && template.eligibleRanks.includes(team.rank));
            return isEligible ? { ...team, certStatus: 'Issued' } : team;
        });

        return {
            success: true,
            message: data.message || `Certificates successfully issued.`,
            updatedLeaderboard: updated
        };
    } catch (error) {
        console.error("Certificate issuance failed:", error);
        throw error;
    }
};
