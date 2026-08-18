import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { put } from '@vercel/blob';

/**
 * Uploads a local file to Vercel Blob or Cloudinary depending on available environment credentials.
 * Falls back to local serving if no cloud credentials are provided.
 */
export async function uploadFileToCloud(filePath: string, filename: string): Promise<string | null> {
  try {
    // 1. Try Vercel Blob first
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const fileBuffer = fs.readFileSync(filePath);
      const blob = await put(filename, fileBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      console.log('[Cloud Upload] Success (Vercel Blob):', blob.url);
      return blob.url;
    }

    // 2. Try Cloudinary next
    if (process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
      if (!process.env.CLOUDINARY_URL) {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });
      }
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: filename.split('.')[0],
        resource_type: 'auto'
      });
      console.log('[Cloud Upload] Success (Cloudinary):', result.secure_url);
      return result.secure_url;
    }
    
    console.log('[Cloud Upload] Skipped (No cloud credentials configured). Serving locally.');
  } catch (err) {
    console.error('[Cloud Upload] Error uploading file:', err);
  }
  return null;
}
