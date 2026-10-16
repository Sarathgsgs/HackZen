import apiClient from './api';

export const getTeamProgress = async (teamId) => {
  const { data } = await apiClient.get(`/progress/team/${teamId}`);
  return data;
};

export const updateTeamProgress = async (teamId, progressData) => {
  const { data } = await apiClient.put(`/progress/team/${teamId}`, progressData);
  window.dispatchEvent(new CustomEvent('progress-updated', { detail: { teamId, progress: data } }));
  return data;
};

export const createMilestoneProgress = async (milestoneData) => {
  const { data } = await apiClient.post('/progress/milestone', milestoneData);
  window.dispatchEvent(new Event('progress-updated'));
  return data;
};

export const updateMilestoneProgress = async (milestoneProgressId, completed) => {
  const { data } = await apiClient.put(`/progress/milestones/${milestoneProgressId}`, { completed });
  window.dispatchEvent(new Event('progress-updated'));
  return data;
};

export const getMilestonesProgress = async (progressId) => {
  const { data } = await apiClient.get(`/progress/milestones/${progressId}`);
  return data;
};
