const Progress = require("../models/progress");
const Patient = require("../models/patient");
const Doctor = require("../models/Doctor");

// ==========================================
// GET PROGRESS
// ==========================================

exports.getProgress = async (req, res) => {
    try {
        let patient = await Patient.findOne({
            user: req.user._id
        });

        if (!patient && req.query.patientId) {
            patient = await Patient.findById(req.query.patientId);
        }

        if (!patient) {
            return res.status(404).json({
                message: "Patient profile not found"
            });
        }

        const progress = await Progress.find({
            patient: patient._id
        }).sort({
            createdAt: -1
        });

        res.status(200).json(progress);

    } catch (error) {
        console.error("Get Progress Error:", error);
        res.status(500).json({
            message: error.message
        });
    }
};

// ==========================================
// CREATE PROGRESS (Doctor or Patient)
// ==========================================

exports.createProgress = async (req, res) => {
    try {
        let targetPatientId = req.body.patientId;

        if (!targetPatientId) {
            const patient = await Patient.findOne({
                user: req.user._id
            });
            if (patient) {
                targetPatientId = patient._id;
            }
        }

        if (!targetPatientId) {
            return res.status(400).json({
                message: "Patient ID is required to log progress observation"
            });
        }

        if (req.user.role === "doctor") {
            const doctor = await Doctor.findOne({ user: req.user._id });
            const assigned = doctor && await Patient.findOne({ _id: targetPatientId, doctor: doctor._id });
            if (!assigned) return res.status(403).json({ message: "Patient is not assigned to this doctor" });
        }

        const progress = await Progress.create({
            patient: targetPatientId,
            doctor: req.user.role === "doctor" ? (await Doctor.findOne({ user: req.user._id }))?._id : null,
            date: req.body.date || new Date(),
            tumorVolume: req.body.tumorVolume !== undefined && req.body.tumorVolume !== "" ? Number(req.body.tumorVolume) : undefined,
            riskIndex: req.body.riskIndex !== undefined && req.body.riskIndex !== "" ? Number(req.body.riskIndex) : undefined,
            notes: req.body.notes || req.body.observations || "",
            doctorNotes: req.body.doctorNotes || req.body.notes || ""
        });

        res.status(201).json({
            message: "Progress observation recorded successfully",
            progress
        });

    } catch (error) {
        console.error("Create Progress Error:", error);
        res.status(500).json({
            message: error.message
        });
    }
};

// ==========================================
// GET PATIENT PROGRESS FOR DOCTOR
// ==========================================

exports.getPatientProgressForDoctor = async (req, res) => {
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

        const progress = await Progress.find({
            patient: patient._id
        }).sort({
            date: -1
        });

        res.status(200).json({
            progress
        });

    } catch (error) {
        console.error("Doctor Get Progress Error:", error);
        res.status(500).json({
            message: "Failed to fetch patient progress",
            error: error.message
        });
    }
};