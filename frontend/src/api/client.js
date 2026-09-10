import axios from 'axios';
import { getApiBaseUrl } from '../lib/serverConfig';

export const apiClient = axios.create();

apiClient.interceptors.request.use((config) => {
  // Read fresh on every request (not baked in at creation) so a server URL
  // change from the Settings menu takes effect immediately, no reload needed.
  config.baseURL = getApiBaseUrl();

  const token = localStorage.getItem('xenovaa_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
