import apiClient from '../../api/api';

/**
 * Admin Users Management API Service
 */

export const fetchUsers = async () => {
    try {
        const { data } = await apiClient.get('/admin/users');
        return data.users || data;
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
};

export const fetchUserProfile = async (userId) => {
    try {
        const { data } = await apiClient.get(`/admin/users/${userId}/profile`);
        return data.profile || data;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
};

export const updateUserRole = async (userId, newRole, reason = "Admin update") => {
    try {
        const { data } = await apiClient.put(`/admin/users/${userId}/role`, { new_role: newRole, reason });
        return data;
    } catch (error) {
        console.error("Error updating user role:", error);
        throw error;
    }
};

export const updateUserStatus = async (userId, status, reason = "Administrative action", duration = "Permanent", message = "") => {
    try {
        const { data } = await apiClient.put(`/admin/users/${userId}/status`, { status, reason, duration, message });
        return data;
    } catch (error) {
        console.error("Error updating user status:", error);
        throw error;
    }
};

export const performBulkUserAction = async (userIds, action, value = "", reason = "") => {
    try {
        const { data } = await apiClient.post('/admin/users/bulk-action', { user_ids: userIds, action, value, reason });
        return data;
    } catch (error) {
        console.error("Error performing bulk user action:", error);
        throw error;
    }
};
