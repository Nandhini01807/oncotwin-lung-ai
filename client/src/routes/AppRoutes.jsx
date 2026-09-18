import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";

import PatientDashboard from "../pages/PatientDashboard";

import DoctorDashboard from "../pages/DoctorDashboard";
import DoctorPatientDetails from "../pages/DoctorPatientDetails";
import AssignPatient from "../pages/AssignPatient";

import DigitalTwin from "../pages/DigitalTwin";
import Profile from "../pages/Profile";
import Reports from "../pages/Reports";
import Appointments from "../pages/Appointments";
import ScanResults from "../pages/ScanResults";

import UploadScan from "../pages/UploadScan";
import ScanResult from "../pages/ScanResult";
import ScanHistory from "../pages/ScanHistory";
import ScanReport from "../pages/ScanReport";

import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ==========================================
            PUBLIC ROUTES
        ========================================== */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />


        {/* ==========================================
            PATIENT DASHBOARD
        ========================================== */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            DOCTOR DASHBOARD
        ========================================== */}

        <Route
          path="/doctor-dashboard"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            DOCTOR - ASSIGN PATIENT
        ========================================== */}

        <Route
          path="/doctor/assign-patient"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <AssignPatient />
            </ProtectedRoute>
          }
        />

        {/* ==========================================
            DOCTOR - PATIENT DETAILS
        ========================================== */}

        <Route
          path="/doctor/patient/:patientId"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <DoctorPatientDetails />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            SCAN RESULTS (DOCTOR APPROVED)
            PATIENT + DOCTOR
        ========================================== */}

        <Route
          path="/scan-results"
          element={
            <ProtectedRoute allowedRoles={["patient", "doctor"]}>
              <ScanResults />
            </ProtectedRoute>
          }
        />




        {/* ==========================================
            DIGITAL TWIN
            PATIENT + DOCTOR
        ========================================== */}

        <Route
          path="/digital-twin"
          element={
            <ProtectedRoute allowedRoles={["patient", "doctor"]}>
              <DigitalTwin />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            MEDICAL REPORTS
            PATIENT + DOCTOR
        ========================================== */}

        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={["patient", "doctor"]}>
              <Reports />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            PROFILE
            PATIENT + DOCTOR
        ========================================== */}

        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["patient", "doctor"]}>
              <Profile />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            DOCTOR DECISION SUPPORT & AI SCAN ANALYSIS
            DOCTOR ONLY
        ========================================== */}

        <Route
          path="/upload-scan"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <UploadScan />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/upload-scan"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <UploadScan />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scan-analysis"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <UploadScan />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scan-result/:id"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <ScanResult />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/verify/:id"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <ScanResult />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scan-history"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <ScanHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/scan-history"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <ScanHistory />
            </ProtectedRoute>
          }
        />

        {/* ==========================================
            APPROVED MEDICAL REPORTS (PATIENT + DOCTOR)
        ========================================== */}

        <Route
          path="/report/:id"
          element={
            <ProtectedRoute allowedRoles={["patient", "doctor"]}>
              <ScanReport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scan-report/:id"
          element={
            <ProtectedRoute allowedRoles={["patient", "doctor"]}>
              <ScanReport />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            APPOINTMENTS
            PATIENT + DOCTOR
        ========================================== */}

        <Route
          path="/appointments"
          element={
            <ProtectedRoute allowedRoles={["patient", "doctor"]}>
              <Appointments />
            </ProtectedRoute>
          }
        />


        {/* ==========================================
            FALLBACK
        ========================================== */}

        <Route
          path="*"
          element={<Home />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;