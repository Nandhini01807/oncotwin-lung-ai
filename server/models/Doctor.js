const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        specialization: {
            type: String,
            default: "Oncology"
        },

        qualification: {
            type: String,
            default: ""
        },

        phone: {
            type: String,
            default: ""
        },

        hospital: {
            type: String,
            default: ""
        },

        licenseNumber: {
            type: String,
            default: ""
        },

        experience: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);