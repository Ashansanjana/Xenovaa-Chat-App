import { apiClient } from './client';

export async function listNotificationsRequest() {
  const { data } = await apiClient.get('/notifications');
  return data.notifications;
}

export async function markNotificationReadApi(id) {
  const { data } = await apiClient.patch(`/notifications/${id}/read`);
  return data.notification;
}

export async function markAllNotificationsReadApi() {
  await apiClient.patch('/notifications/read-all');
}
