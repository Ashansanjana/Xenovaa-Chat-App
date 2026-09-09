import multer from 'multer';

// Files are validated again (mimetype + size) in services/storage.js before upload;
// this just caps the request size early so oversized uploads don't get read into memory.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
