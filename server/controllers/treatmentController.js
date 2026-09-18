const Treatment = require("../models/treatment");
const Patient = require("../models/patient");
const Doctor = require("../models/Doctor");

async function resolvePatient(req) {
  if (req.user.role === "doctor" && req.body.patientId) {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) return null;
    return Patient.findOne({ _id: req.body.patientId, doctor: doctor._id });
  }
  return Patient.findOne({ user: req.user._id });
}

exports.getTreatments = async (req, res) => {
  try {
    let patient;
    if (req.user.role === "doctor" && req.query.patientId) {
      const doctor = await Doctor.findOne({ user: req.user._id });
      patient = doctor ? await Patient.findOne({ _id: req.query.patientId, doctor: doctor._id }) : null;
    } else {
      patient = await Patient.findOne({ user: req.user._id });
    }
    if (!patient) return res.status(404).json({ message: "Patient profile not found or not assigned to this doctor" });
    const treatments = await Treatment.find({ patient: patient._id }).sort({ createdAt: -1 });
    res.json(treatments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTreatment = async (req, res) => {
  try {
    const patient = await resolvePatient(req);
    if (!patient) return res.status(404).json({ message: "Patient not found or not assigned to this doctor" });

    const recoveryRate = req.body.recoveryRate !== undefined ? Number(req.body.recoveryRate) : undefined;
    const survivalProbability = req.body.survivalProbability !== undefined ? Number(req.body.survivalProbability) : undefined;

    if (req.body.recoveryRate !== undefined && (Number.isNaN(recoveryRate) || recoveryRate < 0 || recoveryRate > 100)) {
      return res.status(400).json({ message: "Recovery rate must be a number between 0 and 100" });
    }
    if (req.body.survivalProbability !== undefined && (Number.isNaN(survivalProbability) || survivalProbability < 0 || survivalProbability > 100)) {
      return res.status(400).json({ message: "Survival probability must be a number between 0 and 100" });
    }

    const treatmentPayload = {
      patient: patient._id,
      doctor: req.user.role === "doctor" ? (await Doctor.findOne({ user: req.user._id }))?._id : null,
      treatmentName: req.body.treatmentName ? req.body.treatmentName.trim() : "",
      treatmentType: req.body.treatmentType ? req.body.treatmentType.trim() : "",
      status: req.body.status || "Active",
      startDate: req.body.startDate ? new Date(req.body.startDate) : null,
      notes: req.body.notes || "",
      isSimulation: false
    };

    if (recoveryRate !== undefined && !Number.isNaN(recoveryRate)) treatmentPayload.recoveryRate = recoveryRate;
    if (survivalProbability !== undefined && !Number.isNaN(survivalProbability)) treatmentPayload.survivalProbability = survivalProbability;

    const treatment = await Treatment.create(treatmentPayload);

    // Notify patient
    try {
      const patientWithUser = await Patient.findById(patient._id).populate("user", "name");
      if (patientWithUser && patientWithUser.user && patientWithUser.user._id) {
        const { createNotification } = require("./notificationController");
        const docUser = await Doctor.findOne({ user: req.user._id }).populate("user", "name");
        const docName = docUser?.user?.name || "Your oncologist";
        await createNotification({
          recipient: patientWithUser.user._id,
          type: "treatment_added",
          message: `Dr. ${docName} prescribed a new treatment regimen: "${treatment.treatmentName}" (${treatment.treatmentType}).`,
          relatedId: treatment._id
        });
      }
    } catch (notifErr) {
      console.warn("Notification error:", notifErr.message);
    }

    // Record Audit Log
    try {
      const { logAction } = require("./auditController");
      logAction({
        userId: req.user._id,
        role: req.user.role || "doctor",
        action: "PRESCRIBE_TREATMENT",
        patientId: patient._id,
        details: `Prescribed regimen: "${treatment.treatmentName}" (${treatment.treatmentType}, Status: ${treatment.status})`
      });
    } catch (auditErr) {
      console.warn("Audit log warning:", auditErr.message);
    }

    res.status(201).json({ message: "Treatment record created", treatment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.simulateTreatment = async (req, res) => {
  try {
    let patient;
    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ user: req.user._id });
      patient = doctor && req.body.patientId ? await Patient.findOne({ _id: req.body.patientId, doctor: doctor._id }) : null;
    } else {
      patient = await Patient.findOne({ user: req.user._id });
    }
    if (!patient) return res.status(404).json({ message: "Patient not found or not assigned to this doctor" });

    const profiles = {
      "Chemotherapy": { recoveryRate: 72, survivalProbability: 80, durationWeeks: 24, sideEffects: ["Fatigue", "Nausea", "Hair loss"] },
      "Radiation Therapy": { recoveryRate: 78, survivalProbability: 84, durationWeeks: 12, sideEffects: ["Skin irritation", "Fatigue"] },
      "Surgery": { recoveryRate: 90, survivalProbability: 92, durationWeeks: 8, sideEffects: ["Pain", "Infection risk"] },
      "Immunotherapy": { recoveryRate: 82, survivalProbability: 88, durationWeeks: 18, sideEffects: ["Fever", "Skin rash"] },
      "Targeted Therapy": { recoveryRate: 85, survivalProbability: 90, durationWeeks: 20, sideEffects: ["Diarrhea", "Fatigue"] }
    };
    const profile = profiles[req.body.treatmentType];
    if (!profile) return res.status(400).json({ message: "Invalid treatment type" });

    const result = await Treatment.create({
      patient: patient._id,
      doctor: req.user.role === "doctor" ? (await Doctor.findOne({ user: req.user._id }))?._id : null,
      treatmentName: `${req.body.treatmentType} Simulation`,
      treatmentType: req.body.treatmentType,
      status: "Planned",
      ...profile,
      notes: "Educational scenario only; not a clinical treatment recommendation.",
      isSimulation: true
    });

    res.status(201).json({ message: "Simulation completed", result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// GET TREATMENT TIMELINE (7-Stage Oncology Care Roadmap)
// ==========================================
exports.getTreatmentTimeline = async (req, res) => {
  try {
    let patient;
    if (req.user.role === "doctor" && req.query.patientId) {
      const doctor = await Doctor.findOne({ user: req.user._id });
      patient = doctor ? await Patient.findOne({ _id: req.query.patientId, doctor: doctor._id }).populate("doctor user") : null;
    } else {
      patient = await Patient.findOne({ user: req.user._id }).populate("doctor user");
    }

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    // Default 7-stage roadmap template
    const defaultSteps = [
      {
        stepKey: "Diagnosis",
        title: "Initial Pulmonary Diagnosis",
        treatmentType: "Diagnostic Evaluation",
        date: "10 Aug 2026",
        doctor: "Dr. Priya Raman",
        hospital: "Apollo Cancer Centre",
        status: "Completed",
        summary: "High-resolution Chest CT identified a 14mm suspicious pulmonary nodule in the Right Upper Lobe. Patient diagnosed with suspicious nodule requiring histopathological correlation."
      },
      {
        stepKey: "Biopsy",
        title: "CT-Guided Core Needle Biopsy",
        treatmentType: "Histopathology",
        date: "18 Aug 2026",
        doctor: "Dr. Arjun Menon",
        hospital: "Apollo Cancer Centre",
        status: "Completed",
        summary: "Percutaneous CT-guided core biopsy performed on RUL nodule. Histopathology confirmed early-stage non-small cell adenocarcinoma (EGFR L858R mutation positive)."
      },
      {
        stepKey: "Surgery",
        title: "VATS Minimally Invasive Lobectomy",
        treatmentType: "Surgical Resection",
        date: "28 Aug 2026",
        doctor: "Dr. Arjun Menon",
        hospital: "Apollo Cancer Centre",
        status: "Completed",
        summary: "Video-assisted thoracoscopic surgery (VATS) right upper lobectomy with systematic mediastinal lymph node dissection. Clear surgical margins achieved (R0 resection)."
      },
      {
        stepKey: "Chemotherapy",
        title: "Targeted Adjuvant Therapy (Erlotinib)",
        treatmentType: "Oral Targeted Chemotherapy",
        date: "05 Sep 2026 - Present",
        doctor: "Dr. Priya Raman",
        hospital: "Apollo Cancer Centre",
        status: "Active",
        summary: "Targeted EGFR TKI maintenance therapy with Erlotinib 150mg daily. Patient tolerating regimen with minimal grade 1 dermatological side effects."
      },
      {
        stepKey: "Radiotherapy",
        title: "Stereotactic Body Radiotherapy (SBRT)",
        treatmentType: "Precision Radiation",
        date: "Scheduled Oct 2026",
        doctor: "Dr. Kavitha Iyer",
        hospital: "Cancer Institute Adyar",
        status: "Scheduled",
        summary: "Targeted SBRT planned for margin sterilization. Pre-treatment 4D-CT simulation scheduled."
      },
      {
        stepKey: "Immunotherapy",
        title: "Immune Checkpoint Surveillance",
        treatmentType: "Immunotherapy Protocol",
        date: "Planned Nov 2026",
        doctor: "Dr. Priya Raman",
        hospital: "Apollo Cancer Centre",
        status: "Planned",
        summary: "Evaluation for adjuvant PD-L1 immunotherapy based on post-radiotherapy inflammatory markers and clinical tolerance."
      },
      {
        stepKey: "Follow-up CT",
        title: "High-Resolution Surveillance Chest CT",
        treatmentType: "Radiology Follow-up",
        date: "20 Sep 2026",
        doctor: "Dr. Priya Raman",
        hospital: "Apollo Cancer Centre",
        status: "Scheduled",
        summary: "Scheduled 3-month surveillance low-dose chest CT to assess lung parenchyma healing, mediastinum, and rule out recurrence."
      }
    ];

    // Fetch any customized treatment entries from MongoDB
    const treatments = await Treatment.find({ patient: patient._id }).sort({ createdAt: 1 });

    // Merge or return roadmap
    let roadmap = defaultSteps;
    if (treatments.length > 0) {
      roadmap = defaultSteps.map((step) => {
        const matching = treatments.find((t) => t.stepKey === step.stepKey || t.treatmentType === step.treatmentType);
        if (matching) {
          return {
            ...step,
            status: matching.status || step.status,
            doctor: matching.doctorName || step.doctor,
            hospital: matching.hospital || step.hospital,
            summary: matching.summary || matching.notes || step.summary,
            date: matching.startDate ? new Date(matching.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : step.date
          };
        }
        return step;
      });
    }

    res.status(200).json({
      patient: {
        name: patient.user?.name || "Krishna",
        patientIdString: patient.patientIdString || "PT20260045",
        cancerType: patient.cancerType || "Suspicious Pulmonary Nodule",
        cancerStage: patient.cancerStage || "Stage I (T1b N0 M0)",
        doctor: patient.doctor?.name || "Dr. Priya Raman",
        hospital: patient.hospital || "Apollo Cancer Centre"
      },
      roadmap
    });
  } catch (error) {
    console.error("Get Treatment Timeline Error:", error);
    res.status(500).json({ message: error.message });
  }
};

