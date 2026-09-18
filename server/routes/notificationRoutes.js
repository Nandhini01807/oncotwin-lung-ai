const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

// List logged-in user's notifications
router.get(
  "/mine",
  authMiddleware,
  notificationController.getMyNotifications
);

// Mark single notification as read
router.patch(
  "/:id/read",
  authMiddleware,
  notificationController.markAsRead
);

// Mark all notifications as read
router.patch(
  "/read-all",
  authMiddleware,
  notificationController.markAllAsRead
);

module.exports = router;
