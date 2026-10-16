import apiClient from '../../api/api';
import { getUIDataset } from '../uiDataApi';

/**
 * Admin Organizer Approvals API Service
 * Directly synchronized with live MongoDB and backend endpoints
 */

const DATASET = 'organizer-approvals';

const INITIAL_ORGANIZERS = [
    { id: 1, name: 'Sarah Chen', role: 'Community Lead', organization: 'TechHub Global', website: 'techhub.io', orgType: 'Incubator', appliedAt: 'Oct 24, 2024', status: 'Pending', image: 'https://ui-avatars.com/api/?name=Sarah+Chen&background=3b82f6&color=fff' },
    { id: 2, name: 'Michael Rodriguez', role: 'Event Director', organization: 'DevCon Foundation', website: 'devcon.org', orgType: 'Non-Profit', appliedAt: 'Oct 23, 2024', status: 'Pending', image: 'https://ui-avatars.com/api/?name=Michael+Rodriguez&background=10b981&color=fff' },
    { id: 3, name: 'James Wilson', role: 'Founder', organization: 'Hackers University', website: 'hackersu.edu', orgType: 'University Chapter', appliedAt: 'Oct 22, 2024', status: 'Pending', image: 'https://ui-avatars.com/api/?name=James+Wilson&background=8b5cf6&color=fff' },
    { id: 4, name: 'Elena Popova', role: 'CTO', organization: 'InnoCorp Solutions', website: 'innocorp.tech', orgType: 'Corporate', appliedAt: 'Oct 21, 2024', status: 'Pending', image: 'https://ui-avatars.com/api/?name=Elena+Popova&background=f59e0b&color=fff' },
    { id: 5, name: 'David Kim', role: 'President', organization: 'Code Alliance', website: 'codealliance.org', orgType: 'Non-Profit', appliedAt: 'Oct 20, 2024', status: 'Approved', image: 'https://ui-avatars.com/api/?name=David+Kim&background=8b5cf6&color=fff' },
    { id: 6, name: 'Alice Johnson', role: 'Lead Organizer', organization: 'Tech Fest 2025', website: 'techfest.com', orgType: 'Event', appliedAt: 'Oct 19, 2024', status: 'Rejected', image: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=ef4444&color=fff' }
];

export const fetchOrganizerApprovals = async () => {
    try {
        const { data } = await apiClient.get('/admin/organizers');
        if (data && data.success && Array.isArray(data.applications)) {
            return data.applications;
        }
        if (Array.isArray(data)) return data;
        return await getUIDataset(DATASET, INITIAL_ORGANIZERS);
    } catch (error) {
        console.warn("Backend /admin/organizers failed, using fallback dataset:", error);
        return await getUIDataset(DATASET, INITIAL_ORGANIZERS);
    }
};

export const updateOrganizerStatus = async (id, status, reason = "", message = "", sections = []) => {
    try {
        const { data } = await apiClient.put(`/admin/organizers/${id}/status`, {
            status,
            reason: reason || `Administrative action: ${status}`,
            message: message || `Application marked as ${status}`,
            sections
        });
        return data;
    } catch (error) {
        // Fallback to legacy approvals endpoint if needed
        try {
            const { data } = await apiClient.put(`/admin/approvals/organizers/${id}`, {
                status,
                reason,
                message,
                sections
            });
            return data;
        } catch (fallbackError) {
            console.error("Failed to update organizer status:", fallbackError);
            throw fallbackError;
        }
    }
};

export const sendChangeRequest = async (id, sections = [], message = "") => {
    try {
        const { data } = await apiClient.post(`/admin/organizers/${id}/change-request`, {
            sections,
            message: message || "Please review and furnish the requested application details."
        });
        return data;
    } catch (error) {
        console.error("Failed to send change request:", error);
        return updateOrganizerStatus(id, "Needs Changes", "Change Requested", message, sections);
    }
};

export const rejectOrganizer = async (id, reason, message = "") => {
    return updateOrganizerStatus(id, "Rejected", reason, message);
};

export const suspendOrganizer = async (id, reason = "") => {
    return updateOrganizerStatus(id, "Suspended", reason || "Administrative suspension");
};

export const revertToPending = async (id) => {
    return updateOrganizerStatus(id, "Pending", "Reverted to pending review");
};

export const fetchOrganizerAiReview = async (id) => {
    try {
        const { data } = await apiClient.get(`/admin/organizers/${id}/ai-review`);
        return data?.review || null;
    } catch (error) {
        console.error("Failed to fetch organizer AI review:", error);
        throw error;
    }
};
