import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { 
  Activity, 
  Cpu, 
  BrainCircuit, 
  ShieldCheck, 
  ArrowRight, 
  Microscope, 
  TrendingUp, 
  CheckCircle2, 
  Sparkles,
  Play,
  UploadCloud,
  FileText,
  Sliders,
  Layers,
  HeartPulse,
  UserCheck,
  Stethoscope,
  ChevronRight,
  Zap
} from "lucide-react";

function Home() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoInput, setDemoInput] = useState({ age: 54, tumorSize: 2.8, egfr: "Positive" });
  const [demoResult, setDemoResult] = useState(null);

  const calculateQuickRisk = () => {
    const score = Math.min(88, Math.round((demoInput.age * 0.4) + (demoInput.tumorSize * 12) + (demoInput.egfr === "Positive" ? 18 : 5)));
    setDemoResult({
      score,
      level: score > 70 ? "High Risk Diagnostic Signal" : score > 45 ? "Moderate Risk Diagnostic Signal" : "Low Risk Diagnostic Signal",
      color: score > 70 ? "var(--accent-rose)" : score > 45 ? "var(--accent-amber)" : "var(--accent-emerald)"
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-dark)" }}>
      <Navbar />

      {/* Hero Section */}
      <section className="page-container" style={{ paddingTop: "60px", paddingBottom: "80px" }}>
        <div className="hero-section">
          <div>
            <div className="badge badge-cyan" style={{ marginBottom: "20px", padding: "8px 16px" }}>
              <Sparkles size={14} /> AI-Assisted Clinical Decision Support System
            </div>

            <h1 style={{ fontSize: "46px", lineHeight: "1.15", marginBottom: "24px", fontWeight: "800" }}>
              AI-Assisted Lung Cancer Detection <br />
              <span className="text-gradient-cyan">Clinical Decision Support System</span>
            </h1>

            <p style={{ fontSize: "16px", color: "var(--text-muted)", lineHeight: "1.7", marginBottom: "32px" }}>
              OncoTwin is an Explainable AI-assisted Clinical Decision Support System for Lung Cancer Detection from Chest CT DICOM images. The system uses a DenseNet121 Transfer Learning model trained on the NSCLC-Radiomics (TCIA) dataset to classify scans into Benign vs Malignant, calculate calibrated confidence scores, and generate Grad-CAM visual explainability heatmaps. The attending physician reviews the AI output, confirms the diagnosis, assigns the official TNM classification and AJCC clinical stage, prescribes the treatment regimen, and approves the final diagnostic report.
            </p>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link to="/upload-scan" className="btn btn-primary btn-lg" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <Zap size={18} /> Doctor Scan Analysis (.dcm) <ArrowRight size={18} />
              </Link>
              <Link to="/digital-twin" className="btn btn-secondary btn-lg">
                Explore Digital Twin
              </Link>
            </div>

            {/* Mandatory Medical Disclaimer Banner */}
            <div style={{ marginTop: "28px", padding: "14px 18px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "flex-start", gap: "12px", maxWidth: "680px" }}>
              <ShieldCheck size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                <strong>Clinical Disclaimer:</strong> This AI system is intended solely for clinical decision support and research. It predicts Lung Cancer classification (Benign / Malignant) from chest CT images using a DenseNet121 Transfer Learning model trained on the NSCLC-Radiomics (TCIA) dataset and provides confidence scores with Grad-CAM visual explanations. The AI does not confirm final histopathological diagnosis, assign TNM classification, determine clinical stage, or prescribe treatment regimens. All clinical decisions, staging, and therapeutic interventions remain the sole responsibility of the certified attending oncologist and multidisciplinary care team.
              </div>
            </div>

            <div style={{ display: "flex", gap: "32px", marginTop: "36px", paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
              <div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--accent-cyan)" }}>NSCLC-Radiomics</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>TCIA Benchmark Dataset (422 Pts)</div>
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--accent-purple)" }}>DenseNet121</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Transfer Learning Architecture</div>
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--accent-emerald)" }}>Grad-CAM</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Visual Heatmap Explainability</div>
              </div>
            </div>
          </div>

          {/* Hero Interactive Orb */}
          <div className="hero-graphic">
            <div className="twin-orb">
              <div style={{ textAlign: "center", zIndex: 10 }}>
                <div style={{ fontSize: "48px" }}>🫁</div>
                <div style={{ fontWeight: "800", fontSize: "18px", color: "white", marginTop: "8px" }}>NSCLC-Radiomics CDSS</div>
                <div style={{ fontSize: "12px", color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>CHEST CT DICOM (.DCM)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-STEP CLINICAL WORKFLOW SECTION */}
      <section style={{ background: "rgba(18, 59, 93, 0.2)", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)", padding: "80px 0" }}>
        <div className="page-container">
          <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 50px" }}>
            <div className="badge badge-purple" style={{ marginBottom: "12px" }}>Clinically Realistic Workflow</div>
            <h2 style={{ fontSize: "36px", marginBottom: "16px" }}>How OncoTwin CDSS Works</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "16px" }}>
              From Chest CT DICOM upload to physician-approved clinical staging and reports.
            </p>
          </div>

          <div className="grid-3" style={{ gap: "24px" }}>
            
            {/* Step 1 */}
            <div className="card-glass text-center" style={{ padding: "32px 24px", position: "relative" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(6, 182, 212, 0.15)", color: "var(--accent-cyan)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "22px", fontWeight: "800" }}>
                1
              </div>
              <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>DICOM Chest CT Upload</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6" }}>
                Doctor uploads a Chest CT DICOM (.dcm) file (up to 50 MB) to extract representative pulmonary windowed slices (WL = -600 HU, WW = 1500 HU).
              </p>
            </div>

            {/* Step 2 */}
            <div className="card-glass text-center" style={{ padding: "32px 24px", position: "relative" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(139, 92, 246, 0.15)", color: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "22px", fontWeight: "800" }}>
                2
              </div>
              <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>DenseNet121 + Grad-CAM</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6" }}>
                AI model predicts Benign vs Malignant classification, calibrated confidence score (%), and generates Grad-CAM saliency heatmaps for visual explainability.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card-glass text-center" style={{ padding: "32px 24px", position: "relative" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "22px", fontWeight: "800" }}>
                3
              </div>
              <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>Doctor Staging & Approval</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6" }}>
                Attending physician confirms diagnosis, assigns official TNM staging (Stage IA–IVB), prescribes treatment regimen, and approves the final report before patient visibility.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section style={{ padding: "80px 0" }}>
        <div className="page-container">
          <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 60px" }}>
            <h2 style={{ fontSize: "36px", marginBottom: "16px" }}>Complete Oncology Intelligence Suite</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "16px" }}>
              Empowering oncologists and patients with quantitative biological modeling and transparent decision support.
            </p>
          </div>

          <div className="grid-3">
            <div className="card-glass">
              <div className="stat-icon" style={{ background: "rgba(6, 182, 212, 0.15)", color: "var(--accent-cyan)", marginBottom: "20px" }}>
                <Cpu size={24} />
              </div>
              <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>Genomic Twin Blueprint</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6" }}>
                Construct virtual twin biological models using DNA sequencing data, EGFR/TP53 mutation markers, tumor microenvironment parameters, and tissue histology.
              </p>
            </div>

            <div className="card-glass">
              <div className="stat-icon" style={{ background: "rgba(139, 92, 246, 0.15)", color: "var(--accent-purple)", marginBottom: "20px" }}>
                <BrainCircuit size={24} />
              </div>
              <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>Clinical Risk Screening</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6" }}>
                Transparent rules-based checklists evaluate patient clinical history, key symptoms, and risk factors to assist oncologists with auditable decision support.
              </p>
            </div>

            <div className="card-glass">
              <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)", marginBottom: "20px" }}>
                <TrendingUp size={24} />
              </div>
              <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>Virtual Therapy Simulation</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6" }}>
                Adjust educational simulation parameters to explore how a hypothetical tumor trajectory changes; outputs are not clinical treatment recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Portal Selector Section */}
      <section className="page-container" style={{ padding: "0 32px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontSize: "32px", marginBottom: "12px" }}>Select Your Role-Based Workspace</h2>
          <p style={{ color: "var(--text-muted)" }}>Dedicated clinical environments tailored for oncologists and patients.</p>
        </div>

        <div className="grid-2" style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div className="card-glass card-glass-glow" style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>👩‍⚕️</div>
            <h3 style={{ fontSize: "22px", marginBottom: "12px" }}>For Oncologists & Doctors</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px", lineHeight: "1.5" }}>
              Access patient cohort tables, AI decision support systems (CDSS), treatment sensitivity matrices, and urgent clinical alert feeds.
            </p>
            <Link to="/doctor-dashboard" className="btn btn-primary" style={{ width: "100%" }}>
              Enter Doctor Portal <Stethoscope size={16} />
            </Link>
          </div>

          <div className="card-glass card-glass-glow" style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏥</div>
            <h3 style={{ fontSize: "22px", marginBottom: "12px" }}>For Patients & Caregivers</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px", lineHeight: "1.5" }}>
              Track your digital twin health metrics, longitudinal biomarker trends, pathology scan reports, and personalized treatment schedules.
            </p>
            <Link to="/dashboard" className="btn btn-secondary" style={{ width: "100%" }}>
              Enter Patient Portal <UserCheck size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border-color)", padding: "32px 0", textAlign: "center", color: "var(--text-dim)", fontSize: "14px" }}>
        <div className="page-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🧬</span>
            <span style={{ fontWeight: "700", color: "var(--text-main)" }}>OncoTwin AI Platform</span>
          </div>
          <div>© {new Date().getFullYear()} OncoTwin Inc. ISO-27001 & HIPAA Compliant Clinical Architecture.</div>
        </div>
      </footer>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="modal-overlay" onClick={() => setShowDemoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "24px", marginBottom: "12px" }}>Clinical Risk Screening Preview</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
              Adjust patient sample clinical parameters below to test the transparent risk screening scoring logic.
            </p>

            <div className="form-group">
              <label className="form-label">Patient Age: {demoInput.age} yrs</label>
              <input 
                type="range" 
                min="20" 
                max="85" 
                value={demoInput.age} 
                onChange={(e) => setDemoInput({ ...demoInput, age: Number(e.target.value) })}
                className="slider-control" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tumor Primary Volume: {demoInput.tumorSize} cm³</label>
              <input 
                type="range" 
                min="0.5" 
                max="8.0" 
                step="0.1" 
                value={demoInput.tumorSize} 
                onChange={(e) => setDemoInput({ ...demoInput, tumorSize: Number(e.target.value) })}
                className="slider-control" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">EGFR Genetic Mutation Status</label>
              <select 
                value={demoInput.egfr} 
                onChange={(e) => setDemoInput({ ...demoInput, egfr: e.target.value })}
                className="form-control"
              >
                <option value="Positive">Positive (Exon 19 Deletion / L858R)</option>
                <option value="Wildtype">Wildtype (Negative)</option>
              </select>
            </div>

            <button onClick={calculateQuickRisk} className="btn btn-primary" style={{ width: "100%", marginTop: "12px" }}>
              Calculate Risk Screening Score
            </button>

            {demoResult && (
              <div style={{ marginTop: "24px", padding: "20px", background: "var(--bg-dark)", borderRadius: "var(--radius-md)", border: `1px solid ${demoResult.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-muted)" }}>Calculated Risk Score</span>
                  <span style={{ fontSize: "24px", fontWeight: "800", color: demoResult.color }}>{demoResult.score}%</span>
                </div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: demoResult.color }}>{demoResult.level}</div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "8px" }}>
                  * Transparent clinical risk screening checklist. Recommendation: Proceed to full Digital Twin Simulation Console.
                </div>
              </div>
            )}

            <button 
              onClick={() => setShowDemoModal(false)}
              className="btn btn-secondary btn-sm"
              style={{ position: "absolute", top: "20px", right: "20px" }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;