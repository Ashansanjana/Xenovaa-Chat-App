import { apiClient } from './client';

export async function createGroupRequest(name, memberIds) {
  const { data } = await apiClient.post('/conversations', { name, memberIds });
  return data.conversation;
}

export async function renameGroupRequest(conversationId, name) {
  const { data } = await apiClient.patch(`/conversations/${conversationId}`, { name });
  return data.conversation;
}

export async function addGroupMembersRequest(conversationId, memberIds) {
  const { data } = await apiClient.post(`/conversations/${conversationId}/members`, { memberIds });
  return data.members;
}

export async function removeGroupMemberRequest(conversationId, userId) {
  await apiClient.delete(`/conversations/${conversationId}/members/${userId}`);
}

export async function updateGroupMemberRoleRequest(conversationId, userId, role) {
  const { data } = await apiClient.patch(`/conversations/${conversationId}/members/${userId}`, { role });
  return data.members;
}
