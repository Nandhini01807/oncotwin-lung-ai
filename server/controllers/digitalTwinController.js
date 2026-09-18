const Patient = require("../models/patient");
const MedicalReport = require("../models/medicalReport");
const Prediction = require("../models/prediction");
const Treatment = require("../models/treatment");
const Progress = require("../models/progress");
const Doctor = require("../models/Doctor");

// ======================================================
// GET DIGITAL TWIN AGGREGATION (PATIENT OR DOCTOR)
// ======================================================
exports.getDigitalTwin = async (req, res) => {
    try {
        const role = (req.user.role || "").toLowerCase();

        // --------------------------------------------------
        // DOCTOR DIGITAL TWIN CONSOLE VIEW
        // --------------------------------------------------
        if (role === "doctor") {
            let doctor = await Doctor.findOne({ user: req.user._id })
                .populate("user", "name email role");

            if (!doctor) {
                doctor = await Doctor.create({
                    user: req.user._id,
                    specialization: "Oncology",
                    qualification: "MD Oncology",
                    hospital: "Oncology Care Center"
                });
                doctor = await Doctor.findById(doctor._id).populate("user", "name email role");
            }

            // Find assigned patients for this doctor
            const assignedPatients = await Patient.find({ doctor: doctor._id })
                .populate("user", "name email role")
                .sort({ createdAt: -1 });

            // If a specific patient query is passed, load that patient; otherwise load first assigned patient if available
            let targetPatient = null;
            if (req.query.patientId) {
                targetPatient = await Patient.findOne({ _id: req.query.patientId, doctor: doctor._id })
                    .populate("user", "name email role");
            } else if (assignedPatients.length > 0) {
                targetPatient = assignedPatients[0];
            }

            let reports = [];
            let prediction = null;
            let treatments = [];
            let progress = [];

            if (targetPatient) {
                reports = await MedicalReport.find({ patient: targetPatient._id }).sort({ createdAt: -1 });
                prediction = await Prediction.findOne({ patient: targetPatient._id }).sort({ createdAt: -1 });
                treatments = await Treatment.find({ patient: targetPatient._id }).sort({ createdAt: -1 });
                progress = await Progress.find({ patient: targetPatient._id }).sort({ createdAt: 1 });
            }

            return res.status(200).json({
                isDoctor: true,
                doctor,
                assignedPatients,
                patient: targetPatient || null,
                latestPrediction: prediction,
                reports,
                treatments,
                progress,
                summary: {
                    activeReportsCount: reports.length,
                    currentStage: targetPatient ? (targetPatient.cancerStage || "Stage not yet determined") : "Stage not yet determined",
                    primaryDiagnosis: targetPatient ? (targetPatient.cancerType || "Not yet recorded") : "Not yet recorded",
                    riskLevel: prediction ? prediction.riskLevel : null,
                    totalScore: prediction ? prediction.totalScore : null,
                    riskScore: prediction ? prediction.cancerRisk : null,
                    latestTreatment: treatments.length > 0 ? (treatments[0].treatmentType || treatments[0].treatmentName) : "Not yet recorded"
                }
            });
        }

        // --------------------------------------------------
        // PATIENT DIGITAL TWIN VIEW (Read-only Longitudinal Tracking)
        // --------------------------------------------------
        let patient = await Patient.findOne({ user: req.user._id })
            .populate("user", "name email role")
            .populate("doctor", "specialization qualification hospital experience name");

        if (!patient) {
            patient = await Patient.create({
                user: req.user._id,
                patientIdString: "PT20260045",
                age: 54,
                gender: "Male",
                bloodGroup: "O+",
                phone: "+91 98400 11223",
                cancerType: "Suspicious Pulmonary Nodule",
                cancerStage: "Stage I (T1b N0 M0)"
            });
            patient = await Patient.findById(patient._id).populate("user", "name email role").populate("doctor");
        }

        const reports = await MedicalReport.find({ patient: patient._id }).sort({ createdAt: -1 });
        const treatments = await Treatment.find({ patient: patient._id }).sort({ createdAt: -1 });
        const progress = await Progress.find({ patient: patient._id }).sort({ createdAt: 1 });

        // Build longitudinal trend series for patient vitals
        const defaultTrendData = [
            { date: "10 Aug 2026", weight: 69.8, spo2: 97, heartRate: 78, bp: "125/82" },
            { date: "18 Aug 2026", weight: 69.2, spo2: 98, heartRate: 75, bp: "122/80" },
            { date: "28 Aug 2026", weight: 68.0, spo2: 96, heartRate: 80, bp: "124/84" },
            { date: "02 Sep 2026", weight: 68.3, spo2: 98, heartRate: 74, bp: "120/80" },
            { date: "04 Sep 2026", weight: 68.5, spo2: 98, heartRate: 72, bp: "120/80" }
        ];

        const trendData = (patient.vitals && patient.vitals.length > 0)
            ? patient.vitals.map(v => ({
                date: new Date(v.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                weight: v.weight || 68.5,
                spo2: v.spo2 || 98,
                heartRate: v.heartRate || 72,
                bp: v.bloodPressure || "120/80"
            }))
            : defaultTrendData;

        // Current latest vitals
        const latestVitals = {
            weight: patient.vitals?.length ? patient.vitals[patient.vitals.length - 1].weight : 68.5,
            spo2: patient.vitals?.length ? patient.vitals[patient.vitals.length - 1].spo2 : 98,
            heartRate: patient.vitals?.length ? patient.vitals[patient.vitals.length - 1].heartRate : 72,
            bloodPressure: patient.vitals?.length ? patient.vitals[patient.vitals.length - 1].bloodPressure : "120/80",
            lastRecorded: "04 Sep 2026, 09:30 AM"
        };

        // CT Follow-up schedule
        const ctFollowUps = [
            {
                date: "10 Aug 2026",
                modality: "High-Resolution Chest CT (LIDC-IDRI)",
                hospital: patient.hospital || "Apollo Cancer Centre",
                findings: "14mm solid nodule in Right Upper Lobe (Posterior Segment). Initial baseline.",
                status: "Completed",
                doctor: patient.doctor?.name || "Dr. Priya Raman"
            },
            {
                date: "20 Sep 2026",
                modality: "Surveillance Low-Dose Chest CT (Post-Op)",
                hospital: patient.hospital || "Apollo Cancer Centre",
                findings: "Surveillance imaging to evaluate post-surgical lung parenchyma and surgical bed margin.",
                status: "Scheduled",
                doctor: patient.doctor?.name || "Dr. Priya Raman"
            },
            {
                date: "15 Dec 2026",
                modality: "6-Month Follow-up Chest CT",
                hospital: patient.hospital || "Apollo Cancer Centre",
                findings: "Quarterly longitudinal oncological monitoring.",
                status: "Planned",
                doctor: patient.doctor?.name || "Dr. Priya Raman"
            }
        ];

        const twinState = {
            isDoctor: false,
            patient,
            latestVitals,
            vitalsHistory: trendData,
            symptoms: patient.symptoms || [],
            medications: patient.medications || [],
            ctFollowUps,
            reports,
            treatments,
            summary: {
                patientId: patient.patientIdString || "PT20260045",
                doctorName: patient.doctor?.name || "Dr. Priya Raman",
                hospital: patient.hospital || "Apollo Cancer Centre",
                diagnosisStatus: patient.diagnosisStatus || "Under Observation",
                treatmentStatus: patient.treatmentStatus || "Follow-up",
                activeReportsCount: reports.length,
                currentStage: patient.cancerStage || "Stage I (T1b N0 M0)",
                primaryDiagnosis: patient.cancerType || "Suspicious Pulmonary Nodule"
            }
        };

        res.status(200).json(twinState);


    } catch (error) {
        console.error("Digital Twin Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// GET PATIENT DIGITAL TWIN FOR DOCTOR VIEW BY PATIENT ID
// ======================================================
exports.getPatientDigitalTwinForDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user._id });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor profile not found" });
        }

        const patient = await Patient.findOne({ _id: req.params.patientId, doctor: doctor._id })
            .populate("user", "name email role")
            .populate("doctor", "specialization qualification hospital experience");

        if (!patient) {
            return res.status(404).json({ message: "Patient not found or not assigned to this doctor" });
        }

        const reports = await MedicalReport.find({ patient: patient._id }).sort({ createdAt: -1 });
        const prediction = await Prediction.findOne({ patient: patient._id }).sort({ createdAt: -1 });
        const predictionsHistory = await Prediction.find({ patient: patient._id }).sort({ createdAt: -1 });
        const treatments = await Treatment.find({ patient: patient._id }).sort({ createdAt: -1 });
        const progress = await Progress.find({ patient: patient._id }).sort({ createdAt: 1 });

        res.status(200).json({
            isDoctor: true,
            doctor,
            patient,
            latestPrediction: prediction || null,
            predictionsHistory,
            reports,
            treatments,
            progress,
            summary: {
                activeReportsCount: reports.length,
                currentStage: patient.cancerStage || "Stage not yet determined",
                primaryDiagnosis: patient.cancerType || "Not yet recorded",
                riskLevel: prediction ? prediction.riskLevel : null,
                totalScore: prediction ? prediction.totalScore : null,
                riskScore: prediction ? prediction.cancerRisk : null,
                latestTreatment: treatments.length > 0 ? (treatments[0].treatmentType || treatments[0].treatmentName) : "Not yet recorded"
            }
        });

    } catch (error) {
        console.error("Doctor Digital Twin Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// LOG PATIENT SYMPTOM
// ======================================================
exports.logSymptom = async (req, res) => {
    try {
        const { symptom, severity, notes } = req.body;
        if (!symptom) {
            return res.status(400).json({ message: "Symptom description is required" });
        }

        const patient = await Patient.findOne({ user: req.user._id });
        if (!patient) {
            return res.status(404).json({ message: "Patient profile not found" });
        }

        patient.symptoms.push({
            symptom,
            severity: severity ? Number(severity) : 5,
            notes: notes || "",
            loggedAt: new Date()
        });

        await patient.save();

        res.status(201).json({
            message: "Symptom logged successfully to digital twin",
            symptoms: patient.symptoms
        });
    } catch (error) {
        console.error("Log Symptom Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// LOG PATIENT VITALS
// ======================================================
exports.logVitals = async (req, res) => {
    try {
        const { weight, spo2, heartRate, bloodPressure } = req.body;
        const patient = await Patient.findOne({ user: req.user._id });
        if (!patient) {
            return res.status(404).json({ message: "Patient profile not found" });
        }

        patient.vitals.push({
            weight: weight ? Number(weight) : undefined,
            spo2: spo2 ? Number(spo2) : undefined,
            heartRate: heartRate ? Number(heartRate) : undefined,
            bloodPressure: bloodPressure || undefined,
            recordedAt: new Date()
        });

        await patient.save();

        res.status(201).json({
            message: "Vitals recorded successfully",
            vitals: patient.vitals
        });
    } catch (error) {
        console.error("Log Vitals Error:", error);
        res.status(500).json({ message: error.message });
    }
};

