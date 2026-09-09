// In-memory presence tracking (single Node process). A user can have multiple
// sockets (multiple tabs/devices); they only go offline once the last one drops.
const socketsByUser = new Map();

// Tracks the user's manually chosen status: 'online' | 'break'
// Only set while the user has at least one active socket.
const userStatus = new Map();

export function addSocket(userId, socketId, initialStatus = 'online') {
  const existing = socketsByUser.get(userId);
  if (existing) {
    existing.add(socketId);
    return { wasOffline: false };
  }
  socketsByUser.set(userId, new Set([socketId]));
  // Seeded from the connecting client's own saved preference (passed via the
  // socket auth handshake) so a user who reconnects while "on break" shows
  // up correctly immediately, instead of flashing 'online' first and then
  // self-correcting once a follow-up set_status message arrives.
  userStatus.set(userId, initialStatus === 'break' ? 'break' : 'online');
  return { wasOffline: true };
}

export function removeSocket(userId, socketId) {
  const existing = socketsByUser.get(userId);
  if (!existing) return { isNowOffline: true };

  existing.delete(socketId);
  if (existing.size === 0) {
    socketsByUser.delete(userId);
    userStatus.delete(userId);
    return { isNowOffline: true };
  }
  return { isNowOffline: false };
}

export function isUserOnline(userId) {
  return socketsByUser.has(userId);
}

/**
 * Set a user's manual status ('online' | 'break').
 * Only valid while the user is connected.
 * Returns false if the user is not currently connected.
 */
export function setUserStatus(userId, status) {
  if (!socketsByUser.has(userId)) return false;
  userStatus.set(userId, status);
  return true;
}

/**
 * Get a user's effective presence status:
 * - 'online' or 'break' if connected (based on their manual choice)
 * - 'offline' if not connected
 */
export function getUserStatus(userId) {
  if (!socketsByUser.has(userId)) return 'offline';
  return userStatus.get(userId) || 'online';
}

export function getOnlineUserCount() {
  return socketsByUser.size;
}
