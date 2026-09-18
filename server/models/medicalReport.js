const mongoose = require("mongoose");

const medicalReportSchema = new mongoose.Schema(
  {
    reportIdString: {
      type: String,
      default: function() {
        return `REP2026${Math.floor(1000 + Math.random() * 9000)}`;
      }
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },

    reportName: {
      type: String,
      required: true,
      trim: true
    },

    reportType: {
      type: String,
      enum: [
        "PDF",
        "DICOM",
        "Blood Test",
        "MRI",
        "CT Scan",
        "Chest CT Scan",
        "X-Ray",
        "Biopsy",
        "Biopsy Histology",
        "Pathology Report",
        "Blood Biomarkers",
        "PET-CT Scan",
        "Other"
      ],
      default: "PDF"
    },

    doctorName: {
      type: String,
      default: "Dr. Priya Raman"
    },

    hospital: {
      type: String,
      default: "Apollo Cancer Centre"
    },

    diagnosisSummary: {
      type: String,
      default: "Suspicious pulmonary nodule identified in right upper lobe. Further biopsy recommended."
    },

    findings: {
      type: String,
      default: "14mm solid non-calcified nodule with slight spiculation in RUL posterior segment. No mediastinal lymphadenopathy noted."
    },

    recommendation: {
      type: String,
      default: "CT-guided core biopsy advised. Follow-up consultation in 2 weeks."
    },

    status: {
      type: String,
      enum: ["Approved", "Doctor Approved", "Pending Review", "Under Review", "Completed"],
      default: "Approved"
    },

    reportDate: {
      type: Date,
      required: true,
      default: Date.now
    },

    fileUrl: {
      type: String,
      default: ""
    },

    cloudinaryId: {
      type: String,
      default: null
    },

    cloudinaryResourceType: {
      type: String,
      default: "raw"
    },

    uploadedAt: {
      type: Date,
      default: Date.now
    },

    reviewed: {
      type: Boolean,
      default: true
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor"
    },

    reviewedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.MedicalReport ||
  mongoose.model("MedicalReport", medicalReportSchema);