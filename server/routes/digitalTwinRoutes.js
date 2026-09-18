const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const digitalTwinController = require("../controllers/digitalTwinController");

// Get logged-in patient's dynamic digital twin
router.get(
    "/",
    authMiddleware,
    digitalTwinController.getDigitalTwin
);

// Patient logs symptom
router.post(
    "/symptom",
    authMiddleware,
    requireRole("patient"),
    digitalTwinController.logSymptom
);

// Patient logs vitals
router.post(
    "/vitals",
    authMiddleware,
    requireRole("patient"),
    digitalTwinController.logVitals
);

// Doctor view single patient's digital twin
router.get(
    "/patient/:patientId",
    authMiddleware,
    requireRole("doctor"),
    digitalTwinController.getPatientDigitalTwinForDoctor
);

module.exports = router;
