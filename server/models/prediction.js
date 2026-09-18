const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },

    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null
    },

    cancerType: {
      type: String,
      default: ""
    },

    patientAge: {
      type: Number,
      default: null
    },

    tumorSize: {
      type: Number,
      default: null
    },

    symptomDuration: {
      type: String,
      enum: ["<1 month", "1–6 months", "6+ months", "N/A", ""],
      default: ""
    },

    familyHistory: {
      type: String,
      enum: ["Yes", "No", "Unknown", ""],
      default: ""
    },

    lymphNodeInvolvement: {
      type: String,
      enum: ["Yes", "No", "Unknown", ""],
      default: ""
    },

    keySymptoms: {
      type: [String],
      default: []
    },

    riskFactors: {
      type: [String],
      default: []
    },

    clinicianNotes: {
      type: String,
      default: ""
    },

    // Computed Rules-Based Risk Level
    riskLevel: {
      type: String,
      enum: ["Low", "Moderate", "High"],
      required: true,
      default: "Low"
    },

    totalScore: {
      type: Number,
      default: 0
    },

    contributingFactors: {
      type: [String],
      default: []
    },

    assessmentDate: {
      type: Date,
      default: Date.now
    },

    recommendation: {
      type: String,
      default: ""
    },

    // Clinician Review & Confirmation
    reviewStatus: {
      type: String,
      enum: ["Pending Review", "Doctor Reviewed", "Confirmed", "Overridden"],
      default: "Pending Review"
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null
    },

    doctorNotes: {
      type: String,
      default: ""
    },

    reviewedAt: {
      type: Date,
      default: null
    },

    // Backward-compatibility numeric risk score
    cancerRisk: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.Prediction || mongoose.model("Prediction", predictionSchema);