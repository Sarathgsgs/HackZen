import apiClient from './api';

export const createTeam = async (teamData) => {
    const { data } = await apiClient.post('/teams', teamData);
    return data;
};

export const getMyTeams = async () => {
    const { data } = await apiClient.get('/teams/my-teams');
    return data || [];
};

export const getMyMentorRequests = async () => {
    const { data } = await apiClient.get('/teams/my-mentor-requests');
    return data || [];
};

export const fetchMentorTeams = async () => {
  const { data } = await apiClient.get('/teams/mentor-teams');
  return data;
};

export const getTeamById = async (teamId) => {
    const { data } = await apiClient.get(`/teams/${teamId}`);
    return data;
};

export const lookupTeamByCode = async (teamCode) => {
    const { data } = await apiClient.get(`/teams/lookup/${encodeURIComponent(teamCode)}`);
    return data;
};

export const getTeamMembers = async (teamId) => {
    const { data } = await apiClient.get(`/teams/${teamId}/members`);
    return data || [];
};

export const joinTeamByCode = async (teamIdOrCode) => {
    const { data } = await apiClient.post(`/teams/join/${encodeURIComponent(teamIdOrCode)}`);
    return data;
};

export const assignMentor = async (teamId, mentorData) => {
    const { data } = await apiClient.post(`/teams/${teamId}/assign-mentor`, mentorData);
    return data;
};

export const requestMentor = async (teamId, mentorId, message = '') => {
    const { data } = await apiClient.post(`/teams/${teamId}/request-mentor`, { mentorId, message });
    return data;
};

export const getMentorRequests = async () => {
    const { data } = await apiClient.get('/teams/mentor/requests');
    return data || [];
};

export const decideMentorRequest = async (requestId, decision, responseMessage = '') => {
    const { data } = await apiClient.patch(`/teams/mentor/requests/${requestId}`, { decision, responseMessage });
    return data;
};

export const removeTeamMember = async (teamId, userId) => {
    const { data } = await apiClient.delete(`/teams/${teamId}/members/${userId}`);
    return data;
};

export const deleteTeam = async (teamId) => {
    const { data } = await apiClient.delete(`/teams/${teamId}`);
    return data;
};


