const mongoose = require("mongoose");

const ScanAnalysisSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient"
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor"
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    patientName: {
      type: String,
      default: "Patient"
    },
    originalFileName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      default: "application/dicom"
    },
    fileSize: {
      type: Number,
      default: 0
    },
    scanType: {
      type: String,
      default: "Chest CT (LIDC-IDRI)",
      index: true
    },
    scanUrl: {
      type: String,
      default: ""
    },
    // DICOM Metadata
    dicomMetadata: {
      modality: { type: String, default: "CT" },
      sliceThickness: { type: String, default: "1.25 mm" },
      pixelSpacing: { type: String, default: "[0.7, 0.7]" },
      windowCenter: { type: Number, default: -600 },
      windowWidth: { type: Number, default: 1500 },
      patientId: { type: String, default: "LIDC-IDRI-PATIENT" },
      manufacturer: { type: String, default: "TCIA / LIDC-IDRI" },
      format: { type: String, default: "DICOM" }
    },
    sliceIndex: {
      type: Number,
      default: 142
    },
    uploadedImage: {
      type: String,
      default: ""
    },
    imagePath: {
      type: String,
      required: true
    },
    // AI Model Output Fields (Decision-Support Only)
    prediction: {
      type: String,
      default: ""
    },
    classification: {
      type: String,
      default: ""
    },
    primaryDiagnosis: {
      type: String,
      default: "Suspicious Nodule"
    },
    confidence: {
      type: Number,
      default: 0
    },
    riskLevel: {
      type: String,
      default: "Moderate"
    },
    probabilityDistribution: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    heatmap: {
      type: String,
      default: ""
    },
    heatmapPath: {
      type: String,
      default: ""
    },
    gradcamOverlay: {
      type: String,
      default: ""
    },
    overlayPath: {
      type: String,
      default: ""
    },
    modelVersion: {
      type: String,
      default: "DenseNet121_LIDC_v1"
    },
    // Physician Assessment & Staging (Strictly Doctor-Entered)
    doctorDiagnosis: {
      type: String,
      default: ""
    },
    doctorAssignedStage: {
      type: String,
      default: null
    },
    clinicalStage: {
      type: String,
      default: null
    },
    tnm: {
      type: String,
      default: ""
    },
    stage: {
      type: String,
      default: "Not yet determined by doctor"
    },
    treatmentPlan: {
      type: String,
      default: ""
    },
    followUpPlan: {
      type: String,
      default: ""
    },
    doctorNotes: {
      type: String,
      default: ""
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true
    },
    status: {
      type: String,
      default: "Analyzed"
    },
    verificationStatus: {
      type: String,
      default: "Waiting for review",
      index: true
    },
    reviewStatus: {
      type: String,
      default: "Pending",
      index: true
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    disclaimer: {
      type: String,
      default:
        "This AI system is intended solely for clinical decision support and research. It detects suspicious pulmonary nodules from chest CT images using a Deep Learning model and provides confidence scores with Grad-CAM visual explanations. The AI does not diagnose lung cancer, assign TNM classification, determine cancer stage, or prescribe treatment. Final clinical decisions remain the responsibility of the attending physician."
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ScanAnalysis", ScanAnalysisSchema);
