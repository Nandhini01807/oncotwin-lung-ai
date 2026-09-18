const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    role: {
        type: String,
        enum: ["doctor", "patient", "admin", "system"],
        default: "doctor"
    },
    action: {
        type: String,
        required: true,
        trim: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient"
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: ""
    },
    ipAddress: {
        type: String,
        default: ""
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ patient: 1, timestamp: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
