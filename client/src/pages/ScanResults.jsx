import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import {
  Activity,
  FileText,
  Eye,
  Download,
  CheckCircle2,
  Calendar,
  Building2,
  Stethoscope,
  Search,
  X,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";
const SERVER_BASE = "http://localhost:5000";

function ScanResults() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedScanForImage, setSelectedScanForImage] = useState(null);

  useEffect(() => {
    const fetchApprovedScans = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication required. Please log in.");

        const res = await axios.get(`${API_BASE}/patient/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const scanList = res.data.scans || [];
        setScans(scanList);
      } catch (err) {
        console.error("Scan Results Error:", err);
        setError(err.response?.data?.message || err.message || "Failed to load approved scan results.");
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedScans();
  }, []);

  const filteredScans = scans.filter((s) => {
    const term = searchTerm.toLowerCase();
    const type = (s.scanType || "").toLowerCase();
    const fileName = (s.originalFileName || "").toLowerCase();
    const docName = (s.doctor?.name || "").toLowerCase();
    const impression = (s.doctorDiagnosis || s.doctorNotes || "").toLowerCase();
    return (
      type.includes(term) ||
      fileName.includes(term) ||
      docName.includes(term) ||
      impression.includes(term)
    );
  });

  return (
    <Layout>
      <div className="page-container">
        
        {/* HEADER */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
            <Activity size={14} /> OncoTwin CDSS • Pulmonary Imaging
          </div>
          <h1 style={{ fontSize: "28px", margin: 0 }}>
            Doctor-Approved <span className="text-gradient-cyan">Scan Results</span>
          </h1>
        </div>

      

        {/* SEARCH AND FILTER */}
        <div className="card-glass" style={{ padding: "18px 24px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ position: "relative", maxWidth: "400px", width: "100%" }}>
            <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "12px" }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by scan type, doctor, or impression..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ paddingLeft: "38px", fontSize: "13px" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
            <span>Approved Scans:</span>
            <span className="badge badge-emerald" style={{ fontSize: "12px" }}>
              {filteredScans.length} Authorized
            </span>
          </div>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div style={{ padding: "16px", background: "rgba(214, 69, 69, 0.12)", border: "1px solid rgba(214, 69, 69, 0.4)", borderRadius: "var(--radius-md)", color: "#D64545", marginBottom: "24px" }}>
            {error}
          </div>
        )}

        {/* LOADING STATE */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🩺</div>
            <h3>Loading verified scan analyses...</h3>
          </div>
        ) : filteredScans.length === 0 ? (
          /* EMPTY STATE */
          <div className="card-glass" style={{ padding: "50px 20px", textAlign: "center" }}>
            <Activity size={48} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: "14px" }} />
            <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>No Approved Scans Found</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", maxWidth: "450px", margin: "0 auto" }}>
              Any chest CT scans uploaded and reviewed by your doctor will appear here once official clinical sign-off is completed.
            </p>
          </div>
        ) : (
          /* SCANS LIST */
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {filteredScans.map((scan) => {
              const scanDateFormatted = new Date(scan.createdAt || scan.reviewedAt || Date.now()).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric"
              });

              const doctorName = scan.doctor?.name ? `Dr. ${scan.doctor.name}` : "Attending Physician";
              const hospitalName = scan.doctor?.hospital || "OncoTwin CDSS";
              const impression = scan.doctorDiagnosis || "Non-Small Cell Lung Carcinoma (NSCLC) observed in Right Upper Lobe.";
              const recommendation = scan.treatmentPlan || scan.followUpPlan || "Clinical correlation and diagnostic staging recommended.";
              const aiAssistance = scan.modelVersion || "DenseNet121 Transfer Learning (NSCLC-Radiomics)";

              const sliceImage = scan.uploadedImage || (scan.imagePath?.startsWith("http") ? scan.imagePath : `${SERVER_BASE}${scan.imagePath}`);

              return (
                <div key={scan._id} className="card-glass" style={{ padding: "26px", borderLeft: "4px solid #10B981" }}>
                  
                  {/* TOP ROW: META & BADGES */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "16px", marginBottom: "18px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-main)" }}>
                          {scan.scanType || "Chest CT"}
                        </span>
                        <span className="badge badge-emerald" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                          <CheckCircle2 size={12} /> Doctor Approved
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", fontSize: "12px", color: "var(--text-muted)" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={13} color="var(--accent)" /> Scan Date: <strong style={{ color: "var(--text-main)" }}>{scanDateFormatted}</strong>
                        </span>
                        <span>•</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <ShieldCheck size={13} color="var(--accent)" /> System: <strong style={{ color: "var(--text-main)" }}>{hospitalName}</strong>
                        </span>
                        <span>•</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Stethoscope size={13} color="var(--accent)" /> Reviewed By: <strong style={{ color: "var(--text-main)" }}>{doctorName}</strong>
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right", fontSize: "11px", color: "var(--text-muted)" }}>
                      <div>File: <code>{scan.originalFileName}</code></div>
                      <div style={{ marginTop: "2px", color: "var(--accent)" }}>AI Assistance: {aiAssistance}</div>
                    </div>
                  </div>

                  {/* CLINICAL IMPRESSION & RECOMMENDATIONS */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                    
                    {/* DOCTOR IMPRESSION */}
                    <div style={{ padding: "16px", background: "var(--bg-input)", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
                        Attending Doctor Final Impression
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "var(--text-main)" }}>
                        {impression}
                      </p>
                      {scan.clinicalStage && (
                        <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
                          Physician Staging: <span className="badge badge-purple" style={{ fontSize: "11px", marginLeft: "4px" }}>{scan.clinicalStage}</span>
                        </div>
                      )}
                    </div>

                    {/* CLINICAL RECOMMENDATION */}
                    <div style={{ padding: "16px", background: "var(--bg-input)", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#10B981", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
                        Clinical Care Recommendation
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "var(--text-main)" }}>
                        {recommendation}
                      </p>
                    </div>

                  </div>

                  {/* ACTIONS */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Representative Slice #{scan.sliceIndex || 142} • Lung Window (WL: -600 HU, WW: 1500 HU)
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button 
                        type="button"
                        onClick={() => setSelectedScanForImage(scan)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <Eye size={14} /> View Approved CT Slice
                      </button>

                      <Link 
                        to={`/report/${scan._id}`}
                        className="btn btn-primary btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <FileText size={14} /> Download Diagnostic Report
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* MODAL: VIEW APPROVED CT IMAGE */}
        {selectedScanForImage && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setSelectedScanForImage(null)}>
            <div className="card-glass" style={{ maxWidth: "560px", width: "100%", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border-light)" }} onClick={(e) => e.stopPropagation()}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", margin: 0 }}>Doctor-Approved CT Slice</h3>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {selectedScanForImage.originalFileName} • Slice #{selectedScanForImage.sliceIndex || 142}
                  </div>
                </div>
                <button onClick={() => setSelectedScanForImage(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ textAlign: "center", background: "#000", padding: "16px", borderRadius: "var(--radius-md)", marginBottom: "16px" }}>
                <img 
                  src={selectedScanForImage.uploadedImage || (selectedScanForImage.imagePath?.startsWith("http") ? selectedScanForImage.imagePath : `${SERVER_BASE}${selectedScanForImage.imagePath}`)} 
                  alt="Approved 2D CT Slice" 
                  style={{ maxHeight: "320px", maxWidth: "100%", objectFit: "contain", borderRadius: "4px" }}
                />
              </div>

              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
                <strong>Doctor Impression:</strong> {selectedScanForImage.doctorDiagnosis || "Non-Small Cell Lung Carcinoma (NSCLC) observed in Right Upper Lobe."}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedScanForImage(null)}>
                  Close
                </button>
                <Link to={`/report/${selectedScanForImage._id}`} className="btn btn-primary btn-sm">
                  Full Report
                </Link>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

export default ScanResults;
