import { apiClient } from './client';

export async function listConversationsRequest() {
  const { data } = await apiClient.get('/conversations');
  return data.conversations;
}

export async function getConversationMessagesRequest(conversationId, { before } = {}) {
  const { data } = await apiClient.get(`/conversations/${conversationId}/messages`, {
    params: { before },
  });
  return data.messages;
}

export async function listPinnedMessagesRequest(conversationId) {
  const { data } = await apiClient.get(`/conversations/${conversationId}/pins`);
  return data.pins;
}

export async function uploadAttachmentRequest(conversationId, file, { replyToMessageId } = {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (replyToMessageId) formData.append('replyToMessageId', replyToMessageId);

  const { data } = await apiClient.post(`/conversations/${conversationId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.message;
}
