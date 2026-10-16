import apiClient from '../../api/api';

/**
 * Organizer Dashboard API
 * 
 * Provides core operational data, broadcasts, and CSV reporting
 * for the Organizer Portal.
 */

export const fetchOrganizerDashboardData = async (dateFilter = '30days') => {
    try {
        const { data } = await apiClient.get('/dashboard/organizer-stats');
        
        return {
            raw: data,
            // 4 Core Stat Cards matching Figma Screenshot 1
            stats: [
                { 
                    id: 'active_hackathons', 
                    title: 'ACTIVE HACKATHONS', 
                    value: data.totalHackathons ?? 0,
                    isPositive: true, 
                    type: 'hackathons'
                },
                { 
                    id: 'total_registrations', 
                    title: 'TOTAL REGISTRATIONS', 
                    value: data.totalParticipants ?? 0,
                    isPositive: true, 
                    type: 'registrations'
                },
                { 
                    id: 'submissions', 
                    title: 'SUBMISSIONS', 
                    value: data.totalSubmissions ?? 0,
                    isPositive: true, 
                    type: 'submissions'
                },
                { 
                    id: 'mentors_judges', 
                    title: 'MENTORS & JUDGES', 
                    value: data.stats?.find(s => s.id === 'mentorsJudges')?.value ?? 0,
                    isPositive: true, 
                    type: 'mentors'
                }
            ],
            // Active Events Table
            activeHackathons: Array.isArray(data.activeHackathons) ? data.activeHackathons : [],
            // Recent Registrations Feed
            recentRegistrations: Array.isArray(data.recentRegistrations) ? data.recentRegistrations : [],
            // Upcoming Deadlines Feed
            upcomingDeadlines: Array.isArray(data.upcomingDeadlines) ? data.upcomingDeadlines : [],
            // Backward-compatible structures
            hackathons: {
                active: (data.hackathonBreakdown || []).filter(h => h.status !== 'completed' && h.status !== 'draft').map(h => ({
                    id: h.id,
                    name: h.title,
                    status: h.status.charAt(0).toUpperCase() + h.status.slice(1),
                    duration: 'Active',
                    registrations: h.participantCount,
                    track: h.category || 'General',
                    progress: h.progress || 65
                })),
                upcoming: (data.hackathonBreakdown || []).filter(h => h.status === 'draft').map(h => ({
                    id: h.id,
                    name: h.title,
                    status: 'Draft',
                    duration: 'Planning',
                    registrations: h.participantCount || 0,
                    track: h.category || 'General',
                    progress: 0
                })),
                past: (data.hackathonBreakdown || []).filter(h => h.status === 'completed').map(h => ({
                    id: h.id,
                    name: h.title,
                    status: 'Completed',
                    duration: 'Finished',
                    registrations: h.participantCount,
                    track: h.category || 'General',
                    progress: 100
                }))
            },
            activity: (Array.isArray(data.activityStream)) ? data.activityStream.map(a => ({
                id: a.id,
                action: `${a.name} registered for`,
                target: a.hackathon,
                time: a.time,
                type: 'registration'
            })) : [],
            funnelData: data.funnelData || { accepted: 0, inReview: 0, rejected: 0 }
        };
    } catch (error) {
        console.error("Error fetching organizer dashboard data:", error);
        throw error;
    }
};

/**
 * Send an announcement broadcast to enrolled hackathon participants
 */
export const sendOrganizerBroadcast = async (payload) => {
    try {
        const { data } = await apiClient.post('/dashboard/organizer-broadcast', payload);
        return data;
    } catch (error) {
        console.error("Error sending organizer broadcast:", error);
        throw error;
    }
};

/**
 * Export and trigger CSV download for Organizer statistics and event breakdown
 */
export const exportOrganizerReport = async () => {
    try {
        const response = await apiClient.get('/dashboard/organizer-report', {
            responseType: 'blob'
        });
        
        // Create download link
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `organizer_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error("Error exporting organizer report:", error);
        throw error;
    }
};
