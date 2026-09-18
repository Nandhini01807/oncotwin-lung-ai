const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    // Patient's login/user account
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    // Patient ID string (e.g. PT20260045)
    patientIdString: {
      type: String,
      default: "PT20260045"
    },

    // Assigned doctor
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null
    },

    // Primary Hospital Facility
    hospital: {
      type: String,
      default: "Apollo Cancer Centre"
    },

    age: {
      type: Number,
      default: 54
    },

    gender: {
      type: String,
      default: "Male"
    },

    bloodGroup: {
      type: String,
      default: "O+"
    },

    phone: {
      type: String,
      default: "+91 98400 11223"
    },

    address: {
      type: String,
      default: "No. 42, Anna Nagar West, Chennai, Tamil Nadu - 600040"
    },

    diagnosisStatus: {
      type: String,
      default: "Under Observation"
    },

    treatmentStatus: {
      type: String,
      default: "Follow-up"
    },

    nextAppointmentDate: {
      type: Date,
      default: new Date("2026-09-12T10:30:00.000Z")
    },

    nextCtScanDate: {
      type: Date,
      default: new Date("2026-09-20T09:00:00.000Z")
    },

    lastVisitDate: {
      type: Date,
      default: new Date("2026-08-10T11:00:00.000Z")
    },

    cancerType: {
      type: String,
      default: "Suspicious Pulmonary Nodule"
    },

    cancerStage: {
      type: String,
      default: "Stage I (T1b N0 M0)"
    },

    diagnosisDate: {
      type: Date,
      default: new Date("2026-08-10")
    },

    stageSource: {
      type: String,
      default: "Chest CT & Clinical Biopsy Evaluation"
    },

    stageVerificationStatus: {
      type: String,
      default: "Doctor Verified"
    },

    stageVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null
    },

    stageVerifiedAt: {
      type: Date,
      default: null
    },

    stageNotes: {
      type: String,
      default: ""
    },

    doctorRemarks: {
      type: String,
      default: ""
    },

    medicalHistory: {
      type: String,
      default: "Patient presented with dry cough for 3 weeks. Non-productive, no hemoptysis. Chest CT showed 14mm solid nodule in Right Upper Lobe. Under active surveillance."
    },

    smokingHistory: {
      type: String,
      default: "Former smoker, 15 pack-years, quit 2019"
    },

    emergencyContact: {
      name: { type: String, default: "Lakshmi Krishna" },
      relation: { type: String, default: "Spouse" },
      phone: { type: String, default: "+91 98401 23456" }
    },

    insurance: {
      provider: { type: String, default: "Star Health Platinum Comprehensive" },
      policyNumber: { type: String, default: "SH-8829104-A" },
      coverageLimit: { type: String, default: "₹15,00,000" },
      validTill: { type: String, default: "31 Dec 2027" }
    },

    allergies: {
      type: [String],
      default: ["Penicillin", "Sulfa drugs"]
    },

    chronicConditions: {
      type: [String],
      default: ["Hypertension (controlled with Amlodipine 5mg)"]
    },

    priorCancerHistory: {
      type: Boolean,
      default: false
    },

    symptoms: [
      {
        symptom: { type: String, required: true },
        severity: { type: Number, min: 1, max: 10, default: 5 },
        loggedAt: { type: Date, default: Date.now },
        notes: { type: String, default: "" }
      }
    ],

    vitals: [
      {
        weight: { type: Number, default: 68.5 },
        spo2: { type: Number, default: 98 },
        heartRate: { type: Number, default: 72 },
        bloodPressure: { type: String, default: "120/80" },
        recordedAt: { type: Date, default: Date.now }
      }
    ],

    medications: [
      {
        name: { type: String, default: "Erlotinib" },
        dosage: { type: String, default: "150 mg" },
        frequency: { type: String, default: "Once daily" },
        instructions: { type: String, default: "Take on an empty stomach (1h before or 2h after meals)" },
        prescribedBy: { type: String, default: "Dr. Priya Raman" },
        startDate: { type: Date, default: new Date("2026-08-15") },
        status: { type: String, default: "Active" }
      },
      {
        name: { type: String, default: "Dexamethasone" },
        dosage: { type: String, default: "4 mg" },
        frequency: { type: String, default: "Twice daily as needed" },
        instructions: { type: String, default: "Take with breakfast and lunch to prevent gastric discomfort" },
        prescribedBy: { type: String, default: "Dr. Priya Raman" },
        startDate: { type: Date, default: new Date("2026-08-15") },
        status: { type: String, default: "Active" }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Patient", patientSchema);