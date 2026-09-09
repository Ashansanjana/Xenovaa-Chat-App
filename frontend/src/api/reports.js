import { apiClient } from './client';

export async function createReportRequest({ reportedUserId, messageId, reason }) {
  const { data } = await apiClient.post('/reports', { reportedUserId, messageId, reason });
  return data.report;
}

export async function listReportsRequest(status) {
  const { data } = await apiClient.get('/reports', { params: { status } });
  return data.reports;
}

export async function resolveReportRequest(reportId, status) {
  const { data } = await apiClient.patch(`/reports/${reportId}`, { status });
  return data.report;
}
