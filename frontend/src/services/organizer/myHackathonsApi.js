import apiClient from '../../api/api';

const formatDate = (value) => {
    if (!value) return 'TBD';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'TBD' : date.toLocaleDateString();
};

const getDisplayStatus = (hackathon) => {
    if (!hackathon?.status) return 'Active';

    const rawStatus = String(hackathon.status).toLowerCase();
    if (rawStatus.includes('draft')) return 'Draft';
    if (rawStatus.includes('completed') || rawStatus.includes('results')) return 'Past';

    const now = new Date();
    const startDate = hackathon.hackathonStart ? new Date(hackathon.hackathonStart) : null;
    const endDate = hackathon.hackathonEnd ? new Date(hackathon.hackathonEnd) : null;

    if (startDate && startDate > now) return 'Upcoming';
    if (endDate && endDate < now) return 'Past';
    return 'Active';
};

const getDisplayRegistrationStatus = (hackathon) => {
    const rawStatus = String(hackathon?.status || '').toLowerCase();
    if (rawStatus.includes('draft')) return 'Closed';
    if (rawStatus.includes('registration')) return 'Open';

    const registrationEnd = hackathon?.registrationEnd ? new Date(hackathon.registrationEnd) : null;
    if (registrationEnd && registrationEnd <= new Date()) return 'Closed';
    return 'Open';
};

/**
 * My Hackathons API
 *
 * This service manages fetching the organizer's hackathons, and toggling
 * their visibility and registration statuses using the real backend.
 */

/**
 * Fetches the list of hackathons created by the organizer.
 * @returns {Promise<Array>} A promise resolving to an array of hackathon objects.
 */
export const fetchMyHackathons = async () => {
    try {
        const { data } = await apiClient.get('/hackathons/myhackathons');

        return data.map((h) => ({
            id: h._id,
            title: h.title,
            banner: h.posterUrl || 'https://images.unsplash.com/photo-1504384308090-c54be3852f33?auto=format&fit=crop&q=80&w=1000',
            startDate: formatDate(h.hackathonStart),
            endDate: formatDate(h.hackathonEnd),
            mode: h.location === 'Online' ? 'Online' : 'Hybrid',
            registrations: h.participants_count ?? 0,
            daysLeft: Math.max(0, Math.ceil((new Date(h.hackathonEnd) - new Date()) / (1000 * 60 * 60 * 24))),
            status: getDisplayStatus(h),
            regStatus: getDisplayRegistrationStatus(h),
            isVisible: h.isPublic,
            category: h.themes?.[0] || 'General',
            rawStatus: h.status
        }));
    } catch (error) {
        console.error('Failed to fetch my hackathons:', error);
        throw error;
    }
};

/**
 * Toggles the visibility of a specific hackathon.
 * @param {string} id The ID of the hackathon.
 * @returns {Promise<Object>} A promise resolving to the update status and updated hackathon.
 */
export const toggleHackathonVisibility = async (id) => {
    try {
        const { data: current } = await apiClient.get(`/hackathons/${id}`);
        const { data: updated } = await apiClient.put(`/hackathons/${id}`, {
            isPublic: !current.isPublic
        });

        return {
            success: true,
            message: `Hackathon visibility updated to ${updated.isPublic}`,
            hackathon: {
                ...updated,
                id: updated._id,
                isVisible: updated.isPublic
            }
        };
    } catch (error) {
        console.error('Failed to update visibility:', error);
        throw error;
    }
};

/**
 * Toggles the registration status of a specific hackathon.
 * @param {string} id The ID of the hackathon.
 * @returns {Promise<Object>} A promise resolving to the update status and updated hackathon.
 */
export const toggleHackathonRegistration = async (id) => {
    try {
        const { data: current } = await apiClient.get(`/hackathons/${id}`);
        const nextStatus = current.status === 'Registration Open' ? 'Draft' : 'Registration Open';

        const { data: updated } = await apiClient.put(`/hackathons/${id}`, {
            status: nextStatus
        });

        return {
            success: true,
            message: `Hackathon registration status updated to ${updated.status}`,
            hackathon: {
                ...updated,
                id: updated._id,
                status: updated.status
            }
        };
    } catch (error) {
        console.error('Failed to update registration status:', error);
        throw error;
    }
};

/**
 * Resets the hackathons data - Not applicable for real API
 */
export const resetMyHackathonsData = async () => {
    return { success: true, message: 'Reset not supported for live data' };
};
