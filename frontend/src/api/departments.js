import { apiClient } from './client';

export async function listDepartmentsRequest() {
  const { data } = await apiClient.get('/departments');
  return data.departments;
}

export async function createDepartmentRequest(name) {
  const { data } = await apiClient.post('/departments', { name });
  return data.department;
}

export async function updateDepartmentRequest(id, name) {
  const { data } = await apiClient.put(`/departments/${id}`, { name });
  return data.department;
}

export async function deleteDepartmentRequest(id) {
  await apiClient.delete(`/departments/${id}`);
}
