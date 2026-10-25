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

export const deleteUser = async (userId) => {
    try {
        const { data } = await apiClient.delete(`/admin/users/${userId}`);
        return data;
    } catch (error) {
        // Fallback for when backend deployment is updating or hasn't restarted yet
        if (error.response && error.response.status === 404) {
            try {
                // Fallback 1: Try bulk-action delete
                const { data } = await apiClient.post('/admin/users/bulk-action', {
                    user_ids: [userId],
                    action: 'delete'
                });
                return data;
            } catch (bulkError) {
                try {
                    // Fallback 2: Try status update with Deleted
                    const { data } = await apiClient.put(`/admin/users/${userId}/status`, {
                        status: 'Deleted',
                        reason: 'Permanent account deletion requested by administrator',
                        duration: 'Permanent'
                    });
                    return data;
                } catch (statusError) {
                    try {
                        // Fallback 3: At least suspend the user so they cannot access the platform
                        const { data } = await apiClient.put(`/admin/users/${userId}/status`, {
                            status: 'Suspended',
                            reason: 'Deletion pending backend deployment sync',
                            duration: 'Permanent'
                        });
                        return { success: true, message: "User suspended. Please trigger deployment on Render for complete purge." };
                    } catch (finalErr) {
                        throw error;
                    }
                }
            }
        }
        console.error("Error deleting user:", error);
        throw error;
    }
};

