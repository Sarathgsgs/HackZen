import apiClient from '../../api/api';

/**
 * Admin Disputes & Moderation Governance API Service
 */

export const fetchDisputes = async () => {
    try {
        const { data } = await apiClient.get('/admin/disputes/all');
        return data.disputes || data;
    } catch (error) {
        console.error("Error fetching admin disputes:", error);
        throw error;
    }
};

export const assignInvestigator = async (disputeId, investigatorName, investigatorEmail) => {
    try {
        const { data } = await apiClient.post(`/admin/disputes/${disputeId}/assign`, {
            investigatorName,
            investigatorEmail
        });
        return data;
    } catch (error) {
        console.error("Error assigning investigator:", error);
        throw error;
    }
};

export const requestInfoFromParty = async (disputeId, target, requestedItems, message, deadlineHours = 48) => {
    try {
        const { data } = await apiClient.post(`/admin/disputes/${disputeId}/request-info`, {
            target,
            requestedItems,
            message,
            deadlineHours
        });
        return data;
    } catch (error) {
        console.error("Error requesting info:", error);
        throw error;
    }
};

export const resolveDispute = async (disputeId, decision, reason, actions = [], notifyReporter = true, notifyTeam = true) => {
    try {
        const { data } = await apiClient.put(`/admin/disputes/${disputeId}/resolve`, {
            decision,
            reason,
            actions,
            notifyReporter,
            notifyTeam
        });
        return data;
    } catch (error) {
        console.error("Error resolving dispute:", error);
        throw error;
    }
};

export const addDisputeNote = async (disputeId, text, isInternal = true) => {
    try {
        const { data } = await apiClient.post(`/admin/disputes/${disputeId}/notes`, { text, isInternal });
        return data;
    } catch (error) {
        console.error("Error adding dispute note:", error);
        throw error;
    }
};

export const fetchDisputeAiAssessment = async (disputeId) => {
    try {
        const { data } = await apiClient.post(`/admin/disputes/${disputeId}/ai-assessment`);
        return data?.assessment || null;
    } catch (error) {
        console.error("Error fetching AI dispute assessment:", error);
        return null;
    }
};
