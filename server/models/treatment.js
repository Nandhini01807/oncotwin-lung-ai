const mongoose = require("mongoose");

const treatmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", default: null },
    doctorName: { type: String, default: "Dr. Priya Raman" },
    hospital: { type: String, default: "Apollo Cancer Centre" },
    stepKey: {
      type: String,
      enum: ["Diagnosis", "Biopsy", "Surgery", "Chemotherapy", "Radiotherapy", "Immunotherapy", "Follow-up CT", ""],
      default: ""
    },
    treatmentName: { type: String, default: "" },
    treatmentType: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["Completed", "Active", "Scheduled", "Planned", "Under Review", "Paused", "Discontinued", ""],
      default: "Planned"
    },
    startDate: { type: Date, default: null },
    completedDate: { type: Date, default: null },
    recoveryRate: { type: Number, min: 0, max: 100, default: null },
    survivalProbability: { type: Number, min: 0, max: 100, default: null },
    sideEffects: [{ type: String }],
    durationWeeks: { type: Number, min: 0, default: null },
    notes: { type: String, default: "" },
    summary: { type: String, default: "" },
    isSimulation: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Treatment || mongoose.model("Treatment", treatmentSchema);

