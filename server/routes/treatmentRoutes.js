const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const treatmentController = require("../controllers/treatmentController");

router.get("/", authMiddleware, treatmentController.getTreatments);
router.get("/timeline", authMiddleware, treatmentController.getTreatmentTimeline);
router.post("/", authMiddleware, treatmentController.createTreatment);
router.post("/simulate", authMiddleware, treatmentController.simulateTreatment);

module.exports = router;

