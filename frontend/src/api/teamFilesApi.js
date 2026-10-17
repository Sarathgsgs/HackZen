import apiClient from './api';

export const getTeamFiles = async (teamId) => {
  const { data } = await apiClient.get(`/team-files/team/${encodeURIComponent(teamId)}`);
  return Array.isArray(data) ? data : [];
};

export const uploadTeamFile = async (teamId, file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(`/team-files/team/${encodeURIComponent(teamId)}`, formData, {
    onUploadProgress,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const downloadTeamFile = async (fileId) => {
  const { data, headers } = await apiClient.get(`/team-files/${encodeURIComponent(fileId)}/download`, { responseType: 'blob' });
  return { blob: data, contentDisposition: headers['content-disposition'] || '' };
};
