const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", default: null },
    date: { type: Date, default: Date.now },
    tumorVolume: { type: Number, min: 0 },
    riskIndex: { type: Number, min: 0, max: 100 },
    weight: { type: Number },
    temperature: { type: Number },
    painLevel: { type: Number, min: 0, max: 10 },
    symptoms: [{ type: String }],
    medications: [{ type: String }],
    doctorNotes: { type: String, default: "" },
    notes: { type: String, default: "" },
    healthScore: { type: Number, min: 0, max: 100 }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Progress || mongoose.model("Progress", progressSchema);
