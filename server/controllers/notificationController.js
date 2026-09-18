const Notification = require("../models/Notification");

// Helper function to create notification server-side
exports.createNotification = async ({ recipient, type, message, relatedId = null }) => {
  try {
    if (!recipient || !type || !message) return null;
    const notification = await Notification.create({
      recipient,
      type,
      message,
      relatedId
    });
    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error.message);
    return null;
  }
};

// GET /api/notifications/mine
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });

    res.status(200).json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Marked as read", notification });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark All Read Error:", error);
    res.status(500).json({ message: error.message });
  }
};
