const Appointment = require("../models/Appointment");
const Patient = require("../models/patient");
const Doctor = require("../models/Doctor");
const { createNotification } = require("./notificationController");

// ======================================================
// CREATE APPOINTMENT REQUEST (Patient Only)
// ======================================================
exports.createAppointment = async (req, res) => {
  try {
    const { requestedDate, reason, doctorId, timeString, notes } = req.body;

    if (!requestedDate || !reason) {
      return res.status(400).json({ message: "Requested date and reason are required" });
    }

    const patient = await Patient.findOne({ user: req.user._id }).populate("user", "name email");
    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    let targetDoctorId = doctorId || patient.doctor;

    if (!targetDoctorId) {
      const anyDoctor = await Doctor.findOne();
      if (anyDoctor) {
        targetDoctorId = anyDoctor._id;
      }
    }

    if (!targetDoctorId) {
      return res.status(400).json({
        message: "No physician is available in the CDSS system. Please contact the administrator."
      });
    }

    const doctor = await Doctor.findById(targetDoctorId).populate("user", "name email");
    if (!doctor) {
      return res.status(404).json({ message: "Assigned doctor not found" });
    }

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      requestedDate: new Date(requestedDate),
      timeString: timeString || "10:30 AM",
      reason,
      notes: notes || "",
      status: "Pending"
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate({
        path: "doctor",
        populate: { path: "user", select: "name email" }
      })
      .populate({
        path: "patient",
        populate: { path: "user", select: "name email" }
      });

    // Notify Doctor
    if (doctor.user && doctor.user._id) {
      const patientName = patient.user?.name || "A patient";
      const formattedDate = new Date(requestedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      await createNotification({
        recipient: doctor.user._id,
        type: "appointment_requested",
        message: `${patientName} requested an appointment for ${formattedDate} (${reason}).`,
        relatedId: appointment._id
      });
    }

    res.status(201).json({
      message: "Appointment request submitted successfully",
      appointment: populatedAppointment
    });

  } catch (error) {
    console.error("Create Appointment Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ======================================================
// GET LOGGED-IN PATIENT'S APPOINTMENTS
// ======================================================
exports.getPatientAppointments = async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    const appointments = await Appointment.find({ patient: patient._id })
      .populate({
        path: "doctor",
        populate: { path: "user", select: "name email" }
      })
      .sort({ requestedDate: -1 });

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Get Patient Appointments Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ======================================================
// GET DOCTOR'S APPOINTMENTS
// ======================================================
exports.getDoctorAppointments = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    const appointments = await Appointment.find({ doctor: doctor._id })
      .populate({
        path: "patient",
        populate: { path: "user", select: "name email" }
      })
      .sort({ requestedDate: -1 });

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Get Doctor Appointments Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ======================================================
// UPDATE APPOINTMENT STATUS (Doctor Only)
// ======================================================
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, doctorNotes } = req.body;

    const doctor = await Doctor.findOne({ user: req.user._id }).populate("user", "name");
    if (!doctor) {
      return res.status(403).json({ message: "Only doctors can update appointment statuses" });
    }

    const appointment = await Appointment.findOne({ _id: id, doctor: doctor._id })
      .populate({
        path: "patient",
        populate: { path: "user", select: "name email" }
      });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found or not assigned to you" });
    }

    if (status) appointment.status = status;
    if (doctorNotes !== undefined) appointment.doctorNotes = doctorNotes;

    await appointment.save();

    // Notify Patient
    if (appointment.patient && appointment.patient.user && appointment.patient.user._id) {
      const doctorName = doctor.user?.name || "Your oncologist";
      const formattedDate = new Date(appointment.requestedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      await createNotification({
        recipient: appointment.patient.user._id,
        type: "appointment_updated",
        message: `Your appointment for ${formattedDate} was marked '${status}' by Dr. ${doctorName}.${doctorNotes ? ` Notes: "${doctorNotes}"` : ""}`,
        relatedId: appointment._id
      });
    }

    // Record Audit Log
    try {
      const { logAction } = require("./auditController");
      logAction({
        userId: req.user._id,
        role: "doctor",
        action: "UPDATE_APPOINTMENT_STATUS",
        patientId: appointment.patient?._id,
        details: `Appointment status updated to '${status}'${doctorNotes ? `: "${doctorNotes}"` : ""}`
      });
    } catch (auditErr) {
      console.warn("Audit log warning:", auditErr.message);
    }

    res.status(200).json({
      message: `Appointment marked as ${status}`,
      appointment
    });

  } catch (error) {
    console.error("Update Appointment Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ======================================================
// CANCEL APPOINTMENT (Patient Only)
// ======================================================
exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    const appointment = await Appointment.findOne({ _id: id, patient: patient._id });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.status = "Cancelled";
    await appointment.save();

    res.status(200).json({ message: "Appointment cancelled successfully", appointment });
  } catch (error) {
    console.error("Cancel Appointment Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ======================================================
// RESCHEDULE APPOINTMENT (Patient Only)
// ======================================================
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestedDate, timeString, reason } = req.body;

    if (!requestedDate) {
      return res.status(400).json({ message: "New requested date is required for rescheduling" });
    }

    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    const appointment = await Appointment.findOne({ _id: id, patient: patient._id })
      .populate({
        path: "doctor",
        populate: { path: "user", select: "name email" }
      });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.requestedDate = new Date(requestedDate);
    if (timeString) appointment.timeString = timeString;
    if (reason) appointment.reason = reason;
    appointment.status = "Pending";
    await appointment.save();

    // Notify Doctor of Reschedule
    if (appointment.doctor && appointment.doctor.user && appointment.doctor.user._id) {
      const pName = req.user.name || "Patient";
      const formattedDate = new Date(requestedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      await createNotification({
        recipient: appointment.doctor.user._id,
        type: "appointment_requested",
        message: `${pName} requested to reschedule appointment to ${formattedDate} (${timeString || ""}).`,
        relatedId: appointment._id
      });
    }

    res.status(200).json({ message: "Appointment rescheduled successfully", appointment });
  } catch (error) {
    console.error("Reschedule Appointment Error:", error);
    res.status(500).json({ message: error.message });
  }
};

