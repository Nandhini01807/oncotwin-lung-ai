const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const uploadDir = path.join(__dirname, "../uploads/scans");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory storage to buffer DICOM directly to Python FastAPI service
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Explicitly reject standard 2D image formats
  if ([".jpg", ".jpeg", ".png", ".bmp", ".webp", ".gif"].includes(ext)) {
    return cb(
      new Error("Please upload a valid DICOM (.dcm) chest CT scan. Standard image formats (JPG/PNG) are not accepted."),
      false
    );
  }

  const allowedExts = [".dcm", ".dicom", ""];
  const allowedMimeTypes = [
    "application/dicom",
    "application/octet-stream",
    ""
  ];

  if (allowedExts.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Please upload a valid DICOM (.dcm) chest CT scan."),
      false
    );
  }
};

const scanUpload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB Limit for DICOM CT series/slices
  },
  fileFilter: fileFilter
});

module.exports = scanUpload;
