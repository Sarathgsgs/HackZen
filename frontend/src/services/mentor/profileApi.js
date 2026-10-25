import apiClient from '../../api/api';

/**
 * Mentor Profile API Integration
 */

const DEFAULT_PROFILE = {
    name: '',
    role: 'Mentor',
    institution: '',
    bio: '',
    avatarGradient: 'from-blue-600 to-blue-500',
    expertise: [],
    links: {
        scholar: '',
        linkedin: '',
        github: ''
    },
    stats: {
        teams: 0,
        rating: '0/5',
        sessions: 0
    },
    initials: ''
};

export const fetchMentorProfile = async () => {
    const { data } = await apiClient.get('/profile/me');
    const roleProfile = data.mentor_profile || data.profile || {};
        
        const profileData = {
            ...data,
            ...roleProfile,
            institution: roleProfile.companyName || roleProfile.institution || '',
            expertise: Array.isArray(roleProfile.expertiseDomains) ? roleProfile.expertiseDomains : (roleProfile.expertise || []),
            availability: roleProfile.availability || 'Available',
            links: {
                scholar: roleProfile.scholarUrl || '',
                linkedin: roleProfile.linkedinUrl || '',
                github: roleProfile.githubUrl || ''
            },
            initials: (data.name || '').split(' ').map(n => n[0]).join('').toUpperCase()
        };
        
        // Cache in localStorage for persistence
        const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
        const cachedUser = { ...existingUser, ...data, mentor_profile: profileData };
        localStorage.setItem('user', JSON.stringify(cachedUser));
        sessionStorage.setItem('user', JSON.stringify(cachedUser));
        
    return profileData;
};

/**
 * Get cached profile from localStorage without server request
 * Useful for quick data access before network calls complete
 */
export const getCachedMentorProfile = () => {
    try {
        const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
        return cachedUser.mentor_profile || null;
    } catch (error) {
        console.error('Failed to retrieve cached profile:', error);
        return null;
    }
};

/** Fetch the mentor-only preferences that are separate from profile details. */
export const fetchMentorSettings = async () => {
    const { data } = await apiClient.get('/mentor/settings');
    return data.settings;
};

/** Persist mentorship availability, notifications, preferences, and privacy choices. */
export const updateMentorSettings = async (settings) => {
    const { data } = await apiClient.put('/mentor/settings', settings);
    return data.settings;
};

export const updateMentorProfile = async (updatedFields) => {
    try {
        const backendPayload = { ...updatedFields };
        
        if (updatedFields.links) {
            backendPayload.githubUrl = updatedFields.links.github;
            backendPayload.linkedinUrl = updatedFields.links.linkedin;
            delete backendPayload.links;
        }

        if (updatedFields.institution) {
            backendPayload.companyName = updatedFields.institution;
            delete backendPayload.institution;
        }

        if (updatedFields.expertise) {
            backendPayload.expertiseDomains = Array.isArray(updatedFields.expertise) 
                ? updatedFields.expertise 
                : updatedFields.expertise.split(',').map(s => s.trim()).filter(s => s);
            delete backendPayload.expertise;
        }

        const { data } = await apiClient.put('/profile/me', backendPayload);
        
        // Sync updated profile to localStorage for persistence across sessions
        if (data) {
            const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = {
                ...existingUser,
                name: updatedFields.name || existingUser.name,
                mentor_profile: {
                    ...existingUser.mentor_profile,
                    ...data,
                    companyName: backendPayload.companyName || existingUser.mentor_profile?.companyName,
                    expertiseDomains: backendPayload.expertiseDomains || existingUser.mentor_profile?.expertiseDomains,
                    linkedinUrl: backendPayload.linkedinUrl || existingUser.mentor_profile?.linkedinUrl,
                    phoneNumber: backendPayload.phoneNumber || existingUser.mentor_profile?.phoneNumber,
                    availability: backendPayload.availability || existingUser.mentor_profile?.availability
                }
            };
            
            localStorage.setItem('user', JSON.stringify(updatedUser));
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        return {
            success: true,
            message: 'Profile updated successfully',
            profile: data
        };
    } catch (error) {
        console.error('Mentor profile update failed:', error);
        console.error('Error details:', error.response?.data);
        throw error;
    }
};
