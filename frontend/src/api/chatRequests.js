import { apiClient } from './client';

export async function sendChatRequestApi(receiverId) {
  const { data } = await apiClient.post('/chat-requests', { receiverId });
  return data;
}

export async function listIncomingRequestsApi() {
  const { data } = await apiClient.get('/chat-requests/incoming');
  return data.requests;
}

export async function listOutgoingRequestsApi() {
  const { data } = await apiClient.get('/chat-requests/outgoing');
  return data.requests;
}

export async function listConnectionsApi() {
  const { data } = await apiClient.get('/chat-requests/connections');
  return data.connections;
}

export async function respondToRequestApi(id, action) {
  const { data } = await apiClient.patch(`/chat-requests/${id}`, { action });
  return data;
}

export async function cancelRequestApi(id) {
  await apiClient.delete(`/chat-requests/${id}`);
}
