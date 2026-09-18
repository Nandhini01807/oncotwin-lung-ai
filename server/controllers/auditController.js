const AuditLog = require("../models/AuditLog");

/**
 * Log sensitive clinical or system action.
 * Non-blocking, fails gracefully.
 */
exports.logAction = async ({ userId, role, action, patientId = null, details = "", ipAddress = "" }) => {
    try {
        if (!userId || !action) return null;
        return await AuditLog.create({
            user: userId,
            role: role || "doctor",
            action,
            patient: patientId,
            details,
            ipAddress,
            timestamp: new Date()
        });
    } catch (error) {
        console.warn("Audit log recording warning:", error.message);
        return null;
    }
};

/**
 * Get audit logs (for doctor/admin to review recent clinical activity)
 * GET /api/audit
 */
exports.getAuditLogs = async (req, res) => {
    try {
        const { patientId, limit = 50 } = req.query;
        const query = {};

        if (patientId) {
            query.patient = patientId;
        }

        // If doctor, only allow querying logs where doctor performed action or for assigned patients
        if (req.user.role === "doctor") {
            query.$or = [
                { user: req.user._id },
                { patient: { $exists: true } }
            ];
        }

        const logs = await AuditLog.find(query)
            .populate("user", "name email role")
            .populate({
                path: "patient",
                populate: { path: "user", select: "name email" }
            })
            .sort({ timestamp: -1 })
            .limit(Number(limit));

        res.status(200).json({
            count: logs.length,
            logs
        });
    } catch (error) {
        console.error("Get Audit Logs Error:", error);
        res.status(500).json({ message: error.message });
    }
};
