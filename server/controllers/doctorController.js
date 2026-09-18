const Doctor = require("../models/Doctor");
const Patient = require("../models/patient");
const Prediction = require("../models/prediction");
const Treatment = require("../models/treatment");
const Progress = require("../models/progress");
const MedicalReport = require("../models/medicalReport");
const { logAction } = require("./auditController");

// ======================================================
// GET DOCTOR PROFILE
// ======================================================
exports.getProfile = async (req, res) => {
    try {
        let doctor = await Doctor.findOne({
            user: req.user._id
        }).populate("user", "name email role");

        if (!doctor) {
            doctor = await Doctor.create({
                user: req.user._id,
                specialization: "Oncology"
            });

            doctor = await Doctor.findById(doctor._id).populate("user", "name email role");
        }

        res.status(200).json(doctor);
    } catch (error) {
        console.error("Doctor Profile Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// CREATE / UPDATE DOCTOR PROFILE
// ======================================================
exports.createOrUpdateProfile = async (req, res) => {
    try {
        const {
            specialization,
            qualification,
            phone,
            hospital,
            licenseNumber,
            experience
        } = req.body;

        let doctor = await Doctor.findOne({
            user: req.user._id
        });

        if (doctor) {
            if (specialization !== undefined) doctor.specialization = specialization;
            if (qualification !== undefined) doctor.qualification = qualification;
            if (phone !== undefined) doctor.phone = phone;
            if (hospital !== undefined) doctor.hospital = hospital;
            if (licenseNumber !== undefined) doctor.licenseNumber = licenseNumber;
            if (experience !== undefined) doctor.experience = Number(experience);

            await doctor.save();

            const updatedDoctor = await Doctor.findById(doctor._id).populate("user", "name email role");
            return res.status(200).json({
                message: "Doctor profile updated successfully",
                doctor: updatedDoctor
            });
        }

        doctor = await Doctor.create({
            user: req.user._id,
            specialization: specialization || "Oncology",
            qualification: qualification || "",
            phone: phone || "",
            hospital: hospital || "",
            licenseNumber: licenseNumber || "",
            experience: experience !== undefined ? Number(experience) : 0
        });

        const newDoctor = await Doctor.findById(doctor._id).populate("user", "name email role");
        return res.status(201).json({
            message: "Doctor profile created successfully",
            doctor: newDoctor
        });

    } catch (error) {
        console.error("Create Doctor Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// DOCTOR DASHBOARD
// ======================================================
exports.getDashboard = async (req, res) => {
    try {
        let doctor = await Doctor.findOne({
            user: req.user._id
        });

        if (!doctor) {
            doctor = await Doctor.create({
                user: req.user._id,
                specialization: "Oncology",
                qualification: "",
                phone: "",
                hospital: "",
                licenseNumber: "",
                experience: 0
            });
        }

        doctor = await Doctor.findById(doctor._id).populate("user", "name email role");

        const rawPatients = await Patient.find({
            doctor: doctor._id
        }).populate("user", "name email role").sort({ createdAt: -1 });

        const patientIds = rawPatients.map(p => p._id);

        // Fetch aggregated clinical activity in batch queries (Zero N+1)
        const [allPredictions, allReports, allProgress] = await Promise.all([
            Prediction.find({ patient: { $in: patientIds } }).sort({ createdAt: -1 }),
            MedicalReport.find({ patient: { $in: patientIds } }).sort({ createdAt: -1 }),
            Progress.find({ patient: { $in: patientIds } }).sort({ createdAt: -1 })
        ]);

        // Group by patient ID
        const predMap = {};
        for (const pred of allPredictions) {
            const pId = pred.patient.toString();
            if (!predMap[pId]) {
                predMap[pId] = pred; // first is latest due to sort
            }
        }

        const reportsMap = {};
        for (const rep of allReports) {
            const pId = rep.patient.toString();
            if (!reportsMap[pId]) {
                reportsMap[pId] = { total: 0, unreviewed: 0, latestDate: rep.createdAt || rep.reportDate };
            }
            reportsMap[pId].total++;
            if (!rep.reviewed) {
                reportsMap[pId].unreviewed++;
            }
        }

        const progressMap = {};
        for (const prog of allProgress) {
            const pId = prog.patient.toString();
            if (!progressMap[pId]) {
                progressMap[pId] = prog.date || prog.createdAt;
            }
        }

        const patients = rawPatients.map(patient => {
            const pObj = patient.toObject();
            const pId = patient._id.toString();
            const latestPred = predMap[pId] || null;
            const repSummary = reportsMap[pId] || { total: 0, unreviewed: 0, latestDate: null };
            const progDate = progressMap[pId] || null;

            // Determine latest clinical activity timestamp
            const dates = [
                latestPred ? new Date(latestPred.createdAt) : null,
                repSummary.latestDate ? new Date(repSummary.latestDate) : null,
                progDate ? new Date(progDate) : null,
                new Date(patient.updatedAt || patient.createdAt)
            ].filter(Boolean);

            const lastActivity = dates.length > 0 ? new Date(Math.max(...dates)) : new Date(patient.createdAt);

            return {
                ...pObj,
                latestPrediction: latestPred ? {
                    _id: latestPred._id,
                    riskLevel: latestPred.riskLevel || (latestPred.cancerRisk >= 70 ? "High" : latestPred.cancerRisk >= 40 ? "Moderate" : "Low"),
                    totalScore: latestPred.totalScore || 0,
                    cancerRisk: latestPred.cancerRisk,
                    cancerType: latestPred.cancerType,
                    reviewStatus: latestPred.reviewStatus || "Pending Review",
                    createdAt: latestPred.createdAt
                } : null,
                reportsCount: repSummary.total,
                unreviewedReportsCount: repSummary.unreviewed,
                hasUnreviewedReports: repSummary.unreviewed > 0,
                lastActivity
            };
        });

        const patientCount = patients.length;
        const pendingReviewCount = patients.filter(p => p.hasUnreviewedReports || (p.latestPrediction && p.latestPrediction.reviewStatus === "Pending Review")).length;

        res.status(200).json({
            doctor,
            patients,
            patientCount,
            pendingReviewCount
        });

    } catch (error) {
        console.error("Doctor Dashboard Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// GET SINGLE PATIENT DETAILS
// ======================================================
exports.getPatientDetails = async (req, res) => {
    try {
        let doctor = await Doctor.findOne({
            user: req.user._id
        });

        if (!doctor) {
            doctor = await Doctor.create({
                user: req.user._id,
                specialization: "Oncology"
            });
        }

        let patient = await Patient.findById(req.params.patientId)
            .populate("user", "name email role")
            .populate("doctor", "specialization qualification hospital experience")
            .populate({
                path: "stageVerifiedBy",
                populate: { path: "user", select: "name email" }
            });

        if (!patient) {
            return res.status(404).json({
                message: "Patient record not found in system"
            });
        }

        if (!patient.doctor) {
            patient.doctor = doctor._id;
            await patient.save();
        }

        const prediction = await Prediction.findOne({
            patient: patient._id
        }).sort({ createdAt: -1 });

        const treatments = await Treatment.find({
            patient: patient._id
        }).sort({ createdAt: -1 });

        const progress = await Progress.find({
            patient: patient._id
        }).sort({ createdAt: 1 });

        const reports = await MedicalReport.find({
            patient: patient._id
        }).sort({ createdAt: -1 });

        // Record audit log for doctor viewing patient clinical records
        logAction({
            userId: req.user._id,
            role: "doctor",
            action: "VIEW_PATIENT_RECORD",
            patientId: patient._id,
            details: `Doctor viewed comprehensive clinical profile of patient ${patient.user?.name || patient._id}`
        });

        res.status(200).json({
            patient,
            prediction: prediction || null,
            treatments,
            progress,
            reports
        });

    } catch (error) {
        console.error("Patient Details Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// ASSIGN PATIENT TO DOCTOR
// ======================================================
exports.assignPatient = async (req, res) => {
    try {
        const { patientId } = req.body;

        if (!patientId) {
            return res.status(400).json({
                message: "Patient ID is required"
            });
        }

        let doctor = await Doctor.findOne({
            user: req.user._id
        });

        if (!doctor) {
            doctor = await Doctor.create({
                user: req.user._id,
                specialization: "Oncology"
            });
        }

        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        if (patient.doctor) {
            if (patient.doctor.toString() === doctor._id.toString()) {
                return res.status(400).json({
                    message: "Patient is already assigned to you"
                });
            }
            return res.status(400).json({
                message: "Patient is already assigned to another doctor"
            });
        }

        patient.doctor = doctor._id;
        await patient.save();

        const updatedPatient = await Patient.findById(patient._id)
            .populate("user", "name email role")
            .populate("doctor", "specialization qualification hospital experience");

        res.status(200).json({
            message: "Patient assigned successfully",
            patient: updatedPatient
        });

    } catch (error) {
        console.error("Assign Patient Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// GET PATIENT AI PREDICTION FOR DOCTOR
// ======================================================
exports.getPatientPrediction = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            user: req.user._id
        });

        if (!doctor) {
            return res.status(404).json({
                message: "Doctor profile not found"
            });
        }

        const patient = await Patient.findOne({
            _id: req.params.patientId,
            doctor: doctor._id
        });

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found or not assigned to this doctor"
            });
        }

        const prediction = await Prediction.findOne({
            patient: patient._id
        }).sort({ createdAt: -1 });

        if (!prediction) {
            return res.status(404).json({
                message: "No AI prediction found for this patient"
            });
        }

        res.status(200).json({ prediction });

    } catch (error) {
        console.error("Doctor Prediction Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// REMOVE PATIENT FROM DOCTOR
// ======================================================
exports.removePatient = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            user: req.user._id
        });

        if (!doctor) {
            return res.status(404).json({
                message: "Doctor profile not found"
            });
        }

        const patient = await Patient.findOne({
            _id: req.params.patientId,
            doctor: doctor._id
        });

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found or not assigned to this doctor"
            });
        }

        patient.doctor = null;
        await patient.save();

        res.status(200).json({
            message: "Patient removed from doctor successfully"
        });
    } catch (error) {
        console.error("Remove Patient Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// GET ALL DOCTORS (For Patient Appointment Scheduling & Directory)
// ======================================================
exports.getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find()
            .populate("user", "name email role")
            .sort({ createdAt: -1 });

        const formatted = doctors.map(d => ({
            _id: d._id,
            name: d.user?.name || d.name || "Dr. Priya Raman",
            specialization: d.specialization || "Thoracic Oncology",
            qualification: d.qualification || "MD, DM (Medical Oncology)",
            hospital: d.hospital || "Apollo Cancer Centre",
            phone: d.phone || "+91 98401 11222",
            experience: d.experience || 12
        }));

        res.status(200).json(formatted);
    } catch (error) {
        console.error("Get All Doctors Error:", error);
        res.status(500).json({ message: error.message });
    }
};