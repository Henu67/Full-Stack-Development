import { Readable } from 'stream';
import cloudinary, { ensureCloudinaryConfigured } from '../config/cloudinary.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
}

// POST /api/uploads  (multipart/form-data, field name: "file")
// Used by the chat image-upload button and clipboard-paste.
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file was uploaded');

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new ApiError(
      500,
      'Image uploads are not configured yet. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the server .env file.'
    );
  }

  const isImage = req.file.mimetype.startsWith('image/');

  ensureCloudinaryConfigured();

  const result = await uploadBufferToCloudinary(req.file.buffer, {
    folder: 'synchboard/chat',
    resource_type: isImage ? 'image' : 'auto',
  });

  res.status(201).json({
    url: result.secure_url,
    publicId: result.public_id,
    type: isImage ? 'image' : 'file',
    name: req.file.originalname,
    size: req.file.size,
  });
});