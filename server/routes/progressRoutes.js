const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const progressController = require("../controllers/progressController");


// ==========================================
// GET LOGGED-IN PATIENT PROGRESS
// ==========================================

router.get(
    "/",
    authMiddleware,
    progressController.getProgress
);


// ==========================================
// ADD PATIENT PROGRESS
// ==========================================

router.post(
    "/",
    authMiddleware,
    progressController.createProgress
);


// ==========================================
// DOCTOR - GET ASSIGNED PATIENT PROGRESS
// ==========================================

router.get(
    "/patient/:patientId",
    authMiddleware,
    progressController.getPatientProgressForDoctor
);


module.exports = router;