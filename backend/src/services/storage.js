import { supabase } from '../config/supabaseClient.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'chat-uploads';
const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET || 'avatars';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const MIME_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function validateFile(file) {
  if (!file) return 'No file provided.';
  if (file.size > MAX_FILE_SIZE) return 'File exceeds the 10MB limit.';
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return 'Unsupported file type. Allowed: images, PDF, DOCX.';
  }
  return null;
}

export function messageTypeForMime(mimetype) {
  return mimetype.startsWith('image/') ? 'image' : 'file';
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadFileToBucket({ conversationId, buffer, mimetype, originalname }) {
  const path = `${conversationId}/${crypto.randomUUID()}-${sanitizeFilename(originalname)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimetype,
    upsert: false,
  });

  if (error) throw error;
  return path;
}

export async function getSignedFileUrl(path, expiresInSeconds = 3600) {
  if (!path) return null;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.error('getSignedFileUrl error:', error.message);
    return null;
  }
  return data.signedUrl;
}

// Avatars live in their own public bucket — unlike chat attachments, a profile
// picture isn't sensitive and is rendered everywhere (directory, headers,
// message bubbles), so a signed URL per view would add overhead for no benefit.
export function validateAvatarFile(file) {
  if (!file) return 'No file provided.';
  if (file.size > MAX_AVATAR_SIZE) return 'Image exceeds the 5MB limit.';
  if (!AVATAR_MIME_TYPES.has(file.mimetype)) {
    return 'Unsupported image type. Allowed: JPG, PNG, WEBP, GIF.';
  }
  return null;
}

// Fixed per-user path (upsert) so updating a photo replaces the old one
// instead of leaving orphaned files in storage.
export async function uploadAvatar({ userId, buffer, mimetype }) {
  const extension = MIME_EXTENSION[mimetype] || 'jpg';
  const path = `${userId}/avatar.${extension}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, buffer, {
    contentType: mimetype,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  // Cache-bust so every client picks up the new image immediately instead of
  // an old cached copy at the same URL.
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deleteAvatar(userId) {
  const { data: files, error: listError } = await supabase.storage.from(AVATAR_BUCKET).list(userId);
  if (listError) throw listError;
  if (!files || files.length === 0) return;

  const paths = files.map((f) => `${userId}/${f.name}`);
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove(paths);
  if (error) throw error;
}
