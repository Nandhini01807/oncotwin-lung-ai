const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const predictionController = require("../controllers/predictionController");

// ==========================================
// PUBLIC / GENERAL METADATA ENDPOINTS
// ==========================================

// Retrieve dynamic sample presets (Malignant & Benign)
router.get("/presets", predictionController.getPresets);

// Retrieve model evaluation metrics & transparency stats
router.get("/metrics", predictionController.getModelMetrics);

// ==========================================
// PATIENT / DOCTOR CLINICAL ENDPOINTS
// ==========================================

// Get latest prediction for a specific patient (Patient: own only | Doctor: assigned only)
router.get("/:patientId/latest", authMiddleware, predictionController.getPatientLatestPrediction);

// Record clinical risk screening assessment (Doctor only, per assigned patient)
router.post("/assess/:patientId", authMiddleware, roleMiddleware("doctor"), predictionController.assessPatientRisk);

// Clinician decision review and override (Doctor role only)
router.patch("/:predictionId/review", authMiddleware, roleMiddleware("doctor"), predictionController.reviewPrediction);

// Analyze PDF medical report (NLP extraction)
router.post(
  "/predict",
  authMiddleware,
  uploadMiddleware.single("report"),
  predictionController.predictCancer
);

module.exports = router;