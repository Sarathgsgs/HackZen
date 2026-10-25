import apiClient from './api';

export const applyForHackathon = async (hackathonId) => {
    const { data } = await apiClient.post('/applications/', { hackathonId });
    return data;
};

export const fetchMyApplications = async () => {
    try {
        const { data } = await apiClient.get('/applications/my');
        return data || [];
    } catch (error) {
        console.warn('Could not load user applications, falling back to empty list:', error);
        return [];
    }
};

export const fetchHackathonApplications = async (hackathonId) => {
    const { data } = await apiClient.get(`/applications/hackathon/${hackathonId}`);
    return data || [];
};
