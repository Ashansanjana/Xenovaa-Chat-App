import { apiClient } from './client';

export async function listAnnouncementsRequest() {
  const { data } = await apiClient.get('/announcements');
  return data.announcements;
}

export async function createAnnouncementRequest(title, body) {
  const { data } = await apiClient.post('/announcements', { title, body });
  return data.announcement;
}
