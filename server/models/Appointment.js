const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    appointmentIdString: {
      type: String,
      default: function() {
        return `APT2026${Math.floor(100 + Math.random() * 900)}`;
      }
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },
    department: {
      type: String,
      default: "Oncology"
    },
    hospital: {
      type: String,
      default: "OncoTwin CDSS"
    },
    requestedDate: {
      type: Date,
      required: true
    },
    timeString: {
      type: String,
      default: "10:30 AM"
    },
    status: {
      type: String,
      enum: ["requested", "accepted", "rejected", "completed", "cancelled", "Confirmed", "Pending", "Completed", "Cancelled", "Approved", "Rejected"],
      default: "Pending"
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    notes: {
      type: String,
      default: ""
    },
    doctorNotes: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.Appointment ||
  mongoose.model("Appointment", appointmentSchema);

