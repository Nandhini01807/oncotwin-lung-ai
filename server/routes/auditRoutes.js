const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

// Doctors and Admins can access audit logs
router.get("/", authMiddleware, requireRole("doctor", "admin"), auditController.getAuditLogs);

module.exports = router;
