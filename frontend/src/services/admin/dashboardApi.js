import apiClient from '../../api/api';

export const fetchDashboardData = async () => {
    try {
        const response = await apiClient.get('/dashboard/metrics');
        return response.data; // Now returns stats, activities, AND graphData
    } catch (error) {
        console.error("Error fetching admin dashboard metrics:", error);
        throw error;
    }
};

export const runSecurityAudit = async () => {
    try {
        const response = await apiClient.post('/dashboard/security-audit');
        return response.data;
    } catch (error) {
        console.error("Error running security audit:", error);
        return { success: false, message: 'Security scan identified synchronization latency.' };
    }
};

// --- QUICK ACTIONS API ---

export const fetchPendingApprovals = async (roleType) => {
    try {
        const response = await apiClient.get(`/dashboard/quick-actions/pending?role=${roleType}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching pending ${roleType}s:`, error);
        throw error;
    }
};

export const approveUserRole = async (userId, role) => {
    try {
        const response = await apiClient.put(`/dashboard/quick-actions/approve/${userId}`, { role });
        return response.data;
    } catch (error) {
        console.error("Error approving user:", error);
        throw error;
    }
};

export const suspendUserAccount = async (email) => {
    try {
        const response = await apiClient.put('/dashboard/quick-actions/suspend', { email });
        return response.data;
    } catch (error) {
        console.error("Error suspending user:", error);
        throw error;
    }
};

export const sendPlatformAnnouncement = async (announcementDataOrTitle, message, targetAudience) => {
    try {
        let payload = {};
        if (typeof announcementDataOrTitle === 'object' && announcementDataOrTitle !== null) {
            payload = announcementDataOrTitle;
        } else {
            payload = { title: announcementDataOrTitle, message, audience: targetAudience, target_audience: targetAudience };
        }
        const response = await apiClient.post('/dashboard/announcements', payload);
        return response.data;
    } catch (error) {
        console.error("Error sending announcement:", error);
        throw error;
    }
};

// Fetch applications
export const fetchOrganizerApplications = async (status = 'pending') => {
    try {
        const response = await apiClient.get(`/admin/organizer-applications?status=${status}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching applications:", error);
        throw error;
    }
};

// Approve/Reject actions
export const reviewOrganizerApplication = async (userId, action, reason = "") => {
    try {
        const response = await apiClient.put(`/admin/organizer-applications/${userId}/review`, {
            status: action, // 'approved' or 'rejected'
            reason: reason
        });
        return response.data;
    } catch (error) {
        console.error(`Error reviewing application:`, error);
        throw error;
    }
};

export const updateHackathonStatus = async (hackathonId, status, feedback = "") => {
    try {
        const response = await apiClient.put(`/dashboard/hackathons/${hackathonId}/status`, { 
            status, 
            feedback 
        });
        return response.data;
    } catch (error) {
        console.error("Error updating hackathon status:", error);
        throw error;
    }
};

export const fetchAllUsers = async () => {
    try {
        const response = await apiClient.get('/admin/users');
        return response.data;
    } catch (error) {
        console.error("Error fetching all users:", error);
        throw error;
    }
};

export const toggleUserSuspendStatus = async (userId, newStatus) => {
    try {
        const response = await apiClient.put(`/admin/users/${userId}/status`, { status: newStatus });
        return response.data;
    } catch (error) {
        console.error("Error toggling user suspend status:", error);
        throw error;
    }
};

export const updateUserRoleAPI = async (userId, newRole) => {
    try {
        const response = await apiClient.put(`/admin/users/${userId}/role`, { role: newRole });
        return response.data;
    } catch (error) {
        console.error("Error updating user role:", error);
        throw error;
    }
};

// --- PLATFORM SETTINGS & ADMIN MANAGEMENT ---

export const fetchPlatformSettings = async () => {
    try {
        const response = await apiClient.get('/dashboard/settings');
        return response.data;
    } catch (error) {
        console.error("Error fetching settings:", error);
        throw error;
    }
};

export const updatePlatformSettings = async (settingsData) => {
    try {
        const response = await apiClient.put('/dashboard/settings', settingsData);
        return response.data;
    } catch (error) {
        console.error("Error updating settings:", error);
        throw error;
    }
};

export const fetchAdminsList = async () => {
    try {
        const response = await apiClient.get('/dashboard/admins');
        return response.data;
    } catch (error) {
        console.error("Error fetching admins:", error);
        return [];
    }
};

export const removeAdminAccess = async (adminId) => {
    try {
        const response = await apiClient.delete(`/dashboard/admins/${adminId}`);
        return response.data;
    } catch (error) {
        console.error("Error removing admin:", error);
        throw error;
    }
};

export const promoteUserToAdmin = async (email) => {
    try {
        const response = await apiClient.post('/dashboard/admins', { email });
        return response.data;
    } catch (error) {
        console.error("Error adding admin:", error);
        throw error;
    }
};

// --- OMNISEARCH API ---
export const performGlobalSearch = async (query) => {
    try {
        const response = await apiClient.get(`/dashboard/search?q=${encodeURIComponent(query)}`);
        return response.data;
    } catch (error) {
        console.error("Error performing global search:", error);
        return { users: [], teams: [], hackathons: [] };
    }
};

// --- NOTIFICATION BELL APIs ---
export const fetchNotifications = async () => {
    try {
        const response = await apiClient.get('/dashboard/notifications');
        return response.data;
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return { success: false, notifications: [] };
    }
};

export const markAllNotificationsRead = async () => {
    try {
        const response = await apiClient.put('/dashboard/notifications/read-all');
        return response.data;
    } catch (error) {
        console.error("Error marking all notifications read:", error);
        throw error;
    }
};

export const markNotificationRead = async (notifId) => {
    try {
        const response = await apiClient.put(`/dashboard/notifications/${notifId}/read`);
        return response.data;
    } catch (error) {
        console.error("Error marking notification read:", error);
        throw error;
    }
};
