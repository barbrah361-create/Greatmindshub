import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'public', 'uploads');

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

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

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

export const uploadPoemFiles = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for audio
  fileFilter: poemFileFilter
});
