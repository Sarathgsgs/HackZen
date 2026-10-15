import apiClient from '../../api/api';

/** Load real hackathons and this mentor's assigned-team counts. */
export const fetchMentorHackathons = async () => {
  const { data } = await apiClient.get('/mentor/hackathons');
  return Array.isArray(data.data) ? data.data : [];
};
