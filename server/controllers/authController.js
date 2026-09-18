const User = require("../models/user");
const Doctor = require("../models/Doctor");
const Patient = require("../models/patient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ======================================================
// REGISTER USER (PATIENT OR DOCTOR WITH UNIQUE CREDENTIALS)
// ======================================================
exports.register = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            // Patient details
            age,
            gender,
            bloodGroup,
            phone,
            address,
            cancerType,
            cancerStage,
            medicalHistory,
            // Doctor details
            specialization,
            qualification,
            hospital,
            licenseNumber,
            experience
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                message: "User already exists with this email address"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role || "patient"
        });

        // --------------------------------------------------
        // SAVE UNIQUE ROLE DOCUMENT IN MONGODB
        // --------------------------------------------------
        if (user.role === "doctor") {
            await Doctor.create({
                user: user._id,
                specialization: specialization || "Oncology",
                qualification: qualification || "MD Oncology",
                hospital: hospital || "Oncology Medical Center",
                licenseNumber: licenseNumber || `LIC-${Date.now().toString().slice(-6)}`,
                experience: Number(experience || 5),
                phone: phone || ""
            });
            console.log("Doctor unique profile created for:", user.email);
        } else {
            await Patient.create({
                user: user._id,
                age: age !== undefined && age !== null && age !== "" ? Number(age) : null,
                gender: gender || "",
                bloodGroup: bloodGroup || "",
                phone: phone || "",
                address: address || "",
                cancerType: cancerType || "",
                cancerStage: cancerStage || "",
                medicalHistory: medicalHistory || ""
            });
            console.log("Patient unique profile created for:", user.email);
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "Registration successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// LOGIN
// ======================================================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Safety auto-create missing profiles if any
        if (user.role === "doctor") {
            const doctor = await Doctor.findOne({ user: user._id });
            if (!doctor) {
                await Doctor.create({
                    user: user._id,
                    specialization: "Oncology"
                });
            }
        } else {
            const patient = await Patient.findOne({ user: user._id });
            if (!patient) {
                await Patient.create({
                    user: user._id,
                    age: null,
                    gender: "",
                    bloodGroup: "",
                    cancerType: "",
                    cancerStage: ""
                });
            }
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ======================================================
// GET AUTH USER ME
// ======================================================
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};