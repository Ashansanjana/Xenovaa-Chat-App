import { apiClient } from './client';

export async function listAllUsersRequest() {
  const { data } = await apiClient.get('/admin/users');
  return data.users;
}

export async function updateUserRequest(userId, updates) {
  const { data } = await apiClient.patch(`/admin/users/${userId}`, updates);
  return data.user;
}

export async function getAdminStatsRequest() {
  const { data } = await apiClient.get('/admin/stats');
  return data.stats;
}
