const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB Max File Size
    },
    fileFilter: (req, file, cb) => {
        const isPDF = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
        const isDICOM = file.mimetype === "application/dicom" || file.originalname.toLowerCase().endsWith(".dcm");

        if (isPDF || isDICOM) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF (.pdf) and DICOM (.dcm) files are allowed"));
        }
    }
});

module.exports = upload;