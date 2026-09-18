const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const reportController = require("../controllers/reportController");

// ==========================================
// UPLOAD MEDICAL REPORT
// ==========================================

router.post(
    "/upload",
    authMiddleware,
    (req, res, next) => {
        upload.single("report")(req, res, (err) => {
            if (err) {
                console.error("Multer Upload Error:", err.message);

                return res.status(400).json({
                    message: "File upload validation error",
                    error: err.message
                });
            }

            next();
        });
    },
    reportController.uploadReport
);


// ==========================================
// GET LOGGED-IN PATIENT REPORTS
// ==========================================

router.get(
    "/",
    authMiddleware,
    reportController.getReports
);

router.get(
    "/my-reports",
    authMiddleware,
    reportController.getReports
);


// ==========================================
// DELETE MEDICAL REPORT
// ==========================================

router.delete(
    "/:id",
    authMiddleware,
    reportController.deleteReport
);


// ==========================================
// DOCTOR - GET ASSIGNED PATIENT REPORTS
// ==========================================

router.get(
    "/patient/:patientId/reports",
    authMiddleware,
    reportController.getPatientReportsForDoctor
);

// ==========================================
// DOCTOR - MARK REPORT REVIEWED
// ==========================================

router.patch(
    "/:id/review",
    authMiddleware,
    reportController.reviewReport
);

module.exports = router;