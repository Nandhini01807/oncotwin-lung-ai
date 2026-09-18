const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const appointmentController = require("../controllers/appointmentController");

// Patient creates an appointment request
router.post(
  "/",
  authMiddleware,
  requireRole("patient"),
  appointmentController.createAppointment
);

// Patient gets own appointments
router.get(
  "/mine",
  authMiddleware,
  requireRole("patient"),
  appointmentController.getPatientAppointments
);

router.get(
  "/my-appointments",
  authMiddleware,
  requireRole("patient"),
  appointmentController.getPatientAppointments
);

router.get(
  "/",
  authMiddleware,
  (req, res, next) => {
    if (req.user.role === "doctor") {
      return appointmentController.getDoctorAppointments(req, res, next);
    }
    return appointmentController.getPatientAppointments(req, res, next);
  }
);

// Patient cancels an appointment
router.patch(
  "/:id/cancel",
  authMiddleware,
  requireRole("patient"),
  appointmentController.cancelAppointment
);

// Patient reschedules an appointment
router.patch(
  "/:id/reschedule",
  authMiddleware,
  requireRole("patient"),
  appointmentController.rescheduleAppointment
);

// Doctor gets assigned patients' appointments
router.get(
  "/doctor",
  authMiddleware,
  requireRole("doctor"),
  appointmentController.getDoctorAppointments
);

// Doctor updates appointment status (accept, reject, complete)
router.patch(
  "/:id/status",
  authMiddleware,
  requireRole("doctor"),
  appointmentController.updateAppointmentStatus
);

module.exports = router;
