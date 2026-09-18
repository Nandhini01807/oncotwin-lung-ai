const express = require("express");

const router = express.Router();

const authMiddleware =
    require("../middleware/authMiddleware");

const requireRole =
    require("../middleware/roleMiddleware");

const doctorController =
    require("../controllers/doctorController");


// ======================================================
// DOCTOR PROFILE
// ======================================================

router.get(
    "/profile",
    authMiddleware,
    requireRole("doctor"),
    doctorController.getProfile
);


// ======================================================
// CREATE / UPDATE DOCTOR PROFILE
// ======================================================

router.post(
    "/profile",
    authMiddleware,
    requireRole("doctor"),
    doctorController.createOrUpdateProfile
);


// ======================================================
// DOCTOR DASHBOARD
// ======================================================

router.get(
    "/dashboard",
    authMiddleware,
    requireRole("doctor"),
    doctorController.getDashboard
);


// ======================================================
// ASSIGN PATIENT
// ======================================================

router.post(
    "/patients/assign",
    authMiddleware,
    requireRole("doctor"),
    doctorController.assignPatient
);


// ======================================================
// SINGLE PATIENT DETAILS
// ======================================================

router.get(
    "/patients/:patientId",
    authMiddleware,
    requireRole("doctor"),
    doctorController.getPatientDetails
);


// ======================================================
// SINGLE PATIENT AI PREDICTION
// ======================================================

router.get(
    "/patients/:patientId/prediction",
    authMiddleware,
    requireRole("doctor"),
    doctorController.getPatientPrediction
);

router.delete(
    "/patients/:patientId",
    authMiddleware,
    requireRole("doctor"),
    doctorController.removePatient
);

router.get(
    "/list",
    authMiddleware,
    doctorController.getAllDoctors
);

module.exports = router;
