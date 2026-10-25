import apiClient from '../../api/api';

/**
 * Student Profile API Integration
 *
 * This service manages fetching and updating the student profile data
 * via the backend FastAPI endpoints.
 */

// Default profile structure matching our components' expectations
const DEFAULT_PROFILE = {
    name: 'Student',
    role: 'Student',
    year: 'N/A',
    college: 'Not specified',
    registerNumber: '',
    bio: '',
    avatarGradient: 'from-blue-600 to-cyan-600',
    skills: [],
    techStack: {
        frontend: '',
        backend: '',
        database: ''
    },
    links: {
        github: '',
        portfolio: ''
    },
    stats: {
        hackathons: 0,
        projects: 0,
        certificates: 0
    },
    initials: 'S'
};

/**
 * Fetches the current student's profile data from backend.
 */
export const fetchStudentProfile = async () => {
    try {
        const { data } = await apiClient.get('/profile/me');
        const roleProfile = data.student_profile || data.profile || {};
        
        const profileData = {
            ...DEFAULT_PROFILE,
            ...data,
            ...roleProfile,
            college: roleProfile.collegeName || DEFAULT_PROFILE.college,
            department: roleProfile.department || '',
            year: roleProfile.yearOfStudy ? `${roleProfile.yearOfStudy}th Year` : DEFAULT_PROFILE.year,
            yearOfStudy: roleProfile.yearOfStudy,
            skills: roleProfile.skills || [],
            links: {
                github: roleProfile.githubUrl || '',
                portfolio: roleProfile.linkedinUrl || ''
            },
            initials: (data.name || 'Student').split(' ').map(n => n[0]).join('').toUpperCase() || 'S'
        };
        
        // Cache in localStorage for persistence across sessions
        const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
        const cachedUser = { ...existingUser, ...data, student_profile: profileData };
        localStorage.setItem('user', JSON.stringify(cachedUser));
        sessionStorage.setItem('user', JSON.stringify(cachedUser));
        
        return profileData;
    } catch (error) {
        console.error('Failed to fetch student profile from server:', error);
        
        // Fallback to cached data if server request fails
        try {
            const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (cachedUser && cachedUser.student_profile) {
                console.log('Using cached profile data from localStorage');
                return cachedUser.student_profile;
            }
        } catch (cacheError) {
            console.error('Failed to retrieve cached profile:', cacheError);
        }
        
        throw error;
    }
};

/**
 * Get cached profile from localStorage without server request
 * Useful for quick data access before network calls complete
 */
export const getCachedStudentProfile = () => {
    try {
        const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
        return cachedUser.student_profile || null;
    } catch (error) {
        console.error('Failed to retrieve cached profile:', error);
        return null;
    }
};

/**
 * Updates the student's profile data in backend.
 */
export const updateStudentProfile = async (updatedFields) => {
    try {
        // Map frontend fields back to backend student model names
        const backendPayload = { ...updatedFields };
        
        // Handle both 'college' and 'collegeName' from different UI components
        if (updatedFields.college || updatedFields.collegeName) {
            backendPayload.collegeName = updatedFields.collegeName || updatedFields.college;
            delete backendPayload.college;
        }
        
        if (updatedFields.links) {
            backendPayload.githubUrl = updatedFields.links.github;
            backendPayload.linkedinUrl = updatedFields.links.portfolio;
            delete backendPayload.links;
        }

        if (updatedFields.year || updatedFields.yearOfStudy) {
            const yearVal = updatedFields.yearOfStudy || updatedFields.year;
            const match = String(yearVal).match(/\d+/);
            if (match) {
                backendPayload.yearOfStudy = parseInt(match[0]);
            }
            if (updatedFields.year) delete backendPayload.year;
        }

        const { data } = await apiClient.put('/profile/me', backendPayload);
        
        // Sync updated profile to localStorage for persistence across sessions
        if (data) {
            const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = {
                ...existingUser,
                name: updatedFields.name || existingUser.name,
                student_profile: {
                    ...existingUser.student_profile,
                    ...data,
                    collegeName: backendPayload.collegeName || existingUser.student_profile?.collegeName,
                    skills: backendPayload.skills || existingUser.student_profile?.skills,
                    githubUrl: backendPayload.githubUrl || existingUser.student_profile?.githubUrl,
                    linkedinUrl: backendPayload.linkedinUrl || existingUser.student_profile?.linkedinUrl
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
        console.error('Profile update failed:', error);
        throw error;
    }
};
