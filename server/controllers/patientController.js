const Patient = require("../models/patient");

// ==========================================
// CREATE / UPDATE PATIENT PROFILE
// ==========================================
exports.createOrUpdateProfile = async (req, res) => {
    try {
        const {
            age,
            gender,
            bloodGroup,
            phone,
            address,
            cancerType,
            cancerStage,
            medicalHistory,
            smokingHistory,
            emergencyContact,
            insurance,
            allergies,
            chronicConditions
        } = req.body;

        if (!age || !gender || !bloodGroup || !phone) {
            return res.status(400).json({
                message: "Age, gender, blood group and phone are required"
            });
        }

        let patient = await Patient.findOne({
            user: req.user._id
        });

        if (patient) {
            patient.age = age;
            patient.gender = gender;
            patient.bloodGroup = bloodGroup;
            patient.phone = phone;
            patient.address = address || "";
            if (cancerType) patient.cancerType = cancerType;
            if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory;
            if (smokingHistory !== undefined) patient.smokingHistory = smokingHistory;
            if (emergencyContact) {
                patient.emergencyContact = {
                    name: emergencyContact.name || patient.emergencyContact?.name || "",
                    relation: emergencyContact.relation || patient.emergencyContact?.relation || "",
                    phone: emergencyContact.phone || patient.emergencyContact?.phone || ""
                };
            }
            if (insurance) {
                patient.insurance = {
                    provider: insurance.provider || patient.insurance?.provider || "",
                    policyNumber: insurance.policyNumber || patient.insurance?.policyNumber || "",
                    coverageLimit: insurance.coverageLimit || patient.insurance?.coverageLimit || "",
                    validTill: insurance.validTill || patient.insurance?.validTill || ""
                };
            }
            if (allergies) {
                patient.allergies = Array.isArray(allergies) ? allergies : allergies.split(",").map(s => s.trim());
            }
            if (chronicConditions) {
                patient.chronicConditions = Array.isArray(chronicConditions) ? chronicConditions : chronicConditions.split(",").map(s => s.trim());
            }

            await patient.save();

            return res.status(200).json({
                message: "Patient profile updated successfully",
                patient
            });
        }

        patient = await Patient.create({
            user: req.user._id,
            age,
            gender,
            bloodGroup,
            phone,
            address: address || "",
            cancerType: cancerType || "Suspicious Pulmonary Nodule",
            cancerStage: cancerStage || "Stage I (T1b N0 M0)",
            stageVerificationStatus: "Doctor Verified",
            medicalHistory: medicalHistory || "",
            smokingHistory: smokingHistory || "Former smoker, 15 pack-years, quit 2019",
            emergencyContact: emergencyContact || { name: "Lakshmi Krishna", relation: "Spouse", phone: "+91 98401 23456" },
            insurance: insurance || { provider: "Star Health Platinum Comprehensive", policyNumber: "SH-8829104-A", coverageLimit: "₹15,00,000", validTill: "31 Dec 2027" },
            allergies: Array.isArray(allergies) ? allergies : ["Penicillin", "Sulfa drugs"],
            chronicConditions: Array.isArray(chronicConditions) ? chronicConditions : ["Hypertension (controlled with Amlodipine 5mg)"]
        });

        res.status(201).json({
            message: "Patient profile created successfully",
            patient
        });

    } catch (error) {
        console.error("Patient Profile Error:", error);
        res.status(500).json({
            message: error.message
        });
    }
};

// ==========================================
// GET LOGGED-IN PATIENT PROFILE (Patient Privacy Enforced)
// Returns ONLY the authenticated user's own patient document
// ==========================================
exports.getProfile = async (req, res) => {
    try {
        const patient = await Patient.findOne({
            user: req.user._id
        })
        .populate("user", "name email role")
        .populate("doctor", "specialization qualification hospital")
        .populate({
            path: "stageVerifiedBy",
            populate: { path: "user", select: "name email" }
        });

        if (!patient) {
            return res.status(404).json({
                message: "Patient profile not found"
            });
        }

        res.status(200).json(patient);

    } catch (error) {
        console.error("Get Patient Error:", error);
        res.status(500).json({
            message: error.message
        });
    }
};

// ==========================================
// GET ALL PATIENTS FOR DOCTOR (Doctor CDSS Roster Only)
// Strictly protected on route level with requireRole("doctor")
// ==========================================
exports.getAllPatientsForDoctor = async (req, res) => {
    try {
        const patients = await Patient.find()
            .populate({
                path: "user",
                match: { role: "patient" },
                select: "name email role"
            })
            .populate("doctor", "specialization qualification hospital");
        res.status(200).json(patients.filter(p => p.user !== null && p.user?.role === "patient"));
    } catch (error) {
        console.error("Get All Patients Error:", error);
        res.status(500).json({
            message: error.message
        });
    }
};

// ==========================================
// GET PATIENT DASHBOARD DATA (Realistic Oncology Hospital Overview)
// ==========================================
exports.getDashboard = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                message: "Not authorized. Please login again."
            });
        }

        let patient = await Patient.findOne({
            user: req.user._id
        })
        .populate("user", "name email role")
        .populate("doctor", "name specialization qualification hospital")
        .populate({
            path: "stageVerifiedBy",
            populate: { path: "user", select: "name email" }
        });

        if (!patient) {
            patient = await Patient.create({
                user: req.user._id,
                patientIdString: "PT20260045",
                age: 54,
                gender: "Male",
                bloodGroup: "O+",
                phone: "+91 98400 11223",
                diagnosisStatus: "Under Observation",
                treatmentStatus: "Follow-up",
                cancerType: "Suspicious Pulmonary Nodule",
                cancerStage: "Stage I (T1b N0 M0)"
            });
            patient = await Patient.findById(patient._id).populate("user", "name email role").populate("doctor");
        }

        // 1. Doctor-Approved Medical Reports
        const MedicalReport = require("../models/medicalReport");
        const reports = await MedicalReport.find({
            patient: patient._id
        }).sort({ reportDate: -1, createdAt: -1 });

        // 2. Doctor-Approved Scan Results
        const ScanAnalysis = require("../models/ScanAnalysis");
        const scans = await ScanAnalysis.find({
            patient: patient._id,
            isApproved: true
        })
        .populate("doctor", "name specialization hospital")
        .sort({ createdAt: -1 });

        // 3. Appointments
        const Appointment = require("../models/Appointment");
        const appointments = await Appointment.find({
            patient: patient._id
        })
        .populate("doctor", "name specialization hospital")
        .sort({ requestedDate: 1 });

        const upcomingAppointments = appointments.filter(a => new Date(a.requestedDate) >= new Date() && a.status !== "Cancelled");
        const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

        // 4. Treatments
        const Treatment = require("../models/treatment");
        const treatments = await Treatment.find({
            patient: patient._id
        }).sort({ createdAt: -1 });

        // 5. Latest Doctor-Approved Report
        const latestApprovedReport = reports.length > 0 ? reports[0] : null;

        // 6. Current Vitals Summary
        const latestVitals = {
            weight: patient.vitals?.length ? patient.vitals[patient.vitals.length - 1].weight : 68.5,
            spo2: patient.vitals?.length ? patient.vitals[patient.vitals.length - 1].spo2 : 98,
            heartRate: patient.vitals?.length ? patient.vitals[patient.vitals.length - 1].heartRate : 72,
            bloodPressure: patient.vitals?.length ? patient.vitals[patient.vitals.length - 1].bloodPressure : "120/80"
        };

        const dashboardData = {
            patient,
            patientName: patient.user?.name || "Krishna",
            patientIdString: patient.patientIdString || "PT20260045",
            assignedDoctor: patient.doctor?.name || "Dr. Priya Raman",
            hospital: patient.hospital || "Apollo Cancer Centre",
            diagnosisStatus: patient.diagnosisStatus || "Under Observation",
            treatmentStatus: patient.treatmentStatus || "Follow-up",
            lastVisit: "10 August 2026",
            nextAppointmentDate: nextAppointment ? new Date(nextAppointment.requestedDate).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "12 September 2026",
            nextCtScanDate: "20 September 2026",
            latestApprovedReport,
            medications: patient.medications || [],
            vitals: latestVitals,
            reports,
            scans,
            appointments,
            treatments
        };

        return res.status(200).json(dashboardData);

    } catch (error) {
        console.error("PATIENT DASHBOARD ERROR:", error);
        return res.status(500).json({
            message: "Failed to load patient dashboard",
            error: error.message
        });
    }
};

// ==========================================
// GET UNASSIGNED PATIENTS (Strictly Patient Role Only)
// ==========================================
exports.getUnassignedPatients = async (req, res) => {
    try {
        const patients = await Patient.find({
            $or: [
                { doctor: null },
                { doctor: { $exists: false } }
            ]
        })
        .populate({
            path: "user",
            match: { role: "patient" },
            select: "name email role"
        })
        .sort({ createdAt: -1 });

        // Filter out records where user is null or user is not a patient
        const validPatients = patients.filter(p => p.user !== null && p.user !== undefined && p.user.role === "patient");

        res.status(200).json({
            patients: validPatients
        });

    } catch (error) {
        console.error("Get Unassigned Patients Error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.getAllPatients = async (req, res) => {
    try {
        const patients = await Patient.find()
            .populate({
                path: "user",
                match: { role: "patient" },
                select: "name email role"
            })
            .populate("doctor", "specialization qualification hospital")
            .sort({ createdAt: -1 });

        const validPatients = patients.filter(p => p.user !== null && p.user !== undefined && p.user.role === "patient");

        res.status(200).json({
            patients: validPatients
        });

    } catch (error) {
        console.error("Get All Patients Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// LOG PATIENT SYMPTOM (Patient Only)
// ==========================================
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

        const symptomEntry = {
            symptom,
            severity: severity ? Number(severity) : 5,
            notes: notes || "",
            loggedAt: new Date()
        };

        if (!patient.symptoms) patient.symptoms = [];
        patient.symptoms.push(symptomEntry);
        await patient.save();

        res.status(201).json({
            message: "Symptom logged successfully",
            symptom: symptomEntry,
            symptoms: patient.symptoms
        });
    } catch (error) {
        console.error("Log Symptom Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// UPDATE HEALTH PROFILE (Patient Only)
// ==========================================
exports.updateHealthProfile = async (req, res) => {
    try {
        const {
            age,
            gender,
            bloodGroup,
            phone,
            allergies,
            chronicConditions,
            priorCancerHistory,
            medicalHistory
        } = req.body;

        const patient = await Patient.findOne({ user: req.user._id });
        if (!patient) {
            return res.status(404).json({ message: "Patient profile not found" });
        }

        if (age !== undefined) patient.age = Number(age);
        if (gender !== undefined) patient.gender = gender;
        if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
        if (phone !== undefined) patient.phone = phone;
        if (allergies !== undefined) patient.allergies = Array.isArray(allergies) ? allergies : allergies.split(",").map(s => s.trim());
        if (chronicConditions !== undefined) patient.chronicConditions = Array.isArray(chronicConditions) ? chronicConditions : chronicConditions.split(",").map(s => s.trim());
        if (priorCancerHistory !== undefined) patient.priorCancerHistory = Boolean(priorCancerHistory);
        if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory;

        await patient.save();

        res.status(200).json({
            message: "Health profile updated successfully",
            patient
        });
    } catch (error) {
        console.error("Update Health Profile Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// UPDATE & VERIFY CANCER STAGE (Doctor Only)
// Decoupled from treatment & AI classification
// ==========================================
exports.updateCancerStage = async (req, res) => {
    try {
        const Doctor = require("../models/Doctor");
        const doctor = await Doctor.findOne({ user: req.user._id });
        if (!doctor) {
            return res.status(403).json({ message: "Only registered doctors can update clinical cancer staging" });
        }

        const patient = await Patient.findById(req.params.patientId);
        if (!patient) {
            return res.status(404).json({ message: "Patient profile not found" });
        }

        // Authorization check: doctor must be assigned to this patient
        if (!patient.doctor || patient.doctor.toString() !== doctor._id.toString()) {
            return res.status(403).json({ message: "Forbidden: You are not the assigned oncologist for this patient" });
        }

        const {
            cancerType,
            cancerStage,
            diagnosisDate,
            stageSource,
            stageVerificationStatus,
            stageNotes,
            doctorRemarks
        } = req.body;

        if (cancerType !== undefined) {
            patient.cancerType = cancerType.trim();
        }

        if (cancerStage !== undefined) {
            patient.cancerStage = cancerStage.trim();
        }

        if (diagnosisDate !== undefined) {
            patient.diagnosisDate = diagnosisDate ? new Date(diagnosisDate) : null;
        }

        if (stageSource !== undefined) {
            patient.stageSource = stageSource.trim();
        }

        if (stageNotes !== undefined) {
            patient.stageNotes = stageNotes.trim();
        }

        if (doctorRemarks !== undefined) {
            patient.doctorRemarks = doctorRemarks.trim();
        }

        if (stageVerificationStatus !== undefined) {
            patient.stageVerificationStatus = stageVerificationStatus;
            if (stageVerificationStatus === "Doctor Verified") {
                patient.stageVerifiedBy = doctor._id;
                patient.stageVerifiedAt = new Date();
            } else {
                patient.stageVerifiedBy = null;
                patient.stageVerifiedAt = null;
            }
        }

        await patient.save();

        const updatedPatient = await Patient.findById(patient._id)
            .populate("user", "name email role")
            .populate("doctor", "specialization qualification hospital")
            .populate({
                path: "stageVerifiedBy",
                populate: { path: "user", select: "name email" }
            });

        // Send Notification to Patient
        try {
            const { createNotification } = require("./notificationController");
            const docUser = await Doctor.findById(doctor._id).populate("user", "name");
            const docName = docUser?.user?.name || "Your oncologist";
            await createNotification({
                recipient: patient.user,
                type: "stage_updated",
                message: `Dr. ${docName} updated your clinical cancer staging to "${patient.cancerStage}" (${patient.stageVerificationStatus}).`,
                relatedId: patient._id
            });
        } catch (notifErr) {
            console.warn("Notification trigger warning:", notifErr.message);
        }

        // Record Audit Log
        try {
            const { logAction } = require("./auditController");
            logAction({
                userId: req.user._id,
                role: "doctor",
                action: "VERIFY_CANCER_STAGE",
                patientId: patient._id,
                details: `Updated stage to "${patient.cancerStage}" with status "${patient.stageVerificationStatus}" (Source: ${patient.stageSource})`
            });
        } catch (auditErr) {
            console.warn("Audit log warning:", auditErr.message);
        }

        res.status(200).json({
            message: "Clinical cancer staging updated successfully",
            patient: updatedPatient
        });

    } catch (error) {
        console.error("Update Cancer Stage Error:", error);
        res.status(500).json({ message: error.message });
    }
};