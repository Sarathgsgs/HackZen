import apiClient from '../../api/api';

/**
 * Admin Organizer Approvals API Service
 * Directly synchronized with live MongoDB and backend endpoints
 */

export const fetchOrganizerApprovals = async () => {
    try {
        const { data } = await apiClient.get('/admin/organizers');
        if (data && data.success && Array.isArray(data.applications)) {
            return data.applications;
        }
        if (Array.isArray(data)) return data;
        return [];
    } catch (error) {
        console.error("Failed to fetch organizer approvals from backend:", error);
        return [];
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
            console.error("Failed to update organizer status:", error);
            throw error;
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
        // Fallback to status update
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
