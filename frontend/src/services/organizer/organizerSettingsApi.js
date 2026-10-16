import apiClient from '../../api/api';

/**
 * Organizer Settings API Integration
 * Synchronized with profileModel.py and profileRoutes.py
 */

export const fetchOrganizerSettings = async () => {
    try {
        const { data } = await apiClient.get('/profile/me');
        const roleProfile = data.organizer_profile || data.profile || {};
        
        return {
            orgName: roleProfile.institutionName || 'TechConnect Events',
            emailReports: roleProfile.emailReports || 'weekly',
            autoApproveMentors: roleProfile.autoApproveMentors !== undefined ? roleProfile.autoApproveMentors : false
        };
    } catch (error) {
        console.error("Error fetching organizer settings:", error);
        throw error;
    }
};

export const updateOrganizerSettings = async (updatedSettings) => {
    try {
        const profilePayload = {
            institutionName: updatedSettings.institutionName || updatedSettings.orgName,
            institutionType: updatedSettings.institutionType,
            designation: updatedSettings.designation,
            bio: updatedSettings.bio,
            phoneNumber: updatedSettings.phoneNumber,
            linkedinUrl: updatedSettings.linkedinUrl,
            emailReports: updatedSettings.emailReports,
            autoApproveMentors: updatedSettings.autoApproveMentors
        };

        const { data } = await apiClient.put('/profile/me', profilePayload);
        
        return {
            success: true,
            data: {
                ...updatedSettings,
                orgName: data.institutionName || updatedSettings.orgName,
                emailReports: data.emailReports || updatedSettings.emailReports,
                autoApproveMentors: data.autoApproveMentors !== undefined ? data.autoApproveMentors : updatedSettings.autoApproveMentors
            }
        };
    } catch (error) {
        console.error("Error updating organizer settings:", error);
        throw error;
    }
};
