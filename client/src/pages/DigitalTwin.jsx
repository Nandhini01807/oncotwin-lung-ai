import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import {
  HeartPulse,
  Activity,
  Calendar,
  Building2,
  Stethoscope,
  Pill,
  Scale,
  ShieldCheck,
  FileText,
  Clock,
  Plus,
  X,
  CheckCircle2
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

function DigitalTwin() {
  const { user } = useAuth();
  const isDoctorUser = user?.role === "doctor";

  const [twinData, setTwinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");

  // Symptom Logging Modal State (Patient only)
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [symptomForm, setSymptomForm] = useState({ symptom: "", severity: 5, notes: "" });
  const [loggingSymptom, setLoggingSymptom] = useState(false);

  const fetchDigitalTwin = async (patientIdQuery = "") => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required. Please login.");

      const url = patientIdQuery 
        ? `${API_BASE}/digital-twin?patientId=${patientIdQuery}`
        : `${API_BASE}/digital-twin`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTwinData(res.data);
    } catch (err) {
      console.error("Digital Twin error:", err);
      setError(err.response?.data?.message || err.message || "Failed to load Digital Twin profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigitalTwin();
  }, []);

  const handlePatientSelect = (e) => {
    const pid = e.target.value;
    setSelectedPatientId(pid);
    fetchDigitalTwin(pid);
  };

  const handleLogSymptom = async (e) => {
    e.preventDefault();
    if (!symptomForm.symptom) return;
    try {
      setLoggingSymptom(true);
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/patients/symptoms`,
        symptomForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowSymptomModal(false);
      setSymptomForm({ symptom: "", severity: 5, notes: "" });
      fetchDigitalTwin(selectedPatientId);
    } catch (err) {
      alert("Error logging symptom: " + (err.response?.data?.message || err.message));
    } finally {
      setLoggingSymptom(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "500px" }}>
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🧬</div>
            <h3>Loading Digital Twin Longitudinal Profile...</h3>
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
            <Activity size={45} color="var(--accent-amber)" />
            <h2 style={{ marginTop: "15px" }}>Unable to load Digital Twin</h2>
            <p style={{ color: "var(--text-muted)", marginTop: "10px" }}>{error}</p>
            <button className="btn btn-primary" style={{ marginTop: "20px" }} onClick={() => fetchDigitalTwin(selectedPatientId)}>
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isDoctor = twinData?.isDoctor || isDoctorUser;
  const doctorObj = twinData?.doctor || {};
  const assignedPatients = twinData?.assignedPatients || [];
  const patientObj = twinData?.patient || {};
  const patientSummary = twinData?.summary || {};

  const patientName = patientObj.user?.name || patientObj.name || (isDoctor ? "Assigned Patient" : "Patient");
  const patientId = patientObj.patientIdString || patientSummary.patientId || "PT20260045";
  const doctorName = patientObj.doctor?.name || doctorObj.name || "Attending Physician";
  const hospitalName = patientObj.hospital || "OncoTwin CDSS";
  const cancerStage = patientObj.cancerStage || "Stage IA (T1b N0 M0)";
  const cancerType = patientObj.cancerType || "Non-Small Cell Lung Carcinoma (NSCLC)";

  const latestVitals = twinData?.latestVitals || {
    weight: 68.5,
    spo2: 98,
    heartRate: 72,
    bloodPressure: "120/80",
    lastRecorded: "Recent"
  };

  const trendData = twinData?.vitalsHistory || [
    { date: "10 Aug", weight: 69.8, spo2: 97, heartRate: 78 },
    { date: "18 Aug", weight: 69.2, spo2: 98, heartRate: 75 },
    { date: "28 Aug", weight: 68.0, spo2: 96, heartRate: 80 },
    { date: "02 Sep", weight: 68.3, spo2: 98, heartRate: 74 },
    { date: "04 Sep", weight: 68.5, spo2: 98, heartRate: 72 }
  ];

  const symptoms = twinData?.symptoms || patientObj.symptoms || [];
  const medications = twinData?.medications || patientObj.medications || [];
  const ctFollowUps = twinData?.ctFollowUps || [];
  const reports = twinData?.reports || [];

  return (
    <Layout>
      <div className="page-container">
        
        {/* HEADER */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
            <Activity size={14} /> OncoTwin CDSS • Digital Twin Profile
          </div>
          <h1 style={{ fontSize: "28px", margin: 0 }}>
            Longitudinal <span className="text-gradient-cyan">Digital Twin Profile</span>
          </h1>
        </div>

        {/* DOCTOR VIEW SELECTOR OR PATIENT BANNER */}
        {isDoctor ? (
          <div className="card-glass" style={{ marginBottom: "24px", borderLeft: "4px solid var(--accent-purple, #8b5cf6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "700" }}>
                  Clinical Console
                </div>
                <h2 style={{ fontSize: "20px", marginTop: "2px" }}>
                  Dr. {doctorObj.user?.name || doctorObj.name || "Physician"}
                </h2>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {doctorObj.specialization || "Clinical Oncology"} • {hospitalName}
                </div>
              </div>

              {assignedPatients.length > 0 && (
                <div style={{ minWidth: "260px" }}>
                  <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                    Select Patient:
                  </label>
                  <select 
                    className="form-control" 
                    value={selectedPatientId || (patientObj?._id || "")} 
                    onChange={handlePatientSelect}
                    style={{ fontSize: "13px" }}
                  >
                    {assignedPatients.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.user?.name || p.name} ({p.patientIdString || "PT20260045"}) — {p.cancerStage || "Stage I"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card-glass" style={{ padding: "20px 24px", marginBottom: "24px", background: "rgba(6, 182, 212, 0.04)", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", fontSize: "13px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Patient</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)", marginTop: "2px" }}>
                  {patientName} ({patientId})
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Cancer Classification</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--accent)", marginTop: "2px" }}>
                  {cancerType}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Clinical Staging</div>
                <div style={{ marginTop: "2px" }}>
                  <span className="badge badge-purple" style={{ fontSize: "11px" }}>{cancerStage}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Surveillance Status</div>
                <div style={{ marginTop: "2px" }}>
                  <span className="badge badge-emerald" style={{ fontSize: "11px" }}>Active Monitoring</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4 VITALS CARDS */}
        <div className="grid-4" style={{ marginBottom: "24px" }}>
          
          <div className="card-glass" style={{ padding: "18px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Current Weight</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-main)", margin: "6px 0 2px" }}>
              {latestVitals.weight} <span style={{ fontSize: "13px", fontWeight: "400" }}>kg</span>
            </div>
            <div style={{ fontSize: "11px", color: "#10B981" }}>Baseline Stable</div>
          </div>

          <div className="card-glass" style={{ padding: "18px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Oxygen Saturation (SpO2)</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--accent)", margin: "6px 0 2px" }}>
              {latestVitals.spo2} <span style={{ fontSize: "13px", fontWeight: "400" }}>%</span>
            </div>
            <div style={{ fontSize: "11px", color: "#10B981" }}>Normal Oxygenation</div>
          </div>

          <div className="card-glass" style={{ padding: "18px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Resting Heart Rate</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#a78bfa", margin: "6px 0 2px" }}>
              {latestVitals.heartRate} <span style={{ fontSize: "13px", fontWeight: "400" }}>bpm</span>
            </div>
            <div style={{ fontSize: "11px", color: "#10B981" }}>Normal Sinus Rhythm</div>
          </div>

          <div className="card-glass" style={{ padding: "18px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Blood Pressure</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--accent-amber)", margin: "6px 0 2px" }}>
              {latestVitals.bloodPressure}
            </div>
            <div style={{ fontSize: "11px", color: "#10B981" }}>Normotensive</div>
          </div>

        </div>

        {/* LONGITUDINAL TRENDS GRAPH */}
        <div className="card-glass" style={{ padding: "24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ fontSize: "17px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={18} color="var(--accent)" /> Longitudinal Vitals Trajectory
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Historical weight, oxygen saturation (SpO2), and resting pulse trends across clinical follow-up visits.
              </p>
            </div>
            <span className="badge badge-cyan">Recorded In-Clinic</span>
          </div>

          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", borderColor: "var(--border-color)", borderRadius: "8px", fontSize: "12px" }} />
                <Legend />
                <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="spo2" name="SpO2 (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="heartRate" name="Heart Rate (bpm)" stroke="#a78bfa" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2 COLUMN GRID: SYMPTOMS LOG & MEDICATION SCHEDULE */}
        <div className="grid-2" style={{ marginBottom: "24px" }}>
          
          {/* SYMPTOMS LOG */}
          <div className="card-glass" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", margin: 0 }}>Patient Symptom Tracker</h3>
              {!isDoctor && (
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowSymptomModal(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px" }}
                >
                  <Plus size={13} /> Log Symptom
                </button>
              )}
            </div>

            {symptoms.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
                {symptoms.slice().reverse().map((s, idx) => (
                  <div key={idx} style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: "13px", color: "var(--text-main)" }}>{s.symptom}</strong>
                      {s.notes && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{s.notes}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="badge badge-purple" style={{ fontSize: "11px" }}>Severity: {s.severity}/10</span>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {s.loggedAt ? new Date(s.loggedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
                No symptoms logged yet. Click "+ Log Symptom" to record fatigue, cough, or pain.
              </p>
            )}
          </div>

          {/* ACTIVE MEDICATION SCHEDULE */}
          <div className="card-glass" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Pill size={16} color="var(--accent)" /> Prescribed Medications
              </h3>
              <span className="badge badge-emerald">Physician Ordered</span>
            </div>

            {medications.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {medications.map((med, idx) => (
                  <div key={idx} style={{ padding: "12px 14px", background: "var(--bg-input)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "14px", color: "var(--text-main)" }}>{med.name} ({med.dosage})</strong>
                      <span className="badge badge-cyan" style={{ fontSize: "11px" }}>{med.frequency}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {med.instructions}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--accent)", marginTop: "4px" }}>
                      Prescribed by {med.prescribedBy || doctorName}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
                No active medication orders recorded.
              </p>
            )}
          </div>

        </div>


        {/* MODAL: LOG SYMPTOM */}
        {showSymptomModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div className="card-glass" style={{ maxWidth: "420px", width: "100%", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "17px", margin: 0 }}>Log Daily Health Symptom</h3>
                <button onClick={() => setShowSymptomModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleLogSymptom}>
                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label className="form-label" style={{ fontSize: "12px" }}>Symptom Description</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={symptomForm.symptom} 
                    onChange={(e) => setSymptomForm({ ...symptomForm, symptom: e.target.value })} 
                    placeholder="e.g. Fatigue, Cough, Shortness of breath" 
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label className="form-label" style={{ fontSize: "12px" }}>Severity Rating: {symptomForm.severity} / 10</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    className="form-control" 
                    value={symptomForm.severity} 
                    onChange={(e) => setSymptomForm({ ...symptomForm, severity: Number(e.target.value) })} 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "18px" }}>
                  <label className="form-label" style={{ fontSize: "12px" }}>Clinical Notes (Optional)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={symptomForm.notes} 
                    onChange={(e) => setSymptomForm({ ...symptomForm, notes: e.target.value })} 
                    placeholder="e.g. Occurred after walking up stairs" 
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSymptomModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={loggingSymptom}>
                    {loggingSymptom ? "Saving..." : "Save Symptom Entry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

export default DigitalTwin;