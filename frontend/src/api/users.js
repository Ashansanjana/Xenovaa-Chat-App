import { apiClient } from './client';

export async function listUsersRequest({ search, departmentId } = {}) {
  const { data } = await apiClient.get('/users', { params: { search, departmentId } });
  return data.users;
}

export async function getUserProfileRequest(id) {
  const { data } = await apiClient.get(`/users/${id}`);
  return data;
}

export async function updateAvatarRequest(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.patch('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.user;
}

export async function removeAvatarRequest() {
  const { data } = await apiClient.delete('/users/me/avatar');
  return data.user;
}
