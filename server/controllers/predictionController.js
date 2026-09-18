const pdfParse = require("pdf-parse");
const Patient = require("../models/patient");
const Doctor = require("../models/Doctor");
const Prediction = require("../models/prediction");
const { createNotification } = require("./notificationController");

/**
 * Transparent Rules-Based Risk Screening Calculation Engine
 * Replaces opaque black-box classifiers with an auditable point-based scoring function.
 */
function calculateRiskScore(data) {
  let score = 0;
  const factors = [];

  // 1. Symptom Duration
  if (data.symptomDuration === "6+ months") {
    score += 2;
    factors.push("Symptom duration: 6+ months (+2 pts)");
  } else if (data.symptomDuration === "1–6 months" || data.symptomDuration === "1-6 months") {
    score += 1;
    factors.push("Symptom duration: 1–6 months (+1 pt)");
  }

  // 2. Family History of Cancer
  if (data.familyHistory === "Yes") {
    score += 2;
    factors.push("Positive family history of cancer (+2 pts)");
  }

  // 3. Lymph Node Involvement
  if (data.lymphNodeInvolvement === "Yes") {
    score += 3;
    factors.push("Confirmed lymph node involvement (+3 pts)");
  } else if (data.lymphNodeInvolvement === "Unknown") {
    score += 1;
    factors.push("Lymph node involvement: unconfirmed / unknown (+1 pt)");
  }

  // 4. Tumor / Mass Size (cm)
  const tumorSize = Number(data.tumorSize);
  if (!isNaN(tumorSize) && tumorSize > 0) {
    if (tumorSize > 5) {
      score += 3;
      factors.push(`Tumor / mass size: ${tumorSize} cm (>5 cm) (+3 pts)`);
    } else if (tumorSize > 2) {
      score += 2;
      factors.push(`Tumor / mass size: ${tumorSize} cm (2–5 cm) (+2 pts)`);
    } else {
      score += 1;
      factors.push(`Tumor / mass size: ${tumorSize} cm (≤2 cm) (+1 pt)`);
    }
  }

  // 5. Patient Age
  const age = Number(data.patientAge);
  if (!isNaN(age) && age >= 60) {
    score += 1;
    factors.push(`Patient age: ${age} yrs (≥60 yrs) (+1 pt)`);
  }

  // 6. Key Symptoms Checklist
  if (Array.isArray(data.keySymptoms) && data.keySymptoms.length > 0) {
    data.keySymptoms.forEach((symptom) => {
      score += 1;
      factors.push(`Key symptom: ${symptom} (+1 pt)`);
    });
  }

  // 7. Relevant Risk Factors Checklist
  if (Array.isArray(data.riskFactors) && data.riskFactors.length > 0) {
    data.riskFactors.forEach((factor) => {
      score += 1;
      factors.push(`Risk factor: ${factor} (+1 pt)`);
    });
  }

  // Auditable Risk Level Mapping
  let riskLevel = "Low";
  let recommendation = "Routine monitoring and scheduled clinical follow-up.";

  if (score >= 6) {
    riskLevel = "High";
    recommendation = "Expedited diagnostic workup, radiological imaging, and tissue biopsy recommended.";
  } else if (score >= 3) {
    riskLevel = "Moderate";
    recommendation = "Comprehensive clinical evaluation, symptom tracking, and targeted diagnostics recommended.";
  }

  if (factors.length === 0) {
    factors.push("Baseline screening: No elevated risk indicators identified");
  }

  return {
    score,
    riskLevel,
    contributingFactors: factors,
    recommendation
  };
}

// ======================================================
// DOCTOR-TRIGGERED RISK SCREENING ASSESSMENT
// POST /api/predictions/assess/:patientId
// ======================================================
exports.assessPatientRisk = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Not authorized" });
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only registered doctors can record clinical risk assessments" });
    }

    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const doctor = await Doctor.findOne({ user: req.user._id }).populate("user", "name email");
    if (!doctor) {
      return res.status(403).json({ message: "Doctor clinical profile not found" });
    }

    const patient = await Patient.findById(patientId).populate("user", "name email");
    if (!patient) {
      return res.status(404).json({ message: "Patient record not found" });
    }

    // Authorization: Doctor must be assigned to this patient
    if (!patient.doctor || patient.doctor.toString() !== doctor._id.toString()) {
      return res.status(403).json({ message: "Forbidden: You are not the assigned oncologist for this patient" });
    }

    // Execute server-side rules-based calculation (Never trust a client-only score)
    const {
      cancerType = patient.cancerType || "",
      patientAge = patient.age,
      tumorSize = null,
      symptomDuration = "",
      familyHistory = "",
      lymphNodeInvolvement = "",
      keySymptoms = [],
      riskFactors = [],
      clinicianNotes = "",
      doctorNotes = ""
    } = req.body;

    const { score, riskLevel, contributingFactors, recommendation } = calculateRiskScore({
      cancerType,
      patientAge,
      tumorSize,
      symptomDuration,
      familyHistory,
      lymphNodeInvolvement,
      keySymptoms,
      riskFactors
    });

    const numericRisk = riskLevel === "High" ? 80 : riskLevel === "Moderate" ? 50 : 20;

    // Save Assessment to MongoDB
    const prediction = await Prediction.create({
      patient: patient._id,
      assessedBy: doctor._id,
      cancerType: cancerType.trim(),
      patientAge: patientAge !== undefined && patientAge !== null && patientAge !== "" ? Number(patientAge) : null,
      tumorSize: tumorSize !== undefined && tumorSize !== null && tumorSize !== "" ? Number(tumorSize) : null,
      symptomDuration,
      familyHistory,
      lymphNodeInvolvement,
      keySymptoms: Array.isArray(keySymptoms) ? keySymptoms : [],
      riskFactors: Array.isArray(riskFactors) ? riskFactors : [],
      clinicianNotes: clinicianNotes.trim(),
      riskLevel,
      totalScore: score,
      contributingFactors,
      recommendation,
      reviewStatus: "Doctor Reviewed",
      reviewedBy: doctor._id,
      reviewedAt: new Date(),
      doctorNotes: doctorNotes.trim() || clinicianNotes.trim() || "Risk screening completed and verified by oncologist.",
      cancerRisk: numericRisk
    });

    // Notify Patient
    if (patient.user?._id) {
      try {
        const docName = doctor.user?.name || "Your oncologist";
        await createNotification({
          recipient: patient.user._id,
          type: "prediction_reviewed",
          message: `Dr. ${docName} recorded a clinical risk screening assessment (Risk Level: ${riskLevel}).`,
          relatedId: prediction._id
        });
      } catch (notifErr) {
        console.warn("Notification error:", notifErr.message);
      }
    }

    // Record Audit Log
    try {
      const { logAction } = require("./auditController");
      logAction({
        userId: req.user._id,
        role: "doctor",
        action: "RECORD_RISK_SCREENING",
        patientId: patient._id,
        details: `Recorded clinical risk screening: ${riskLevel} (Score: ${score}, Factors: ${contributingFactors.length})`
      });
    } catch (auditErr) {
      console.warn("Audit log warning:", auditErr.message);
    }

    res.status(201).json({
      message: "Clinical risk screening assessment recorded successfully",
      prediction,
      riskLevel,
      totalScore: score,
      contributingFactors,
      recommendation
    });

  } catch (error) {
    console.error("Assess Patient Risk Error:", error);
    res.status(500).json({ message: error.message || "Internal server error during risk assessment" });
  }
};

// ======================================================
// GET LATEST ASSESSMENT FOR A SPECIFIC PATIENT
// GET /api/predictions/:patientId/latest
// ======================================================
exports.getPatientLatestPrediction = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ message: "Not authorized" });

    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Role-based access control
    if (req.user.role === "patient") {
      if (patient.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden: You can only view your own risk screening records" });
      }
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor || !patient.doctor || patient.doctor.toString() !== doctor._id.toString()) {
        return res.status(403).json({ message: "Forbidden: You are not assigned to this patient" });
      }
    }

    const prediction = await Prediction.findOne({ patient: patient._id })
      .populate("reviewedBy", "specialization hospital")
      .populate("assessedBy", "specialization hospital")
      .sort({ createdAt: -1 });

    if (!prediction) {
      return res.status(404).json({ message: "No risk screening assessment on record for this patient" });
    }

    res.status(200).json(prediction);
  } catch (error) {
    console.error("Get Latest Assessment Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ======================================================
// CLINICIAN DECISION REVIEW & AUDIT
// PATCH /api/predictions/:predictionId/review
// ======================================================
exports.reviewPrediction = async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { reviewStatus = "Doctor Reviewed", doctorNotes = "", reviewNotes = "" } = req.body;

    const doctor = await Doctor.findOne({ user: req.user._id }).populate("user", "name");
    if (!doctor) {
      return res.status(403).json({ message: "Only registered oncologists can review risk assessments" });
    }

    const prediction = await Prediction.findById(predictionId).populate({
      path: "patient",
      populate: { path: "user", select: "name email" }
    });

    if (!prediction) {
      return res.status(404).json({ message: "Assessment record not found" });
    }

    // Verify doctor is assigned to this patient
    if (prediction.patient?.doctor && prediction.patient.doctor.toString() !== doctor._id.toString()) {
      return res.status(403).json({ message: "Forbidden: You are not the assigned oncologist for this patient" });
    }

    const notes = doctorNotes || reviewNotes || "Clinician reviewed and verified risk screening.";
    prediction.reviewStatus = reviewStatus;
    prediction.doctorNotes = notes;
    prediction.reviewedBy = doctor._id;
    prediction.reviewedAt = new Date();
    await prediction.save();

    // Trigger notification to patient
    if (prediction.patient?.user?._id) {
      const docName = doctor.user?.name || "Your oncologist";
      await createNotification({
        recipient: prediction.patient.user._id,
        type: "prediction_reviewed",
        message: `Dr. ${docName} updated the review on your clinical risk assessment: '${reviewStatus}'. Notes: "${notes}"`,
        relatedId: prediction._id
      });
    }

    // Record Audit Log
    try {
      const { logAction } = require("./auditController");
      logAction({
        userId: req.user._id,
        role: "doctor",
        action: "REVIEW_RISK_SCREENING",
        patientId: prediction.patient?._id,
        details: `Doctor updated risk screening review status to '${reviewStatus}': "${notes}"`
      });
    } catch (auditErr) {
      console.warn("Audit log warning:", auditErr.message);
    }

    res.status(200).json({ message: "Clinician decision review saved successfully", prediction });
  } catch (error) {
    console.error("Review Assessment Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// ======================================================
// MEDICAL REPORT PDF TEXT PARSE (NLP EXTRACTION)
// POST /api/predictions/predict
// ======================================================
exports.predictCancer = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please upload a medical report PDF" });
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) return res.status(404).json({ message: "Patient profile not found" });

    const pdfData = await pdfParse(req.file.buffer);
    const reportText = (pdfData.text || "").trim();
    if (!reportText) return res.status(400).json({ message: "Could not extract text from PDF" });

    res.status(201).json({ 
      message: "Medical report text extracted successfully", 
      reportText
    });
  } catch (error) {
    console.error("Report text parse error:", error.message);
    res.status(500).json({ message: error.message || "Report text parsing failed" });
  }
};

// Obsolete endpoints returning clean neutral responses for backwards compatibility
exports.getModelMetrics = async (req, res) => {
  res.json({ message: "Metrics endpoint deprecated in favor of transparent rules-based scoring" });
};

exports.getPresets = async (req, res) => {
  res.json({ message: "Presets endpoint deprecated in favor of manual clinician checklist" });
};
