// Lets the server endpoint be changed at runtime (Settings menu) instead of
// only at build time via VITE_API_URL/VITE_SOCKET_URL — needed because a
// single built .exe is shared with everyone, but different installs may
// need to point at different backends (local dev, Contabo, a future
// replacement server) without rebuilding.

const STORAGE_KEY = 'xenovaa_server_url';

function deriveBuildTimeDefault() {
  const socketEnv = import.meta.env.VITE_SOCKET_URL;
  if (socketEnv) return socketEnv.replace(/\/+$/, '');

  const apiEnv = import.meta.env.VITE_API_URL;
  if (apiEnv) return apiEnv.replace(/\/api\/?$/, '').replace(/\/+$/, '');

  return 'http://localhost:5001';
}

export const DEFAULT_SERVER_URL = deriveBuildTimeDefault();

export function normalizeServerUrl(url) {
  return url.trim().replace(/\/+$/, '');
}

export function isValidServerUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getServerUrl() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeServerUrl(saved);
  } catch {
    // localStorage unavailable (e.g. private mode) — fall through to default
  }
  return DEFAULT_SERVER_URL;
}

export function isUsingCustomServerUrl() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

export function setServerUrl(url) {
  const normalized = normalizeServerUrl(url);
  if (!isValidServerUrl(normalized)) {
    throw new Error('Enter a valid URL starting with http:// or https://');
  }
  localStorage.setItem(STORAGE_KEY, normalized);
  return normalized;
}

export function resetServerUrl() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getApiBaseUrl() {
  return `${getServerUrl()}/api`;
}

export function getSocketUrl() {
  return getServerUrl();
}
