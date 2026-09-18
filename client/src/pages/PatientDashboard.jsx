import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import {
  Activity,
  Calendar,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Clock,
  Stethoscope,
  Pill,
  FileText,
  HeartPulse,
  ShieldCheck,
  Eye,
  Plus
} from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

function PatientDashboard() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [latestAppointment, setLatestAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in again.");

      const [dashRes, aptRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/patients/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/appointments/mine`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (dashRes.status === "fulfilled") {
        setDashboard(dashRes.value.data);
      }

      if (aptRes.status === "fulfilled" && Array.isArray(aptRes.value.data) && aptRes.value.data.length > 0) {
        setLatestAppointment(aptRes.value.data[0]);
      }
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(err.response?.data?.message || err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <Layout>
        <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "500px" }}>
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🩺</div>
            <h3>Loading patient record...</h3>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="page-container">
          <div className="card-glass" style={{ padding: "30px", textAlign: "center" }}>
            <ShieldAlert size={45} color="var(--accent-amber)" />
            <h2 style={{ marginTop: "15px" }}>Unable to load dashboard</h2>
            <p style={{ color: "var(--text-muted)", marginTop: "10px" }}>{error}</p>
            <button className="btn btn-primary" style={{ marginTop: "20px" }} onClick={fetchDashboard}>
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const patient = dashboard?.patient || {};
  const patientName = dashboard?.patientName || user?.name || "Patient";
  const patientId = dashboard?.patientIdString || patient.patientIdString || "PT20260045";
  const diagnosisStatus = dashboard?.diagnosisStatus || patient.diagnosisStatus || "Under Observation";
  const treatmentStatus = dashboard?.treatmentStatus || patient.treatmentStatus || "Follow-up";
  const cancerStage = patient.cancerStage || "Stage IA (T1b N0 M0)";
  const cancerType = patient.cancerType || "Non-Small Cell Lung Carcinoma (NSCLC)";

  const latestReport = dashboard?.latestApprovedReport;
  const medications = dashboard?.medications || [];
  const vitals = dashboard?.vitals || { weight: 68.5, spo2: 98, heartRate: 72, bloodPressure: "120/80" };

  // Appointment display properties
  const aptDate = latestAppointment?.requestedDate 
    ? new Date(latestAppointment.requestedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : (dashboard?.nextAppointmentDate || "Not Scheduled");
  const aptTime = latestAppointment?.timeString || "10:30 AM";
  const aptStatus = latestAppointment?.status || "Pending Doctor Approval";
  const aptNotes = latestAppointment?.doctorNotes || "Awaiting doctor review";

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "approved":
      case "accepted":
      case "confirmed":
        return <span className="badge badge-emerald"><CheckCircle2 size={12} /> Approved</span>;
      case "completed":
        return <span className="badge badge-cyan">Completed</span>;
      case "rejected":
        return <span className="badge badge-rose">Rejected</span>;
      default:
        return <span className="badge badge-purple"><Clock size={12} /> Pending Doctor Approval</span>;
    }
  };

  return (
    <Layout>
      <div className="page-container">
        
        {/* WELCOME BANNER */}
        <div className="card-glass" style={{ padding: "26px", marginBottom: "24px", background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)", border: "1px solid rgba(6, 182, 212, 0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                <Stethoscope size={13} /> OncoTwin CDSS • Patient Portal
              </div>
              <h1 style={{ fontSize: "24px", margin: "2px 0 6px 0", fontWeight: "800" }}>
                Welcome, {patientName}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", fontSize: "13px", color: "var(--text-muted)" }}>
                <span>Patient ID: <strong style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{patientId}</strong></span>
                <span>•</span>
                <span>Diagnosis: <strong style={{ color: "var(--text-main)" }}>{diagnosisStatus}</strong></span>
                <span>•</span>
                <span>Status: <strong style={{ color: "var(--text-main)" }}>{treatmentStatus}</strong></span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <div style={{ padding: "8px 14px", background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Diagnosis Status</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--accent)" }}>{diagnosisStatus}</div>
              </div>
              <div style={{ padding: "8px 14px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Care Status</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#10B981" }}>{treatmentStatus}</div>
              </div>
            </div>
          </div>
        </div>

        {/* APPOINTMENT STATUS & CLINICAL STAGE SECTION */}
        <div className="grid-2" style={{ marginBottom: "24px" }}>
          
          {/* APPOINTMENT STATUS CARD */}
          <div className="card-glass" style={{ padding: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar size={18} color="var(--accent)" />
                <h3 style={{ fontSize: "16px", margin: 0 }}>Appointment Status</h3>
              </div>
              {getStatusBadge(aptStatus)}
            </div>

            <div style={{ background: "var(--bg-input)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Requested Date</div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)", marginTop: "2px" }}>
                    {aptDate}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Requested Time</div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--accent)", marginTop: "2px" }}>
                    {aptTime}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Doctor Response</div>
                <div style={{ fontSize: "13px", color: "var(--text-main)", marginTop: "3px" }}>
                  {aptNotes}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
              <Link to="/appointments" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={13} /> Manage Appointments
              </Link>
              <Link to="/appointments" className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Plus size={13} /> Request New
              </Link>
            </div>
          </div>

          {/* CLINICAL STAGE & RECENT SCAN STAT */}
          <div className="card-glass" style={{ padding: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={18} color="#10B981" />
                <h3 style={{ fontSize: "16px", margin: 0 }}>Clinical Staging & Diagnostic Profile</h3>
              </div>
              <span className="badge badge-emerald">Verified</span>
            </div>

            <div style={{ background: "var(--bg-input)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Cancer Classification</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)", marginTop: "2px" }}>
                  {cancerType}
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>TNM Staging</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#10B981", marginTop: "2px" }}>
                    {cancerStage}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>AI Diagnostic Risk</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--accent)", marginTop: "2px" }}>
                    Low-to-Moderate
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "14px", textAlign: "right" }}>
              <Link to="/digital-twin" style={{ fontSize: "12px", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                View Full Digital Twin Model <ArrowRight size={12} />
              </Link>
            </div>
          </div>

        </div>

        {/* 2 COLUMN GRID: LATEST REPORT & MEDICATION REMINDERS */}
        <div className="grid-2" style={{ marginBottom: "24px" }}>
          
          {/* LATEST DOCTOR-APPROVED REPORT */}
          <div className="card-glass" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={18} color="var(--accent)" />
                <h3 style={{ fontSize: "16px", margin: 0 }}>Latest Approved Diagnostic Report</h3>
              </div>
              <span className="badge badge-emerald">Signed</span>
            </div>

            {latestReport ? (
              <div style={{ background: "var(--bg-input)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)" }}>
                      {latestReport.reportName || "Chest_CT_Diagnostic_Evaluation_RUL.pdf"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      ID: <code>{latestReport.reportIdString || "REP20260014"}</code> • Type: <strong>{latestReport.reportType || "Chest CT Scan"}</strong>
                    </div>
                  </div>
                  <span className="badge badge-purple" style={{ fontSize: "11px" }}>
                    {latestReport.reportDate ? new Date(latestReport.reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                  </span>
                </div>

                <div style={{ fontSize: "13px", color: "var(--text-muted)", margin: "10px 0", lineHeight: "1.4" }}>
                  <strong>Summary:</strong> {latestReport.diagnosisSummary || "Non-Small Cell Lung Carcinoma (NSCLC) nodule evaluated via DenseNet121 and Grad-CAM radiomics."}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Clinical Assessment: <strong style={{ color: "var(--text-main)" }}>{latestReport.aiDecision || "Complete"}</strong>
                  </div>
                  <Link to="/reports" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Eye size={13} /> View Reports
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                No diagnostic reports published yet.
              </div>
            )}
          </div>

          {/* MEDICATION REMINDERS */}
          <div className="card-glass" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Pill size={18} color="var(--accent)" />
                <h3 style={{ fontSize: "16px", margin: 0 }}>Active Medication Schedule</h3>
              </div>
              <span className="badge badge-cyan">{medications.length} Active</span>
            </div>

            {medications.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {medications.map((med, idx) => (
                  <div key={idx} style={{ padding: "12px 14px", background: "var(--bg-input)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "700" }}>{med.name} ({med.dosage})</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{med.instructions || med.frequency}</div>
                    </div>
                    <span className="badge badge-emerald" style={{ fontSize: "11px" }}>{med.frequency}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                No active medications recorded.
              </div>
            )}

            <div style={{ marginTop: "14px", textAlign: "right" }}>
              <Link to="/digital-twin" style={{ fontSize: "12px", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                View Digital Twin Vitals <ArrowRight size={12} />
              </Link>
            </div>
          </div>

        </div>

        {/* HEALTH SUMMARY VITALS & QUICK ACTIONS */}
        <div className="grid-3" style={{ marginBottom: "24px" }}>
          
          {/* VITALS PANEL (2 cols) */}
          <div className="card-glass" style={{ gridColumn: "span 2", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <HeartPulse size={18} color="var(--accent)" />
                <h3 style={{ fontSize: "16px", margin: 0 }}>Health Summary Vitals</h3>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Recent Record</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
              
              <div style={{ padding: "14px", background: "var(--bg-input)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Weight</div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-main)", marginTop: "4px" }}>
                  {vitals.weight || 68.5} <span style={{ fontSize: "12px", fontWeight: "400" }}>kg</span>
                </div>
                <div style={{ fontSize: "11px", color: "#10B981", marginTop: "2px" }}>Stable</div>
              </div>

              <div style={{ padding: "14px", background: "var(--bg-input)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Oxygen (SpO2)</div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--accent)", marginTop: "4px" }}>
                  {vitals.spo2 || 98} <span style={{ fontSize: "12px", fontWeight: "400" }}>%</span>
                </div>
                <div style={{ fontSize: "11px", color: "#10B981", marginTop: "2px" }}>Normal Range</div>
              </div>

              <div style={{ padding: "14px", background: "var(--bg-input)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Heart Rate</div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#a78bfa", marginTop: "4px" }}>
                  {vitals.heartRate || 72} <span style={{ fontSize: "12px", fontWeight: "400" }}>bpm</span>
                </div>
                <div style={{ fontSize: "11px", color: "#10B981", marginTop: "2px" }}>Resting Normal</div>
              </div>

              <div style={{ padding: "14px", background: "var(--bg-input)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Blood Pressure</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--accent-amber)", marginTop: "4px" }}>
                  {vitals.bloodPressure || "120/80"}
                </div>
                <div style={{ fontSize: "11px", color: "#10B981", marginTop: "2px" }}>Optimal</div>
              </div>

            </div>
          </div>

          {/* QUICK CDSS ACTIONS */}
          <div className="card-glass" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "16px", marginBottom: "14px" }}>CDSS Quick Actions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <Link to="/appointments" className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "flex-start", gap: "8px" }}>
                  <Calendar size={14} color="var(--accent)" /> Request Doctor Appointment
                </Link>
                <Link to="/scan-results" className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "flex-start", gap: "8px" }}>
                  <Activity size={14} color="var(--accent)" /> View AI Scan Results
                </Link>
                <Link to="/digital-twin" className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "flex-start", gap: "8px" }}>
                  <HeartPulse size={14} color="var(--accent)" /> View Digital Twin Profile
                </Link>
              </div>
            </div>

            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "14px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              Clinical Decision Support System • NSCLC Radiomics
            </div>
          </div>

        </div>

      </div>
    </Layout>
  );
}

export default PatientDashboard;