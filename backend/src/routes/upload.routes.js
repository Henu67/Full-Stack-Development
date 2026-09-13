import express from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/uploadController.js';
import { verifyToken } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';

// The chat UI only ever offers image uploads (accept="image/*"), but that's
// a client-side hint an attacker can bypass by calling this endpoint
// directly. Enforce the same restriction server-side — and deliberately
// exclude image/svg+xml, since SVG files can carry embedded <script> tags
// despite being "images".
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPEG, PNG, GIF and WEBP images are allowed'));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.use(verifyToken);
router.post('/', upload.single('file'), uploadFile);

export default router;