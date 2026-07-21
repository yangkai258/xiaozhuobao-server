export const STORAGE_DRIVER_LOCAL = 'local';
export const STORAGE_DRIVER_COS = 'cos';
export const STORAGE_DRIVER_S3 = 's3';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export const SIGNED_URL_TTL_SECONDS = 60 * 10;
export const SIGNED_URL_TTL_MAX_SECONDS = 60 * 60 * 24;
