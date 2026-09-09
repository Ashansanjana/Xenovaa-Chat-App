export const STATUS_STORAGE_KEY = 'xenovaa_user_status';

export function getSavedStatus() {
  try {
    const saved = localStorage.getItem(STATUS_STORAGE_KEY);
    return saved === 'break' ? 'break' : 'online';
  } catch {
    return 'online';
  }
}
