// src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');

// Store files in memory buffer rather than saving them locally on disk
const storage = multer.memoryStorage();

const allowedExtensions = [
  '.pdf', '.docx', '.xlsx', '.pptx', '.zip', '.jpg', '.jpeg', '.png', '.html', '.css', '.js',
  '.txt', '.doc', '.xls', '.ppt', '.rar', '.7z', '.py', '.java', '.cpp', '.c', '.cs', '.php',
  '.json', '.xml', '.svg', '.mp4', '.mp3', '.wav', '.mov'
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new AppError(`نوع الملف غير مدعوم.`, 400), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500 MB maximum threshold (validated dynamically at the service layer)
  }
});

module.exports = upload;
