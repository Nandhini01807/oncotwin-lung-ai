const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const scanUpload = require("../middleware/scanUploadMiddleware");
const scanController = require("../controllers/scanController");

// Helper error wrapper for Multer upload errors
const handleUpload = (req, res, next) => {
  scanUpload.single("file")(req, res, (err) => {
    if (err) {
      console.error("[Multer Error]:", err.message);
      return res.status(400).json({
        message: err.message || "Please upload a valid DICOM (.dcm) chest CT scan.",
        error: err.message
      });
    }
    next();
  });
};

// ==========================================
// DOCTOR DECISION SUPPORT ENDPOINTS
// ==========================================

// 1. Primary Analysis & Prediction Routes
router.post(
  "/doctor/predict",
  authMiddleware,
  roleMiddleware("doctor"),
  handleUpload,
  scanController.doctorPredictScan
);

router.post(
  "/doctor/upload-scan",
  authMiddleware,
  roleMiddleware("doctor"),
  handleUpload,
  scanController.doctorPredictScan
);

router.post(
  "/scan-analysis/analyze",
  authMiddleware,
  roleMiddleware("doctor"),
  handleUpload,
  scanController.doctorPredictScan
);

router.post(
  "/scan-analysis/predict",
  authMiddleware,
  roleMiddleware("doctor"),
  handleUpload,
  scanController.doctorPredictScan
);

router.post(
  "/analyze",
  authMiddleware,
  roleMiddleware("doctor"),
  handleUpload,
  scanController.doctorPredictScan
);

router.post(
  "/predict",
  authMiddleware,
  roleMiddleware("doctor"),
  handleUpload,
  scanController.doctorPredictScan
);

router.post(
  "/upload",
  authMiddleware,
  roleMiddleware("doctor"),
  handleUpload,
  scanController.doctorPredictScan
);

// 2. Doctor: Clinical Assessment, Stage, TNM, and Approval
router.patch(
  "/doctor/scans/:id/stage",
  authMiddleware,
  roleMiddleware("doctor"),
  scanController.updateDoctorAssignedStage
);

router.post(
  "/doctor/scans/:id/stage",
  authMiddleware,
  roleMiddleware("doctor"),
  scanController.updateDoctorAssignedStage
);

router.patch(
  "/scans/:id/stage",
  authMiddleware,
  roleMiddleware("doctor"),
  scanController.updateDoctorAssignedStage
);

router.post(
  "/doctor/verify",
  authMiddleware,
  roleMiddleware("doctor"),
  scanController.doctorVerifyScan
);

router.post(
  "/verify",
  authMiddleware,
  roleMiddleware("doctor"),
  scanController.doctorVerifyScan
);

// 3. Doctor: Scan History & Deletion
router.get(
  "/doctor/history",
  authMiddleware,
  roleMiddleware("doctor"),
  scanController.doctorGetHistory
);

router.get(
  "/scans/history",
  authMiddleware,
  roleMiddleware("doctor"),
  scanController.doctorGetHistory
);

router.delete(
  "/doctor/history/:id",
  authMiddleware,
  roleMiddleware("doctor"),
  scanController.doctorDeleteScan
);

router.delete(
  "/scans/:id",
  authMiddleware,
  roleMiddleware("doctor"),
  scanController.doctorDeleteScan
);

// ==========================================
// PATIENT READ-ONLY VERIFIED ENDPOINTS
// ==========================================

router.get(
  "/patient/report/:id",
  authMiddleware,
  scanController.patientGetReport
);

router.get(
  "/report/:id",
  authMiddleware,
  scanController.patientGetReport
);

router.get(
  "/scans/:id",
  authMiddleware,
  scanController.patientGetReport
);

router.get(
  "/patient/history",
  authMiddleware,
  scanController.patientGetHistory
);

router.get(
  "/history",
  authMiddleware,
  (req, res, next) => {
    if (req.user.role === "doctor") {
      return scanController.doctorGetHistory(req, res, next);
    }
    return scanController.patientGetHistory(req, res, next);
  }
);

module.exports = router;
