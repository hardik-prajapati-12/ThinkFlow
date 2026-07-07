const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'thinkflow/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
  }
});

module.exports = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2 MB limit for avatars
});
