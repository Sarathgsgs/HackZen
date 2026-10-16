import apiClient from '../api/api';

/** Read and persist a user-owned UI dataset in MongoDB. */
export const getUIDataset = async (key, initialValue) => {
  const { data } = await apiClient.get(`/ui-data/${key}`);
  if (data.data !== null && data.data !== undefined) return data.data;
  await apiClient.put(`/ui-data/${key}`, { data: initialValue });
  return initialValue;
};

export const saveUIDataset = async (key, value) => {
  await apiClient.put(`/ui-data/${key}`, { data: value });
  return value;
};
