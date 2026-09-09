import { apiClient } from './client';

export async function blockUserRequest(userId) {
  await apiClient.post(`/users/${userId}/block`);
}

export async function unblockUserRequest(userId) {
  await apiClient.delete(`/users/${userId}/block`);
}
