const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');

// Define upload directories
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const AVATARS_DIR = path.join(UPLOAD_DIR, 'avatars');
const COVERS_DIR = path.join(UPLOAD_DIR, 'covers');
const PORTFOLIO_DIR = path.join(UPLOAD_DIR, 'portfolio');
const SERVICES_DIR = path.join(UPLOAD_DIR, 'services');

// Ensure directories exist
const ensureDirectories = async () => {
  const dirs = [UPLOAD_DIR, AVATARS_DIR, COVERS_DIR, PORTFOLIO_DIR, SERVICES_DIR];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
};

ensureDirectories();

// Multer configuration with memory storage for processing
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// Generate unique filename
const generateFileName = (originalName) => {
  const ext = path.extname(originalName);
  const randomName = crypto.randomBytes(16).toString('hex');
  return `${Date.now()}-${randomName}${ext}`;
};

// Get base URL for images
const getBaseUrl = () => {
  const apiUrl = process.env.API_URL || 'http://localhost:5000';
  return apiUrl;
};

// Upload and process image
const uploadImage = async (fileBuffer, options = {}) => {
  const {
    folder = 'portfolio',
    width = 1200,
    height = 1200,
    fit = 'inside',
    quality = 85,
    originalName = 'image.jpg'
  } = options;

  // Determine directory
  let uploadDir;
  switch (folder) {
    case 'avatars':
      uploadDir = AVATARS_DIR;
      break;
    case 'covers':
      uploadDir = COVERS_DIR;
      break;
    case 'services':
      uploadDir = SERVICES_DIR;
      break;
    default:
      uploadDir = PORTFOLIO_DIR;
  }

  // Generate unique filename
  const fileName = generateFileName(originalName);
  const filePath = path.join(uploadDir, fileName);

  // Process and save image with sharp
  await sharp(fileBuffer)
    .resize(width, height, { fit, withoutEnlargement: true })
    .jpeg({ quality, progressive: true })
    .toFile(filePath);

  // Return result in Cloudinary-compatible format
  const baseUrl = getBaseUrl();
  const publicPath = `/uploads/${folder}/${fileName}`;
  const secure_url = `${baseUrl}${publicPath}`;

  return {
    secure_url,
    public_id: `${folder}/${fileName}`,
    url: secure_url,
    folder,
    fileName
  };
};

const uploadAvatar = async (fileBuffer, originalName = 'avatar.jpg') => {
  return uploadImage(fileBuffer, {
    folder: 'avatars',
    width: 400,
    height: 400,
    fit: 'cover',
    quality: 90,
    originalName
  });
};

const uploadCover = async (fileBuffer, originalName = 'cover.jpg') => {
  return uploadImage(fileBuffer, {
    folder: 'covers',
    width: 1200,
    height: 400,
    fit: 'cover',
    quality: 85,
    originalName
  });
};

const uploadPortfolio = async (fileBuffer, originalName = 'portfolio.jpg') => {
  return uploadImage(fileBuffer, {
    folder: 'portfolio',
    width: 1200,
    height: 1200,
    fit: 'inside',
    quality: 85,
    originalName
  });
};

const uploadServiceImage = async (fileBuffer, originalName = 'service.jpg') => {
  return uploadImage(fileBuffer, {
    folder: 'services',
    width: 800,
    height: 600,
    fit: 'inside',
    quality: 85,
    originalName
  });
};

const deleteImage = async (publicId) => {
  try {
    // publicId format: "folder/filename"
    const filePath = path.join(UPLOAD_DIR, publicId);
    await fs.unlink(filePath);
    return { result: 'ok' };
  } catch (error) {
    console.error('Image delete error:', error);
    throw error;
  }
};

module.exports = {
  upload,
  uploadImage,
  uploadAvatar,
  uploadCover,
  uploadPortfolio,
  uploadServiceImage,
  deleteImage
};
