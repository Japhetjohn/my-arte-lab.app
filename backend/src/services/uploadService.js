/**
 * Upload Service - Cloudinary Integration
 * Handles all image uploads for the platform
 */

const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Configure multer for memory storage (we'll upload to Cloudinary directly)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'myartelab',
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'myartelab_preset',
      transformation: options.transformation || [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ],
      ...options
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        resolve(result);
      }
    ).end(fileBuffer);
  });
};

/**
 * Upload avatar image
 */
const uploadAvatar = async (fileBuffer) => {
  return uploadToCloudinary(fileBuffer, {
    folder: 'myartelab/avatars',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  });
};

/**
 * Upload cover image
 */
const uploadCover = async (fileBuffer) => {
  return uploadToCloudinary(fileBuffer, {
    folder: 'myartelab/covers',
    transformation: [
      { width: 1200, height: 400, crop: 'fill' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  });
};

/**
 * Upload portfolio image
 */
const uploadPortfolio = async (fileBuffer) => {
  return uploadToCloudinary(fileBuffer, {
    folder: 'myartelab/portfolio',
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  });
};

/**
 * Delete image from Cloudinary
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  uploadAvatar,
  uploadCover,
  uploadPortfolio,
  deleteImage
};
