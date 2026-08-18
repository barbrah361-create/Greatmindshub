import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadFileToCloud } from '../services/uploadService.js';
import { UploadDB } from '../config/db.js';

const isVercel = !!process.env.VERCEL;
const uploadDir = isVercel
  ? path.join('/tmp', 'uploads')
  : path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const filetypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only images (jpeg, jpg, png, gif, webp) are allowed!'));
};

const poemFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (file.fieldname === 'backgroundImage') {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    return cb(new Error('Only images (jpeg, jpg, png, webp, gif) are allowed for background!'));
  } else if (file.fieldname === 'backgroundAudio') {
    const filetypes = /mp3|wav|m4a|ogg|aac|mpeg/;
    const mimetype = /audio\/mpeg|audio\/wav|audio\/x-wav|audio\/mp4|audio\/x-m4a|audio\/ogg|audio\/aac/.test(file.mimetype) || filetypes.test(file.originalname.toLowerCase());
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype || extname) {
      return cb(null, true);
    }
    return cb(new Error('Only safe audio formats (mp3, wav, m4a, ogg, aac) are allowed!'));
  } else {
    cb(new Error('Unexpected field'));
  }
};

const originalUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

const originalUploadPoemFiles = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for audio
  fileFilter: poemFileFilter
});

/**
 * Express middleware that intercepts multer-uploaded files and uploads them to the cloud.
 */
export async function uploadToCloudMiddleware(req: any, res: any, next: any) {
  if (!req.file && !req.files) {
    return next();
  }

  const uploadPromises: Promise<any>[] = [];

  const handleUpload = async (file: Express.Multer.File) => {
    if (file.path) {
      const cloudUrl = await uploadFileToCloud(file.path, file.filename);
      if (cloudUrl) {
        // Save database mapping
        UploadDB.create({
          filename: file.filename,
          cloudUrl: cloudUrl
        });

        // Clean up temporary local file on container
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          // ignore
        }
      }
    }
  };

  if (req.file) {
    uploadPromises.push(handleUpload(req.file));
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach((file: any) => uploadPromises.push(handleUpload(file)));
    } else {
      Object.keys(req.files).forEach((key) => {
        const fileArray = req.files[key];
        if (Array.isArray(fileArray)) {
          fileArray.forEach((file: any) => uploadPromises.push(handleUpload(file)));
        }
      });
    }
  }

  if (uploadPromises.length > 0) {
    try {
      await Promise.all(uploadPromises);
    } catch (err) {
      console.error('[Upload Middleware] Error during cloud uploads:', err);
    }
  }

  next();
}

// Intercept single uploads
export const upload = {
  single: (fieldName: string) => [originalUpload.single(fieldName), uploadToCloudMiddleware]
};

// Intercept fields/multiple uploads
export const uploadPoemFiles = {
  fields: (fields: any[]) => [originalUploadPoemFiles.fields(fields), uploadToCloudMiddleware]
};
