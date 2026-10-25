/**
 * Admin Profile API Integration
 */

import apiClient from '../../api/api';

// Default profile structure matching the AdminProfile component's expectations
const DEFAULT_PROFILE = {
    name: 'Alex Johnson',
    role: 'System Administrator',
    department: 'Operations & Security',
    bio: '',
    avatarGradient: 'from-blue-700 to-blue-900',
    permissions: [],
    stats: {
        approvals: 0,
        reports: 0,
        uptime: '99.9%'
    },
    recentLogs: [],
    initials: 'AJ'
};

/**
 * Fetches the current admin's profile data from backend.
 */
export const fetchAdminProfile = async () => {
    try {
        const { data } = await apiClient.get('/profile/me');
        const roleProfile = data.admin_profile || {};
        
        const profileData = {
            ...DEFAULT_PROFILE,
            ...data,
            ...roleProfile,
            department: roleProfile.department || DEFAULT_PROFILE.department,
            bio: roleProfile.bio || '',
            initials: (data.name || '').split(' ').map(n => n[0]).join('').toUpperCase() || 'AJ'
        };
        
        // Cache in localStorage for persistence across sessions
        const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
        const cachedUser = { ...existingUser, ...data, admin_profile: profileData };
        localStorage.setItem('user', JSON.stringify(cachedUser));
        sessionStorage.setItem('user', JSON.stringify(cachedUser));
        
        return profileData;
    } catch (error) {
        console.error('Failed to fetch admin profile from server:', error);
        
        // Fallback to cached data if server request fails
        try {
            const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (cachedUser && cachedUser.admin_profile) {
                console.log('Using cached admin profile data from localStorage');
                return cachedUser.admin_profile;
            }
        } catch (cacheError) {
            console.error('Failed to retrieve cached profile:', cacheError);
        }
        
        throw error;
    }
};

/**
 * Get cached profile from localStorage without server request
 */
export const getCachedAdminProfile = () => {
    try {
        const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
        return cachedUser.admin_profile || null;
    } catch (error) {
        console.error('Failed to retrieve cached profile:', error);
        return null;
    }
};

/**
 * Updates the admin's profile data in backend.
 */
export const updateAdminProfile = async (updatedFields) => {
    try {
        const backendPayload = { ...updatedFields };
        
        const { data } = await apiClient.put('/profile/me', backendPayload);
        
        // Sync updated profile to localStorage for persistence across sessions
        if (data) {
            const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = {
                ...existingUser,
                name: updatedFields.name || existingUser.name,
                admin_profile: {
                    ...existingUser.admin_profile,
                    ...data
                }
            };
            
            localStorage.setItem('user', JSON.stringify(updatedUser));
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        return {
            success: true,
            message: 'Admin profile updated successfully',
            profile: data
        };
    } catch (error) {
        console.error('Admin profile update failed:', error);
        throw error;
    }
};
