const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const patientController = require("../controllers/patientController");

// 1. Patient Profile Routes (Patient or Doctor authenticated access)
router.post(
    "/profile",
    authMiddleware,
    patientController.createOrUpdateProfile
);

router.get(
    "/profile",
    authMiddleware,
    patientController.getProfile
);

// Update structured health profile (Patient only)
router.put(
    "/profile",
    authMiddleware,
    requireRole("patient"),
    patientController.updateHealthProfile
);

// Log symptom (Patient only)
router.post(
    "/symptoms",
    authMiddleware,
    requireRole("patient"),
    patientController.logSymptom
);
// GET ALL PATIENTS

router.get(
    "/",
    authMiddleware,
    requireRole("doctor"),
    patientController.getAllPatients
);
router.get(
    "/dashboard",
    authMiddleware,
    requireRole("patient"),
    patientController.getDashboard
);
router.get(
    "/unassigned",
    authMiddleware,
    requireRole("doctor"),
    patientController.getUnassignedPatients
);
// Update & Verify Cancer Stage (Doctor Only)
router.patch(
    "/:patientId/stage",
    authMiddleware,
    requireRole("doctor"),
    patientController.updateCancerStage
);

module.exports = router;