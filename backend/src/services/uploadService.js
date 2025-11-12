
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

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
      timeout: 60000,
      ...options
    };

    const timeoutId = setTimeout(() => {
      reject(new Error('Upload timeout - please try with a smaller image'));
    }, 65000);

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        clearTimeout(timeoutId);

        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(new Error(error.message || 'Upload failed'));
        }
        resolve(result);
      }
    ).end(fileBuffer);
  });
};

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

const uploadServiceImage = async (fileBuffer) => {
  return uploadToCloudinary(fileBuffer, {
    folder: 'myartelab/services',
    transformation: [
      { width: 800, height: 600, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  });
};

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
  uploadServiceImage,
  deleteImage
};
