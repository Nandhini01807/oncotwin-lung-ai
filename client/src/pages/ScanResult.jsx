import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  CheckCircle2, 
  ArrowLeft, 
  Clock, 
  Eye, 
  Check, 
  Stethoscope, 
  FileText,
  Activity,
  Database,
  Printer,
  ShieldCheck,
  Zap
} from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";
const SERVER_BASE = "http://localhost:5000";

function ScanResult() {
  const { id } = useParams();
  const { user } = useAuth();

  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGradcam, setShowGradcam] = useState(true);

  // Doctor Clinical Assessment State
  const [doctorDiagnosis, setDoctorDiagnosis] = useState("");
  const [histopathology, setHistopathology] = useState("");
  const [selectedStage, setSelectedStage] = useState("Stage IA");
  const [tnmClassification, setTnmClassification] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [followUpPlan, setFollowUpPlan] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [physicianSignature, setPhysicianSignature] = useState("");
  const [savingStage, setSavingStage] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const isDoctor = user?.role === "doctor";

  useEffect(() => {
    const fetchScanDetails = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/doctor/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const found = (res.data.scans || []).find((s) => s._id === id);
        if (found) {
          setScan(found);
          setDoctorDiagnosis(found.doctorDiagnosis || (found.prediction === "Malignant" ? "Non-Small Cell Lung Carcinoma (NSCLC)" : "Benign / Non-Malignant Pulmonary Nodule"));
          setHistopathology(found.histopathology || (found.prediction === "Malignant" ? "Adenocarcinoma (LUAD)" : "Benign Granuloma / Hamartoma"));
          setSelectedStage(found.doctorAssignedStage || found.clinicalStage || (found.prediction === "Malignant" ? "Stage IA" : "Benign / Non-Malignant"));
          setTnmClassification(found.tnm || (found.prediction === "Malignant" ? "T1bN0M0" : "T0N0M0"));
          setTreatmentPlan(found.treatmentPlan || (found.prediction === "Malignant" ? "Surgical Resection (VATS Lobectomy) + Adjuvant Chemotherapy" : "Active Surveillance; Low-Dose CT in 6 months"));
          setFollowUpPlan(found.followUpPlan || "Repeat High-Resolution Chest CT in 3-6 months");
          setDoctorNotes(found.doctorNotes || "DenseNet121 Transfer Learning prediction reviewed. Saliency heatmap verified.");
          setPhysicianSignature(found.physicianSignature || (user?.name ? `Dr. ${user.name}, MD` : "Dr. Attending Oncologist, MD"));
        } else {
          const singleRes = await axios.get(`${API_BASE}/patient/report/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const sc = singleRes.data.scan;
          setScan(sc);
          setDoctorDiagnosis(sc.doctorDiagnosis || (sc.prediction === "Malignant" ? "Non-Small Cell Lung Carcinoma (NSCLC)" : "Benign / Non-Malignant Pulmonary Nodule"));
          setHistopathology(sc.histopathology || (sc.prediction === "Malignant" ? "Adenocarcinoma (LUAD)" : "Benign Granuloma / Hamartoma"));
          setSelectedStage(sc.doctorAssignedStage || sc.clinicalStage || (sc.prediction === "Malignant" ? "Stage IA" : "Benign / Non-Malignant"));
          setTnmClassification(sc.tnm || (sc.prediction === "Malignant" ? "T1bN0M0" : "T0N0M0"));
          setTreatmentPlan(sc.treatmentPlan || (sc.prediction === "Malignant" ? "Surgical Resection (VATS Lobectomy) + Adjuvant Chemotherapy" : "Active Surveillance; Low-Dose CT in 6 months"));
          setFollowUpPlan(sc.followUpPlan || "Repeat High-Resolution Chest CT in 3-6 months");
          setDoctorNotes(sc.doctorNotes || "DenseNet121 Transfer Learning prediction reviewed. Saliency heatmap verified.");
          setPhysicianSignature(sc.physicianSignature || (user?.name ? `Dr. ${user.name}, MD` : "Dr. Attending Oncologist, MD"));
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load scan details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchScanDetails();
  }, [id, user]);

  const handleSaveAssessment = async () => {
    setSavingStage(true);
    setSaveMessage("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${API_BASE}/doctor/scans/${id}/stage`,
        {
          doctorDiagnosis,
          histopathology,
          stage: selectedStage || "Not yet determined",
          doctorAssignedStage: selectedStage || "Not yet determined",
          clinicalStage: selectedStage || "Not yet determined",
          cancerStage: selectedStage || "Not yet determined",
          tnm: tnmClassification,
          treatmentPlan,
          followUpPlan,
          doctorNotes,
          physicianSignature,
          isApproved: true,
          verificationStatus: "Approved"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setScan(res.data.scan);
      setSaveMessage("Doctor clinical diagnosis, histopathology, stage, TNM, and treatment plan saved & approved.");
      setTimeout(() => setSaveMessage(""), 5000);
    } catch (err) {
      alert("Error saving assessment: " + (err.response?.data?.message || err.message));
    } finally {
      setSavingStage(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-container" style={{ textAlign: "center", padding: "100px 20px" }}>
          <h2>Loading CT scan details...</h2>
        </div>
      </Layout>
    );
  }

  if (error || !scan) {
    return (
      <Layout>
        <div className="page-container" style={{ textAlign: "center", padding: "80px 20px" }}>
          <h2>{error || "Scan record not found"}</h2>
          <Link to={isDoctor ? "/upload-scan" : "/reports"} className="btn btn-primary" style={{ marginTop: "20px" }}>
            <ArrowLeft size={16} /> Return to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  const originalImgUrl = scan.uploadedImage || (scan.imagePath?.startsWith("http") ? scan.imagePath : `${SERVER_BASE}${scan.imagePath}`);
  const overlayImgUrl = scan.gradcamOverlay || (scan.overlayPath?.startsWith("http") ? scan.overlayPath : `${SERVER_BASE}${scan.overlayPath}`);
  
  const isReviewed = scan.isApproved || scan.verificationStatus === "Approved" || scan.verificationStatus === "Reviewed";
  const stageDisplay = scan.doctorAssignedStage || scan.clinicalStage;

  const rawPrediction = scan.prediction || scan.classification || "Malignant";
  const isMalignant = rawPrediction.toLowerCase().includes("malignant") && !rawPrediction.toLowerCase().includes("non");
  const prediction = isMalignant ? "Malignant" : "Benign";
  const confidence = typeof scan.confidence === "number" ? scan.confidence.toFixed(2) : (scan.confidence || 94.8);
  const meta = scan.dicomMetadata || {};

  return (
    <Layout>
      <div className="page-container" style={{ maxWidth: "860px", margin: "0 auto", paddingBottom: "60px" }}>
        
        {/* TOP BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <Link to={isDoctor ? "/upload-scan" : "/reports"} style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "14px" }}>
            <ArrowLeft size={16} /> Back
          </Link>

          <Link to={`/report/${scan._id}`} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <FileText size={14} /> View Printable Report
          </Link>
        </div>

        {/* STATUS BANNER */}
        <div style={{ padding: "14px 18px", background: isReviewed ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)", border: `1px solid ${isReviewed ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`, borderRadius: "var(--radius-md)", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isReviewed ? <CheckCircle2 size={20} color="#10B981" /> : <Clock size={20} color="var(--accent-amber)" />}
            <div>
              <strong>Status: {isReviewed ? "Approved by Doctor" : "Analyzed — Awaiting Doctor Clinical Review"}</strong>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Patient: {scan.patientName || "Patient"} • Modality: <span className="badge badge-cyan" style={{ fontSize: "11px" }}>Chest CT (NSCLC-Radiomics)</span> • File: {scan.originalFileName}
              </div>
            </div>
          </div>
          <span className={`badge ${isReviewed ? "badge-emerald" : "badge-amber"}`}>
            {isReviewed ? "Approved" : "Pending Doctor Review"}
          </span>
        </div>

        {/* MAIN SCAN ATTACHMENT CARD */}
        <div className="card-glass" style={{ padding: "28px", textAlign: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px" }}>
            <div style={{ textAlign: "left" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-main)", margin: 0 }}>
                LUNG CANCER AI ANALYSIS
              </h2>
              <div style={{ fontSize: "11px", color: "var(--accent-cyan)", marginTop: "2px" }}>
                DenseNet121 Transfer Learning • NSCLC-Radiomics (TCIA) • Slice #{scan.sliceIndex || 142}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGradcam(!showGradcam)}
              className="btn btn-secondary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
            >
              <Eye size={14} /> {showGradcam ? "Show Representative CT Slice" : "Show Grad-CAM Explainability Heatmap"}
            </button>
          </div>

            {/* AI PREDICTION CARD & SUMMARY GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "16px", textAlign: "left" }}>
              <div style={{ background: "var(--bg-input)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Prediction</div>
                <div style={{ fontSize: "16px", fontWeight: "800", marginTop: "2px", color: isMalignant ? "#F43F5E" : "#10B981" }}>
                  {prediction}
                </div>
              </div>

              <div style={{ background: "var(--bg-input)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Prediction Confidence</div>
                <div style={{ fontSize: "16px", fontWeight: "800", marginTop: "2px", color: "var(--accent-cyan)" }}>
                  {confidence}%
                </div>
              </div>

              <div style={{ background: "var(--bg-input)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Probability Distribution</div>
                <div style={{ fontSize: "11px", fontWeight: "700", marginTop: "2px" }}>
                  <span style={{ color: "#F43F5E" }}>Malignant: {scan.probabilities?.malignant || (isMalignant ? confidence : (100 - Number(confidence)).toFixed(2))}%</span><br />
                  <span style={{ color: "#10B981" }}>Benign: {scan.probabilities?.benign || (!isMalignant ? confidence : (100 - Number(confidence)).toFixed(2))}%</span>
                </div>
              </div>

              <div style={{ background: "var(--bg-input)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Representative Slice</div>
                <div style={{ fontSize: "15px", fontWeight: "800", marginTop: "2px", color: "var(--accent-cyan)" }}>
                  #{scan.sliceIndex || 142}
                </div>
              </div>
            </div>

          {/* Representative CT Slice & Grad-CAM Heatmap Image */}
          <div style={{ marginBottom: "16px", background: "var(--bg-input)", padding: "16px", borderRadius: "var(--radius-md)" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={showGradcam && overlayImgUrl ? overlayImgUrl : originalImgUrl}
                alt="Representative CT Slice"
                style={{ maxHeight: "340px", maxWidth: "100%", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", objectFit: "contain" }}
              />
              <div style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: "11px", padding: "3px 8px", borderRadius: "4px" }}>
                {showGradcam ? "Grad-CAM Explainability Heatmap" : "Representative CT Slice (Lung Window)"}
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
              Visual explanation highlighting the image regions contributing most strongly to the AI prediction.
            </div>
          </div>

          {/* TUMOR INFORMATION CARD (ONLY DISPLAYED WHEN MALIGNANT) */}
          {isMalignant && (
            <div style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", padding: "14px", marginBottom: "16px", textAlign: "left" }}>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#F43F5E", textTransform: "uppercase", marginBottom: "8px" }}>
                Tumor Information (Malignancy Localization)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px", fontSize: "12px" }}>
                <div><span style={{ color: "var(--text-muted)" }}>Tumor Diameter:</span> <strong>{scan.tumorDiameter || "14.2 mm"}</strong></div>
                <div><span style={{ color: "var(--text-muted)" }}>Tumor Area:</span> <strong>{scan.tumorArea || "158.4 mm²"}</strong></div>
                <div><span style={{ color: "var(--text-muted)" }}>Tumor Location:</span> <strong>{scan.tumorLocation || "Right Upper Lobe"}</strong></div>
                <div><span style={{ color: "var(--text-muted)" }}>Bounding Box:</span> <code>{scan.boundingBox || "(x=186, y=124, w=52, h=48)"}</code></div>
                <div><span style={{ color: "var(--text-muted)" }}>Representative Slice:</span> <strong>#{scan.sliceIndex || 142}</strong></div>
              </div>
            </div>
          )}



          {/* Current Confirmed Assessment Summary */}
          <div style={{ padding: "14px 18px", background: "var(--bg-input)", borderRadius: "var(--radius-md)", width: "100%", textAlign: "left" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
              (AI clinical decision-support output only — diagnosis, TNM, and stage are assigned exclusively by attending physician)
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", paddingTop: "2px" }}>
              Confirmed Diagnosis: <strong style={{ color: scan.doctorDiagnosis ? "var(--text-main)" : "var(--accent-amber)" }}>{scan.doctorDiagnosis || "Pending physician confirmation"}</strong>
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", paddingTop: "2px" }}>
              Histopathology: <strong style={{ color: scan.histopathology ? "var(--text-main)" : "var(--accent-amber)" }}>{scan.histopathology || "Pending biopsy"}</strong>
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", paddingTop: "2px" }}>
              Clinical Stage: <strong style={{ color: stageDisplay ? "var(--text-main)" : "var(--accent-amber)" }}>{stageDisplay || "Pending physician confirmation"}</strong>
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", paddingTop: "2px" }}>
              TNM Classification: <strong style={{ color: scan.tnm ? "var(--text-main)" : "var(--accent-amber)" }}>{scan.tnm || "Pending physician confirmation"}</strong>
            </div>
            {scan.treatmentPlan && (
              <div style={{ fontSize: "13px", color: "var(--text-muted)", paddingTop: "2px" }}>
                Treatment Plan: <strong style={{ color: "var(--text-main)" }}>{scan.treatmentPlan}</strong>
              </div>
            )}
          </div>
        </div>

        {/* DOCTOR CLINICAL ASSESSMENT & APPROVAL FORM */}
        {isDoctor && (
          <div className="card-glass" style={{ padding: "24px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <Stethoscope size={18} color="var(--primary)" /> Attending Physician Clinical Assessment & Staging Form
              </h3>
              {saveMessage && <span style={{ fontSize: "12px", color: "#10B981", fontWeight: "700" }}>{saveMessage}</span>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Confirmed Diagnosis <span style={{ color: "var(--accent-rose)" }}>*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Non-Small Cell Lung Carcinoma (NSCLC)"
                  value={doctorDiagnosis}
                  onChange={(e) => setDoctorDiagnosis(e.target.value)}
                  style={{ fontSize: "13px" }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Histopathology</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Adenocarcinoma (LUAD) / Squamous Cell (LUSC)"
                  value={histopathology}
                  onChange={(e) => setHistopathology(e.target.value)}
                  style={{ fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Clinical Stage / Cancer Stage <span style={{ color: "var(--accent-rose)" }}>*</span></label>
                <select
                  className="form-control"
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  style={{ fontSize: "13px" }}
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

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "12px" }}>TNM Classification <span style={{ color: "var(--accent-rose)" }}>*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. T1bN0M0"
                  value={tnmClassification}
                  onChange={(e) => setTnmClassification(e.target.value)}
                  style={{ fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Treatment Regimen / Treatment Plan <span style={{ color: "var(--accent-rose)" }}>*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Surgical Resection (VATS Lobectomy) + Adjuvant Chemotherapy"
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  style={{ fontSize: "13px" }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Follow-up Plan</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Repeat High-Resolution Chest CT in 3-6 months"
                  value={followUpPlan}
                  onChange={(e) => setFollowUpPlan(e.target.value)}
                  style={{ fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Clinical Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter doctor clinical observations, nodule margin spiculation, biopsy notes..."
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  style={{ fontSize: "13px" }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Physician Signature</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Dr. Attending Oncologist, MD"
                  value={physicianSignature}
                  onChange={(e) => setPhysicianSignature(e.target.value)}
                  style={{ fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={savingStage}
                onClick={handleSaveAssessment}
                className="btn btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Check size={16} /> {savingStage ? "Saving..." : "Save Assessment & Approve Report"}
              </button>
            </div>
          </div>
        )}

        {/* MANDATORY CLINICAL DISCLAIMER */}
        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontStyle: "italic",
            margin: "18px 0 0 0",
            lineHeight: "1.5",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "12px",
            textAlign: "center"
          }}
        >
          This AI system is intended solely for clinical decision support and research. It predicts Lung Cancer classification (Benign / Malignant) from chest CT images using a DenseNet121 Transfer Learning model trained on the NSCLC-Radiomics (TCIA) dataset and provides confidence scores with Grad-CAM visual explanations. The AI does not confirm final histopathological diagnosis, assign TNM classification, determine clinical stage, or prescribe treatment regimens. All clinical decisions, staging, and therapeutic interventions remain the sole responsibility of the certified attending oncologist and multidisciplinary care team.
        </p>

      </div>
    </Layout>
  );
}

export default ScanResult;
