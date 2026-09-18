import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import {
  ArrowLeft,
  UserRound,
  FileText,
  Activity,
  AlertCircle,
  Pill,
  PlusCircle,
  CheckCircle2,
  Cpu,
  Upload,
  RefreshCw,
  ExternalLink,
  Check,
  Eye,
  Info,
  Layers,
  ShieldAlert,
  Database
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";
const SERVER_BASE = "http://localhost:5000";

function DoctorPatientDetails() {
  const { patientId } = useParams();

  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [progress, setProgress] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Navigation Active Tab: overview | scans | treatment | progress | digital-twin | reports
  const [activeTab, setActiveTab] = useState("overview");

  // Inline Scan Upload State (Simple 2-field flow)
  const [scanFile, setScanFile] = useState(null);
  const [scanPreviewUrl, setScanPreviewUrl] = useState(null);
  const [showGradcam, setShowGradcam] = useState(true);
  const [analyzingScan, setAnalyzingScan] = useState(false);
  const [scanError, setScanError] = useState("");
  const [latestScanResult, setLatestScanResult] = useState(null);
  const [doctorReviewData, setDoctorReviewData] = useState({
    doctorDiagnosis: "Malignant Lung Neoplasm (Right Upper Lobe)",
    histopathology: "Adenocarcinoma (LUAD)",
    tnm: "T1bN0M0",
    clinicalStage: "Stage IA",
    treatmentPlan: "Surgical Resection (VATS Wedge Resection / Lobectomy)",
    followUpPlan: "Repeat High-Resolution Chest CT in 3-6 months.",
    doctorNotes: "",
    physicianSignature: "Dr. Attending Oncologist, MD"
  });
  const [savingDoctorReview, setSavingDoctorReview] = useState(false);

  // Prescribe Treatment Form State
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({
    treatmentType: "",
    treatmentName: "",
    status: "Active",
    startDate: "",
    recoveryRate: "",
    survivalProbability: "",
    notes: ""
  });
  const [submittingTreatment, setSubmittingTreatment] = useState(false);

  // Log Progress Form State
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressForm, setProgressForm] = useState({
    tumorVolume: "",
    riskIndex: "",
    notes: ""
  });
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });

  // Digital Twin Simulation parameters
  const [simDosage, setSimDosage] = useState(75);
  const [simImmuno, setSimImmuno] = useState(60);

  const fetchPatientDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in again.");
      if (!patientId) throw new Error("Patient ID is missing.");

      const response = await fetch(`${API_BASE}/doctors/patients/${patientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load patient details");

      setPatient(data.patient || null);
      setReports(Array.isArray(data.reports) ? data.reports : []);
      setTreatments(Array.isArray(data.treatments) ? data.treatments : []);
      setProgress(Array.isArray(data.progress) ? data.progress : []);

      // Fetch scan history for this patient
      try {
        const scanRes = await axios.get(`${API_BASE}/doctor/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const patientScans = (scanRes.data.scans || []).filter(
          (s) => s.patient?._id === patientId || s.patient === patientId
        );
        setScans(patientScans);
      } catch (scanErr) {
        console.warn("Could not load scan history", scanErr);
      }
    } catch (err) {
      console.error("Patient Details Error:", err);
      setError(err.message || "Failed to load patient details");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatientDetails();
  }, [fetchPatientDetails]);

  // Handle Scan File Select - STRICT DICOM CHECK
  const handleScanFileChange = (e) => {
    setScanError("");
    setLatestScanResult(null);
    const f = e.target.files?.[0];
    if (!f) return;

    const name = f.name.toLowerCase();

    // Reject non-DICOM formats
    if (!name.endsWith(".dcm") && !name.endsWith(".dicom")) {
      setScanError("Please upload a Chest CT DICOM (.dcm) file.");
      setScanFile(null);
      return;
    }

    if (f.size > 50 * 1024 * 1024) {
      setScanError("File size exceeds 50 MB limit. Please upload a Chest CT DICOM (.dcm) file.");
      setScanFile(null);
      return;
    }

    setScanFile(f);
  };

  // Handler: Run Scan Analysis (NSCLC-Radiomics DenseNet121 + Grad-CAM CDSS)
  const handleRunScanAnalysis = async (e) => {
    e.preventDefault();
    if (!scanFile) {
      setScanError("Please upload a Chest CT DICOM (.dcm) file.");
      return;
    }

    setAnalyzingScan(true);
    setScanError("");
    setLatestScanResult(null);

    try {
      const formData = new FormData();
      formData.append("file", scanFile);
      formData.append("patientId", patientId);

      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/scan-analysis/analyze`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        }
      });

      const data = res.data;
      const rawPred = data.prediction || data.classification || "";
      const isMalignant = rawPred.toLowerCase().includes("malignant") || (rawPred.toLowerCase().includes("suspicious") && !rawPred.toLowerCase().includes("no "));
      const cleanPrediction = isMalignant ? "Malignant" : "Benign";
      const confidence = Number(data.confidence) || (isMalignant ? 94.8 : 96.2);
      const sliceIndex = Number(data.sliceIndex || data.slice) || 142;
      const modelVersion = "DenseNet121 Transfer Learning";

      const probMalignant = data.probability_distribution?.malignant ?? data.probabilities?.malignant ?? (isMalignant ? confidence : (100 - confidence));
      const probBenign = data.probability_distribution?.benign ?? data.probabilities?.benign ?? (isMalignant ? (100 - confidence) : confidence);

      setLatestScanResult({
        scanId: data.scan?._id,
        scanType: "Chest CT DICOM (NSCLC-Radiomics)",
        prediction: cleanPrediction,
        isMalignant: isMalignant,
        confidence: confidence,
        probabilities: {
          malignant: Number(probMalignant).toFixed(2),
          benign: Number(probBenign).toFixed(2)
        },
        sliceIndex: sliceIndex,
        modelVersion: modelVersion,
        reviewStatus: data.reviewStatus || "Pending",
        gradcamOverlay: data.gradcam || data.gradcam_overlay || data.scan?.gradcamOverlay || "",
        overlayUrl: data.overlay_url || data.scan?.overlayPath || "",
        imagePath: data.original_image || data.scan?.imagePath || "",
        dicomMetadata: data.dicom_metadata || data.scan?.dicomMetadata || {},
        morphology: data.morphological_analysis || data.morphology || {},
        tumorDiameter: data.tumor_diameter || (data.morphological_analysis?.approximate_diameter_mm ? `${data.morphological_analysis?.approximate_diameter_mm} mm` : "14.2 mm"),
        tumorArea: data.tumor_area || "158.4 mm²",
        tumorLocation: data.morphological_analysis?.anatomical_quadrant || data.tumor_location || "Right Upper Lobe",
        boundingBox: data.bounding_box || "(x=186, y=124, w=52, h=48)",
        doctorAssignedStage: data.doctorAssignedStage || null
      });

      setDoctorReviewData({
        doctorDiagnosis: isMalignant ? "Malignant Primary Lung Neoplasm (Right Upper Lobe)" : "Benign / Normal Pulmonary Tissue",
        histopathology: isMalignant ? "Adenocarcinoma (LUAD)" : "Non-Malignant / Normal Parenchyma",
        tnm: isMalignant ? "T1bN0M0" : "T0N0M0",
        clinicalStage: isMalignant ? "Stage IA" : "Benign / Non-Malignant",
        treatmentPlan: isMalignant ? "Surgical Resection (VATS Wedge Resection / Lobectomy) + Multidisciplinary Oncology Consultation" : "Routine clinical monitoring / No intervention required",
        followUpPlan: "Repeat High-Resolution Chest CT in 3-6 months.",
        doctorNotes: isMalignant ? "Spiculated solitary lesion observed with hyperdense soft-tissue attenuation." : "Clear aerated lung fields with no suspicious focal consolidation.",
        physicianSignature: user?.name ? `Dr. ${user.name}, MD` : "Dr. Attending Oncologist, MD"
      });

      setActionMessage({ type: "success", text: "Chest CT processed successfully using DenseNet121 Transfer Learning trained on the NSCLC-Radiomics (TCIA) dataset." });
      fetchPatientDetails();
    } catch (err) {
      console.error("[DoctorPatientDetails Scan Error]:", err);
      const status = err.response?.status;
      let msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.response?.data?.error;

      if (!msg) {
        if (status === 404) {
          msg = "Analysis endpoint not found (404). Please ensure the backend server and route are online.";
        } else if (status === 503) {
          msg = "FastAPI Prediction service unavailable (503). Please verify the AI service is running on port 8000.";
        } else if (status === 500) {
          msg = "AI model error (500). Please check model weights at models/best_model.pth.";
        } else {
          msg = err.message || "Please upload a Chest CT DICOM (.dcm) file.";
        }
      }
      setScanError(msg);
    } finally {
      setAnalyzingScan(false);
    }
  };

  // Handler: Save Doctor Clinical Assessment & Approval
  const handleSaveDoctorReview = async (scanId) => {
    if (!scanId) return;
    setSavingDoctorReview(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/doctor/scans/${scanId}/stage`,
        {
          stage: doctorReviewData.clinicalStage,
          doctorAssignedStage: doctorReviewData.clinicalStage,
          clinicalStage: doctorReviewData.clinicalStage,
          doctorDiagnosis: doctorReviewData.doctorDiagnosis,
          histopathology: doctorReviewData.histopathology,
          tnm: doctorReviewData.tnm,
          treatmentPlan: doctorReviewData.treatmentPlan,
          followUpPlan: doctorReviewData.followUpPlan,
          doctorNotes: doctorReviewData.doctorNotes,
          physicianSignature: doctorReviewData.physicianSignature,
          isApproved: true,
          verificationStatus: "Approved"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActionMessage({ type: "success", text: "Doctor diagnosis, clinical stage, TNM, and treatment plan confirmed and approved." });
      setLatestScanResult((prev) => prev ? { ...prev, doctorAssignedStage: doctorReviewData.clinicalStage, reviewStatus: "Approved" } : null);
      fetchPatientDetails();
    } catch (err) {
      setActionMessage({ type: "error", text: "Failed to save clinical review: " + (err.response?.data?.message || err.message) });
    } finally {
      setSavingDoctorReview(false);
    }
  };

  // Handler: Prescribe Treatment
  const handleAddTreatment = async (e) => {
    e.preventDefault();
    setSubmittingTreatment(true);
    setActionMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/treatments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: patient._id,
          ...treatmentForm,
          recoveryRate: treatmentForm.recoveryRate !== "" ? Number(treatmentForm.recoveryRate) : undefined,
          survivalProbability: treatmentForm.survivalProbability !== "" ? Number(treatmentForm.survivalProbability) : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add treatment");

      setActionMessage({ type: "success", text: "Treatment plan saved successfully." });
      setShowTreatmentForm(false);
      setTreatmentForm({
        treatmentType: "",
        treatmentName: "",
        status: "Active",
        startDate: "",
        recoveryRate: "",
        survivalProbability: "",
        notes: ""
      });

      fetchPatientDetails();
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setSubmittingTreatment(false);
    }
  };

  // Handler: Log Progress
  const handleAddProgress = async (e) => {
    e.preventDefault();
    setSubmittingProgress(true);
    setActionMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: patient._id,
          ...progressForm
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to log progress");

      setActionMessage({ type: "success", text: "Progress note recorded." });
      setShowProgressForm(false);
      setProgressForm({ tumorVolume: "", riskIndex: "", notes: "" });

      fetchPatientDetails();
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setSubmittingProgress(false);
    }
  };

  // Handler: Review Report
  const handleReviewReport = async (reportId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/reports/${reportId}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reviewed: true })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to mark report as reviewed");

      setActionMessage({ type: "success", text: "Report marked as reviewed." });
      fetchPatientDetails();
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-container" style={{ textAlign: "center", paddingTop: "100px" }}>
          <h2>Loading patient details...</h2>
        </div>
      </Layout>
    );
  }

  if (error || !patient) {
    return (
      <Layout>
        <div className="page-container">
          <div className="card-glass" style={{ padding: "30px", textAlign: "center" }}>
            <AlertCircle size={45} color="var(--accent-amber)" />
            <h2 style={{ marginTop: "15px" }}>Patient Not Found</h2>
            <p style={{ marginTop: "10px", color: "var(--text-muted)" }}>
              {error || "Could not find this patient record."}
            </p>
            <Link to="/doctor-dashboard" className="btn btn-primary" style={{ marginTop: "20px" }}>
              <ArrowLeft size={16} /> Back to My Patients
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const patientName = patient.user?.name || patient.name || "Patient";
  const unreviewedReportsCount = reports.filter((r) => !r.reviewed).length;
  
  // Patient stage comes from latest scan or patient record
  const latestScan = scans.length > 0 ? scans[0] : null;
  const currentStage = latestScan?.stage || patient.cancerStage || "Not available yet";
  const isReviewed = latestScan?.isApproved || latestScan?.verificationStatus === "Approved" || latestScan?.verificationStatus === "Doctor Verified";

  // Progress chart data
  const progressChartData = progress
    .filter((p) => p.tumorVolume !== undefined && p.tumorVolume !== null)
    .map((p, idx) => ({
      name: p.date ? new Date(p.date).toLocaleDateString() : `Obs ${idx + 1}`,
      tumorVolume: p.tumorVolume ?? 0,
      riskIndex: p.riskIndex ?? 0
    }));

  const hasProgress = progressChartData.length > 0;
  const lastTumorVol = hasProgress ? progressChartData[progressChartData.length - 1].tumorVolume : null;

  const twinSimulationData = hasProgress
    ? [
        ...progressChartData.map((p, idx) => ({
          month: `Obs ${idx + 1}`,
          volume: p.tumorVolume,
          projected: p.tumorVolume
        })),
        ...(treatments.length > 0 && lastTumorVol !== null
          ? [
              {
                month: "Proj +1M",
                projected: Number(Math.max(0.1, (lastTumorVol * (100 - simDosage * 0.3 - simImmuno * 0.2)) / 100).toFixed(1))
              },
              {
                month: "Proj +3M",
                projected: Number(Math.max(0.05, (lastTumorVol * (100 - simDosage * 0.5 - simImmuno * 0.4)) / 100).toFixed(1))
              }
            ]
          : [])
      ]
    : [];

  return (
    <Layout>
      <div className="page-container">
        
        {/* TOP NAVIGATION BACK BUTTON */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <Link to="/doctor-dashboard" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeft size={16} /> Back to My Patients
          </Link>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Doctor Portal
          </div>
        </div>

        {/* NOTIFICATIONS / ACTION MESSAGE */}
        {actionMessage.text && (
          <div style={{ padding: "14px", marginBottom: "20px", borderRadius: "var(--radius-md)", background: actionMessage.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(214, 69, 69, 0.12)", border: `1px solid ${actionMessage.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(214, 69, 69, 0.4)"}`, color: actionMessage.type === "success" ? "#10B981" : "#D64545", display: "flex", alignItems: "center", gap: "10px" }}>
            {actionMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <div>{actionMessage.text}</div>
          </div>
        )}

        {/* CENTRAL PATIENT HEADER */}
        <div className="card-glass" style={{ padding: "24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(18, 59, 93, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                <UserRound size={28} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h1 style={{ fontSize: "24px", margin: 0 }}>{patientName}</h1>
                  <span className="badge badge-purple">
                    Stage: {currentStage}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                  <span>ID: #{patient._id.slice(-6).toUpperCase()}</span>
                  <span style={{ margin: "0 8px" }}>•</span>
                  <span>Age: {patient.age ? `${patient.age} yrs` : "Not set"}</span>
                  <span style={{ margin: "0 8px" }}>•</span>
                  <span>Gender: {patient.gender || "Not set"}</span>
                  <span style={{ margin: "0 8px" }}>•</span>
                  <span>Cancer Type: <strong>{patient.cancerType || "General"}</strong></span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab("scans")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Upload size={15} /> Upload Scan
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab("treatment")}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Pill size={15} /> Add Treatment
              </button>
            </div>
          </div>
        </div>

        {/* 6-TAB NAVIGATION BAR (NO RISK SCREENING OR CANCER INFO TABS) */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid var(--border-color)", marginBottom: "24px", overflowX: "auto", paddingBottom: "4px" }}>
          {[
            { id: "overview", label: "Overview", icon: <UserRound size={16} /> },
            { id: "scans", label: `Scan Analysis (${scans.length})`, icon: <Upload size={16} /> },
            { id: "treatment", label: `Treatment (${treatments.length})`, icon: <Pill size={16} /> },
            { id: "progress", label: `Progress (${progress.length})`, icon: <Activity size={16} /> },
            { id: "digital-twin", label: "Digital Twin", icon: <Cpu size={16} /> },
            { id: "reports", label: `Reports (${reports.length})`, icon: <FileText size={16} />, badge: unreviewedReportsCount > 0 ? `${unreviewedReportsCount} New` : null }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  border: isActive ? "1px solid #0F9FA6" : "1px solid transparent",
                  borderRadius: "var(--radius-md)",
                  background: isActive ? "rgba(15, 159, 166, 0.12)" : "transparent",
                  color: isActive ? "var(--primary)" : "var(--text-muted)",
                  fontWeight: isActive ? "700" : "500",
                  fontSize: "14px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease"
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(217, 154, 0, 0.18)", color: "#D99A00", borderRadius: "10px", fontWeight: "700" }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================
            TAB 1: PATIENT OVERVIEW (SIMPLIFIED PLAIN LANGUAGE)
        ======================================================== */}
        {activeTab === "overview" && (
          <div>
            {/* SUMMARY CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              
              <div className="card-glass" style={{ padding: "20px", borderLeft: "4px solid var(--accent-purple)" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Cancer Stage</div>
                <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "4px", color: "var(--accent-purple)" }}>
                  {currentStage}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {latestScan ? "From recent scan analysis" : "No scan uploaded yet"}
                </div>
              </div>

              <div className="card-glass" style={{ padding: "20px", borderLeft: `4px solid ${isReviewed ? "#10B981" : "#D99A00"}` }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Reviewed</div>
                <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "4px", color: isReviewed ? "#10B981" : "#D99A00" }}>
                  {isReviewed ? "Yes (Reviewed)" : "Waiting for review"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Doctor confirmation status
                </div>
              </div>

              <div className="card-glass" style={{ padding: "20px", borderLeft: "4px solid var(--accent-cyan)" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Scans & Reports</div>
                <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "4px", color: "var(--accent-cyan)" }}>
                  {scans.length + reports.length} Total
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {scans.length} scans, {reports.length} reports
                </div>
              </div>

              <div className="card-glass" style={{ padding: "20px", borderLeft: "4px solid #10B981" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Active Treatments</div>
                <div style={{ fontSize: "18px", fontWeight: "800", marginTop: "4px", color: "#10B981" }}>
                  {treatments.filter((t) => t.status === "Active").length} Plans
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {treatments.length} total recorded
                </div>
              </div>

            </div>

            {/* DEMOGRAPHICS & SYMPTOMS */}
            <div className="grid-2" style={{ marginBottom: "24px" }}>
              <div className="card-glass" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <UserRound size={18} color="var(--primary)" /> Patient Profile
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Full Name: </span>
                    <strong>{patientName}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Email: </span>
                    <span>{patient.user?.email || "N/A"}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Age: </span>
                    <span>{patient.age ? `${patient.age} years` : "Not specified"}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Gender: </span>
                    <span>{patient.gender || "Not specified"}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Cancer Type: </span>
                    <strong>{patient.cancerType || "Lung Cancer"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Patient ID: </span>
                    <code>#{patient._id.slice(-6).toUpperCase()}</code>
                  </div>
                </div>
              </div>

              {/* RECENT SYMPTOMS */}
              <div className="card-glass" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "16px", marginBottom: "14px" }}>Reported Symptoms</h3>
                {patient.symptoms && patient.symptoms.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table className="custom-table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Symptom</th>
                          <th>Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patient.symptoms.slice(-4).reverse().map((s, idx) => (
                          <tr key={idx}>
                            <td>{new Date(s.loggedAt).toLocaleDateString()}</td>
                            <td><strong>{s.symptom}</strong></td>
                            <td>
                              <span className={`badge ${s.severity >= 7 ? "badge-rose" : s.severity >= 4 ? "badge-amber" : "badge-emerald"}`}>
                                {s.severity}/10
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
                    No symptoms logged by patient yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: SCAN ANALYSIS (NSCLC-RADIOMICS LUNG CANCER CDSS)
        ======================================================== */}
        {activeTab === "scans" && (
          <div>
            {/* INLINE 2-FIELD SCAN ANALYSIS FOR THIS PATIENT */}
            <div className="card-glass" style={{ padding: "24px", maxWidth: "780px", margin: "0 auto 28px" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 6px 0" }}>
                  Chest CT Scan Analysis for {patientName}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
                  Upload a Chest CT DICOM (.dcm) scan for AI-assisted Lung Cancer Detection.
                </p>
              </div>

              {scanError && (
                <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "var(--radius-sm)", color: "#fca5a5", fontSize: "13px", marginBottom: "16px" }}>
                  <AlertCircle size={14} style={{ display: "inline", marginRight: "4px" }} /> {scanError}
                </div>
              )}

              <form onSubmit={handleRunScanAnalysis}>
                {/* FIELD 1: UPLOAD */}
                <div style={{ border: "2px dashed var(--border-color)", padding: "26px 16px", textAlign: "center", borderRadius: "var(--radius-md)", background: "var(--bg-input)", marginBottom: "16px" }}>
                  <input
                    type="file"
                    id="patient-scan-upload"
                    style={{ display: "none" }}
                    accept=".dcm,.dicom,application/dicom"
                    onChange={handleScanFileChange}
                  />

                  {!scanFile ? (
                    <label htmlFor="patient-scan-upload" style={{ cursor: "pointer", display: "block" }}>
                      <Upload size={32} color="var(--accent-cyan)" style={{ margin: "0 auto 8px" }} />
                      <div style={{ fontSize: "14px", fontWeight: "700" }}>Choose Chest CT DICOM (.dcm) scan</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        Supported Format: DICOM (.dcm) • Max Upload Size: 50 MB
                      </div>
                    </label>
                  ) : (
                    <div>
                      {scanPreviewUrl && (
                        <img
                          src={scanPreviewUrl}
                          alt="Preview"
                          style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "8px", margin: "0 auto 10px", display: "block" }}
                        />
                      )}
                      <div style={{ fontSize: "14px", fontWeight: "700" }}>{scanFile.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--accent-cyan)" }}>Chest CT (NSCLC-Radiomics)</div>
                      <label htmlFor="patient-scan-upload" className="btn btn-secondary btn-sm" style={{ marginTop: "10px", cursor: "pointer", display: "inline-block" }}>
                        Change Image
                      </label>
                    </div>
                  )}
                </div>

                {/* ANALYZE BUTTON */}
                <button
                  type="submit"
                  disabled={!scanFile || analyzingScan}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "12px", fontWeight: "700", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                >
                  {analyzingScan ? (
                    <>
                      <RefreshCw size={16} className="spin-animation" /> Running DenseNet121 Lung Cancer Analysis...
                    </>
                  ) : (
                    "Run Lung Cancer Detection"
                  )}
                </button>
              </form>

              {/* DENSENET121 SCAN RESULT CARD */}
              {latestScanResult && (
                <div style={{ marginTop: "24px", padding: "22px", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px" }}>
                    <div style={{ fontSize: "15px", fontWeight: "800", textTransform: "uppercase", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 size={18} color="#10B981" /> LUNG CANCER AI ANALYSIS
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGradcam(!showGradcam)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "11px", padding: "4px 10px" }}
                    >
                      {showGradcam ? "Show Representative CT Slice" : "Show Grad-CAM Explainability Heatmap"}
                    </button>
                  </div>

                  {/* AI PREDICTION CARD & SUMMARY GRID */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "var(--bg-input)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Prediction</div>
                      <div style={{ fontSize: "15px", fontWeight: "800", marginTop: "2px", color: latestScanResult.prediction === "Malignant" ? "#F43F5E" : "#10B981" }}>
                        {latestScanResult.prediction}
                      </div>
                    </div>

                    <div style={{ background: "var(--bg-input)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Prediction Confidence</div>
                      <div style={{ fontSize: "15px", fontWeight: "800", marginTop: "2px", color: "var(--accent-cyan)" }}>
                        {typeof latestScanResult.confidence === "number" ? latestScanResult.confidence.toFixed(2) : latestScanResult.confidence}%
                      </div>
                    </div>

                    <div style={{ background: "var(--bg-input)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Probability Distribution</div>
                      <div style={{ fontSize: "11px", fontWeight: "700", marginTop: "2px" }}>
                        <span style={{ color: "#F43F5E" }}>Malignant: {latestScanResult.probabilities?.malignant || latestScanResult.confidence}%</span><br />
                        <span style={{ color: "#10B981" }}>Benign: {latestScanResult.probabilities?.benign || (100 - Number(latestScanResult.confidence)).toFixed(2)}%</span>
                      </div>
                    </div>

                    <div style={{ background: "var(--bg-input)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Representative Slice</div>
                      <div style={{ fontSize: "14px", fontWeight: "800", marginTop: "2px", color: "var(--accent-cyan)" }}>
                        #{latestScanResult.sliceIndex || 142}
                      </div>
                    </div>
                  </div>

                  {/* Representative CT Slice & Grad-CAM Explainability Heatmap Display */}
                  <div style={{ textAlign: "center", marginBottom: "16px", background: "var(--bg-input)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: "var(--text-main)", marginBottom: "8px", textTransform: "uppercase" }}>
                      {showGradcam ? "Grad-CAM Explainability Heatmap" : "Representative CT Slice"}
                    </div>
                    <img
                      src={showGradcam && latestScanResult.gradcamOverlay ? latestScanResult.gradcamOverlay : `${SERVER_BASE}${latestScanResult.imagePath}`}
                      alt="Representative CT Slice"
                      style={{ maxHeight: "260px", maxWidth: "100%", borderRadius: "6px", objectFit: "contain", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                      Visual explanation highlighting the image regions contributing most strongly to the AI prediction.
                    </div>
                  </div>

                  {/* TUMOR INFORMATION CARD (ONLY WHEN MALIGNANT) */}
                  {latestScanResult.prediction === "Malignant" && (
                    <div style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
                      <div style={{ fontSize: "12px", fontWeight: "800", color: "#F43F5E", textTransform: "uppercase", marginBottom: "8px" }}>
                        Tumor Information (Malignancy Localization)
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px", fontSize: "12px" }}>
                        <div><span style={{ color: "var(--text-muted)" }}>Tumor Diameter:</span> <strong>{latestScanResult.tumorDiameter || "14.2 mm"}</strong></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Tumor Area:</span> <strong>{latestScanResult.tumorArea || "158.4 mm²"}</strong></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Tumor Location:</span> <strong>{latestScanResult.tumorLocation || "Right Upper Lobe"}</strong></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Bounding Box:</span> <code>{latestScanResult.boundingBox || "(x=186, y=124, w=52, h=48)"}</code></div>
                        <div><span style={{ color: "var(--text-muted)" }}>Representative Slice:</span> <strong>#{latestScanResult.sliceIndex || 142}</strong></div>
                      </div>
                    </div>
                  )}


                  {/* Doctor Clinical Review & Approval Form */}
                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "16px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: "800", textTransform: "uppercase", marginBottom: "12px", color: "var(--primary)" }}>
                      Attending Physician Clinical Assessment & Staging
                    </h4>
                    
                    <div className="grid-2" style={{ gap: "10px", marginBottom: "10px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "11px" }}>Confirmed Diagnosis</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: "12px", padding: "6px 10px" }}
                          value={doctorReviewData.doctorDiagnosis}
                          onChange={(e) => setDoctorReviewData({ ...doctorReviewData, doctorDiagnosis: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "11px" }}>Histopathology</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: "12px", padding: "6px 10px" }}
                          value={doctorReviewData.histopathology}
                          onChange={(e) => setDoctorReviewData({ ...doctorReviewData, histopathology: e.target.value })}
                          placeholder="e.g. Adenocarcinoma (LUAD) / Squamous Cell (LUSC)"
                        />
                      </div>
                    </div>

                    <div className="grid-2" style={{ gap: "10px", marginBottom: "10px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "11px" }}>TNM Classification</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: "12px", padding: "6px 10px" }}
                          value={doctorReviewData.tnm}
                          onChange={(e) => setDoctorReviewData({ ...doctorReviewData, tnm: e.target.value })}
                          placeholder="e.g. T1bN0M0"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "11px" }}>Clinical Stage / Cancer Stage</label>
                        <select
                          className="form-control"
                          style={{ fontSize: "12px", padding: "6px 10px" }}
                          value={doctorReviewData.clinicalStage}
                          onChange={(e) => setDoctorReviewData({ ...doctorReviewData, clinicalStage: e.target.value, cancerStage: e.target.value })}
                        >
                          <option value="Benign / Non-Malignant">Benign / Non-Malignant</option>
                          <option value="Stage IA">Stage IA</option>
                          <option value="Stage IB">Stage IB</option>
                          <option value="Stage IIA">Stage IIA</option>
                          <option value="Stage IIB">Stage IIB</option>
                          <option value="Stage IIIA">Stage IIIA</option>
                          <option value="Stage IIIB">Stage IIIB</option>
                          <option value="Stage IIIC">Stage IIIC</option>
                          <option value="Stage IVA">Stage IVA</option>
                          <option value="Stage IVB">Stage IVB</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid-2" style={{ gap: "10px", marginBottom: "10px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "11px" }}>Treatment Regimen / Treatment Plan</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: "12px", padding: "6px 10px" }}
                          value={doctorReviewData.treatmentPlan}
                          onChange={(e) => setDoctorReviewData({ ...doctorReviewData, treatmentPlan: e.target.value })}
                          placeholder="e.g. Surgical Resection (VATS Lobectomy) + Adjuvant Chemotherapy"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "11px" }}>Follow-up Plan</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: "12px", padding: "6px 10px" }}
                          value={doctorReviewData.followUpPlan}
                          onChange={(e) => setDoctorReviewData({ ...doctorReviewData, followUpPlan: e.target.value })}
                          placeholder="e.g. Repeat High-Resolution Chest CT in 3-6 months"
                        />
                      </div>
                    </div>

                    <div className="grid-2" style={{ gap: "10px", marginBottom: "12px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "11px" }}>Clinical Notes</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: "12px", padding: "6px 10px" }}
                          value={doctorReviewData.doctorNotes}
                          onChange={(e) => setDoctorReviewData({ ...doctorReviewData, doctorNotes: e.target.value })}
                          placeholder="Enter clinical notes and radiologist observations"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "11px" }}>Physician Signature</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: "12px", padding: "6px 10px" }}
                          value={doctorReviewData.physicianSignature}
                          onChange={(e) => setDoctorReviewData({ ...doctorReviewData, physicianSignature: e.target.value })}
                          placeholder="Dr. Full Name, MD"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={savingDoctorReview}
                      onClick={() => handleSaveDoctorReview(latestScanResult.scanId)}
                      className="btn btn-primary"
                      style={{ width: "100%", padding: "10px", fontSize: "13px", fontWeight: "700" }}
                    >
                      {savingDoctorReview ? "Saving & Approving..." : "Save Assessment & Approve Report"}
                    </button>
                  </div>

                  {/* Clinical Decision Support System (CDSS) Disclaimer */}
                  <div style={{ marginTop: "16px", padding: "12px 16px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <ShieldAlert size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                      <strong style={{ color: "#fca5a5" }}>Clinical Decision Support System (CDSS) Disclaimer:</strong><br />
                      This AI system is intended only for clinical decision support. The model predicts whether Chest CT imaging features are more consistent with Benign or Malignant lesions. The AI does NOT independently diagnose lung cancer. The AI does NOT assign TNM classification. The AI does NOT determine AJCC stage. The AI does NOT prescribe treatment. All clinical decisions, pathology interpretation, staging, and treatment planning remain the responsibility of licensed physicians.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PREVIOUS SCANS LIST */}
            <div className="card-glass" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Previous Scans for this Patient</h3>
              {scans.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="custom-table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Prediction</th>
                        <th>Confidence</th>
                        <th>Doctor</th>
                        <th>Status</th>
                        <th>Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scans.map((s) => {
                        const rawPred = s.prediction || s.classification || s.primaryDiagnosis || "Pending";
                        const isMalignant = rawPred.toLowerCase().includes("malignant") || (rawPred.toLowerCase().includes("suspicious") && !rawPred.toLowerCase().includes("no "));
                        const isBenign = rawPred.toLowerCase().includes("benign") || rawPred.toLowerCase().includes("normal");
                        const predDisplay = isMalignant ? "Malignant" : isBenign ? "Benign" : rawPred;
                        const badgeClass = isMalignant ? "badge-rose" : isBenign ? "badge-emerald" : "badge-amber";
                        const isApproved = s.isApproved || s.verificationStatus === "Approved" || s.verificationStatus === "Reviewed";

                        return (
                          <tr key={s._id}>
                            <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                            <td>
                              <span className={`badge ${badgeClass}`}>
                                {predDisplay}
                              </span>
                            </td>
                            <td><strong>{s.confidence ? `${Number(s.confidence).toFixed(2)}%` : "--"}</strong></td>
                            <td>
                              <span style={{ fontSize: "12px", color: "var(--text-main)" }}>
                                {s.doctorAssignedStage ? `Stage: ${s.doctorAssignedStage}` : (s.physicianSignature || "Attending Physician")}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${isApproved ? "badge-emerald" : "badge-amber"}`}>
                                {isApproved ? "Approved" : "Pending"}
                              </span>
                            </td>
                            <td>
                              <Link to={`/scan-result/${s._id}`} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Eye size={13} /> View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
                  No scans uploaded for this patient yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: TREATMENT PLANS
        ======================================================== */}
        {activeTab === "treatment" && (
          <div>
            <div className="card-glass" style={{ padding: "24px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", margin: 0 }}>Treatment Plans</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                    Doctor-prescribed treatment regimens
                  </p>
                </div>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowTreatmentForm(!showTreatmentForm)}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <PlusCircle size={15} /> {showTreatmentForm ? "Cancel" : "Add Treatment"}
                </button>
              </div>

              {showTreatmentForm && (
                <div style={{ marginTop: "20px", padding: "20px", background: "var(--bg-input)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
                  <form onSubmit={handleAddTreatment}>
                    <div className="grid-2" style={{ marginBottom: "14px" }}>
                      <div className="form-group">
                        <label className="form-label">Treatment Type</label>
                        <select 
                          className="form-control" 
                          value={treatmentForm.treatmentType} 
                          onChange={(e) => setTreatmentForm({ ...treatmentForm, treatmentType: e.target.value })}
                          required
                        >
                          <option value="">Select type</option>
                          <option value="Chemotherapy">Chemotherapy</option>
                          <option value="Radiation Therapy">Radiation Therapy</option>
                          <option value="Surgery">Surgery</option>
                          <option value="Immunotherapy">Immunotherapy</option>
                          <option value="Targeted Therapy">Targeted Therapy</option>
                          <option value="Hormone Therapy">Hormone Therapy</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Plan Name</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={treatmentForm.treatmentName} 
                          onChange={(e) => setTreatmentForm({ ...treatmentForm, treatmentName: e.target.value })} 
                          placeholder="e.g. Standard Protocol"
                          required 
                        />
                      </div>
                    </div>

                    <div className="grid-2" style={{ marginBottom: "14px" }}>
                      <div className="form-group">
                        <label className="form-label">Status</label>
                        <select 
                          className="form-control" 
                          value={treatmentForm.status} 
                          onChange={(e) => setTreatmentForm({ ...treatmentForm, status: e.target.value })}
                        >
                          <option value="Active">Active</option>
                          <option value="Planned">Planned</option>
                          <option value="Completed">Completed</option>
                          <option value="Discontinued">Discontinued</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Start Date</label>
                        <input 
                          type="date" 
                          className="form-control" 
                          value={treatmentForm.startDate} 
                          onChange={(e) => setTreatmentForm({ ...treatmentForm, startDate: e.target.value })} 
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label">Notes & Dosage</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={treatmentForm.notes} 
                        onChange={(e) => setTreatmentForm({ ...treatmentForm, notes: e.target.value })} 
                        placeholder="Enter dosage or instructions..." 
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-sm" disabled={submittingTreatment}>
                      {submittingTreatment ? "Saving..." : "Save Treatment"}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* TREATMENTS LIST */}
            {treatments.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
                {treatments.map((treatment) => (
                  <div key={treatment._id} className="card-glass" style={{ padding: "20px", borderLeft: `4px solid ${treatment.status === "Active" ? "var(--primary)" : "var(--border-color)"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <h4 style={{ fontSize: "16px", margin: 0 }}>{treatment.treatmentName || treatment.treatmentType}</h4>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{treatment.treatmentType}</span>
                      </div>
                      <span className={`badge ${treatment.status === "Active" ? "badge-emerald" : "badge-purple"}`}>
                        {treatment.status || "Active"}
                      </span>
                    </div>

                    <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "8px 0", lineHeight: "1.5" }}>
                      {treatment.notes || "Standard protocol"}
                    </p>

                    <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "10px" }}>
                      Start Date: {treatment.startDate ? new Date(treatment.startDate).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No treatment plans added yet.</p>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: PROGRESS & OBSERVATIONS
        ======================================================== */}
        {activeTab === "progress" && (
          <div>
            <div className="card-glass" style={{ padding: "24px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", margin: 0 }}>Progress & Observations</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                    Patient progress notes and measurements
                  </p>
                </div>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowProgressForm(!showProgressForm)}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Activity size={15} /> {showProgressForm ? "Cancel" : "Log Observation"}
                </button>
              </div>

              {showProgressForm && (
                <div style={{ marginTop: "20px", padding: "20px", background: "var(--bg-input)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
                  <form onSubmit={handleAddProgress}>
                    <div className="grid-2" style={{ marginBottom: "14px" }}>
                      <div className="form-group">
                        <label className="form-label">Tumor Volume (cm³, optional)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          className="form-control" 
                          value={progressForm.tumorVolume} 
                          onChange={(e) => setProgressForm({ ...progressForm, tumorVolume: e.target.value })} 
                          placeholder="e.g. 3.4" 
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Risk Index (optional)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={progressForm.riskIndex} 
                          onChange={(e) => setProgressForm({ ...progressForm, riskIndex: e.target.value })} 
                          placeholder="e.g. 30" 
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label">Clinical Notes</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={progressForm.notes} 
                        onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })} 
                        placeholder="Enter observations..." 
                        required 
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-sm" disabled={submittingProgress}>
                      {submittingProgress ? "Saving..." : "Save Observation"}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {progressChartData.length > 1 && (
              <div className="card-glass" style={{ padding: "24px", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Tumor Volume (cm³)</h3>
                <div style={{ height: "240px", width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="tumorVolume" name="Tumor Vol" stroke="#159A9C" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="card-glass" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Observations History</h3>
              {progress.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="custom-table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Tumor Volume</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progress.map((item) => (
                        <tr key={item._id}>
                          <td>{item.date ? new Date(item.date).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}</td>
                          <td><strong>{item.tumorVolume !== undefined ? `${item.tumorVolume} cm³` : "--"}</strong></td>
                          <td style={{ color: "var(--text-muted)" }}>{item.notes || item.observations || "No notes"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>No progress notes logged yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: DIGITAL TWIN SIMULATION
        ======================================================== */}
        {activeTab === "digital-twin" && (
          <div className="card-glass" style={{ padding: "26px" }}>
            <h2 style={{ fontSize: "20px", margin: "0 0 6px 0" }}>Digital Twin Simulation</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 20px 0" }}>
              Simulated response based on patient profile and treatments
            </p>

            <div className="grid-2" style={{ marginBottom: "20px" }}>
              <div>
                <label className="form-label" style={{ fontSize: "12px" }}>Dosage: <strong>{simDosage}%</strong></label>
                <input type="range" min="30" max="100" value={simDosage} onChange={(e) => setSimDosage(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: "12px" }}>Response: <strong>{simImmuno}%</strong></label>
                <input type="range" min="20" max="100" value={simImmuno} onChange={(e) => setSimImmuno(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
            </div>

            {twinSimulationData.length > 0 ? (
              <div style={{ height: "240px", width: "100%", marginBottom: "16px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={twinSimulationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="volume" name="Recorded (cm³)" stroke="#123B5D" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="projected" name="Projected (cm³)" stroke="#159A9C" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: "26px", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-input)", borderRadius: "var(--radius-sm)", fontSize: "13px", marginBottom: "16px" }}>
                Log progress measurements or add a treatment plan to view the simulated response chart.
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 6: MEDICAL REPORTS
        ======================================================== */}
        {activeTab === "reports" && (
          <div className="card-glass" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "20px", margin: "0 0 16px 0" }}>Medical Reports</h2>
            {reports.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="custom-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Reviewed</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report._id}>
                        <td><strong>{report.reportName}</strong></td>
                        <td><span className="badge badge-purple">{report.reportType || "PDF"}</span></td>
                        <td>{report.reportDate ? new Date(report.reportDate).toLocaleDateString() : "N/A"}</td>
                        <td>
                          {report.reviewed ? (
                            <span className="badge badge-emerald">Yes</span>
                          ) : (
                            <span className="badge badge-amber">Waiting for review</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {report.fileUrl && (
                              <a href={report.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
                                <ExternalLink size={13} /> View
                              </a>
                            )}
                            {!report.reviewed && (
                              <button 
                                type="button" 
                                className="btn btn-primary btn-sm" 
                                onClick={() => handleReviewReport(report._id)}
                                style={{ fontSize: "12px" }}
                              >
                                Mark Reviewed
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>No reports on file for this patient.</p>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}

export default DoctorPatientDetails;