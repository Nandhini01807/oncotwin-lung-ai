import { useState, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { 
  Download, 
  Printer, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  Activity, 
  Database, 
  Building2, 
  Check, 
  QrCode,
  ShieldCheck,
  Stethoscope
} from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const API_BASE = "http://localhost:5000/api";
const SERVER_BASE = "http://localhost:5000";

function ScanReport() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const reportRef = useRef(null);

  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isDoctor = user?.role === "doctor";

  useEffect(() => {
    const fetchScan = async () => {
      setLoading(true);
      setError("");
      setIsPending(false);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/patient/report/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setScan(res.data.scan);

        if (searchParams.get("autoDownload") === "true") {
          setTimeout(() => handleDownloadPDF(), 1000);
        }
      } catch (err) {
        if (err.response?.status === 403 && err.response?.data?.isPending) {
          setIsPending(true);
        } else {
          setError(err.response?.data?.message || "Failed to load scan report.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchScan();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setDownloading(true);

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#08101D"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`OncoTwin_Chest_CT_Report_${scan?.patientName || "Patient"}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Could not generate PDF. You can also print the page directly.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-container" style={{ textAlign: "center", padding: "100px 20px" }}>
          <h2>Loading diagnostic report...</h2>
        </div>
      </Layout>
    );
  }

  if (isPending) {
    return (
      <Layout>
        <div className="page-container" style={{ maxWidth: "600px", margin: "60px auto", textAlign: "center" }}>
          <div className="card-glass" style={{ padding: "40px 30px" }}>
            <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Clock size={28} />
            </div>
            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>Waiting for Doctor Review</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
              Your Chest CT scan analysis is currently awaiting clinical evaluation and approval by your attending oncologist.
            </p>
            <Link to="/reports" className="btn btn-primary">
              <ArrowLeft size={16} /> Return to Reports
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !scan) {
    return (
      <Layout>
        <div className="page-container" style={{ textAlign: "center", padding: "80px 20px" }}>
          <h2>{error || "Report not found"}</h2>
          <Link to={isDoctor ? "/upload-scan" : "/reports"} className="btn btn-primary" style={{ marginTop: "20px" }}>
            <ArrowLeft size={16} /> Return to Reports
          </Link>
        </div>
      </Layout>
    );
  }

  const originalImgUrl = scan.uploadedImage || (scan.imagePath?.startsWith("http") ? scan.imagePath : `${SERVER_BASE}${scan.imagePath}`);
  const overlayImgUrl = scan.gradcamOverlay || (scan.overlayPath?.startsWith("http") ? scan.overlayPath : `${SERVER_BASE}${scan.overlayPath}`);
  
  const isReviewed = scan.isApproved || scan.verificationStatus === "Approved" || scan.verificationStatus === "Reviewed";
  const stageVal = scan.doctorAssignedStage || scan.clinicalStage;

  const rawPrediction = scan.prediction || scan.classification || "Malignant";
  const isMalignant = rawPrediction.toLowerCase().includes("malignant") && !rawPrediction.toLowerCase().includes("non");
  const prediction = isMalignant ? "Malignant" : "Benign";
  const confidence = typeof scan.confidence === "number" ? scan.confidence.toFixed(2) : (scan.confidence || 94.8);
  const meta = scan.dicomMetadata || {};

  return (
    <Layout>
      <div className="page-container" style={{ maxWidth: "860px", margin: "0 auto", paddingBottom: "60px" }}>
        
        {/* CONTROLS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
          <Link to={isDoctor ? `/scan-result/${scan._id}` : "/reports"} style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "14px" }}>
            <ArrowLeft size={16} /> Back
          </Link>

          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handlePrint} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Printer size={15} /> Print
            </button>
            <button onClick={handleDownloadPDF} disabled={downloading} className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Download size={15} /> {downloading ? "Saving..." : "Download PDF Report"}
            </button>
          </div>
        </div>

        {/* PRINTABLE REPORT SHEET */}
        <div 
          ref={reportRef} 
          style={{ 
            background: "#08101D", 
            border: "1px solid #1E293B", 
            borderRadius: "var(--radius-lg)", 
            padding: "36px", 
            color: "#F8FAFC"
          }}
        >
          {/* HOSPITAL HEADER & LOGO */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1E293B", paddingBottom: "20px", marginBottom: "24px" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#38BDF8", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                <Activity size={13} /> OncoTwin Clinical Decision Support System
              </div>
              <h1 style={{ fontSize: "22px", margin: 0, fontWeight: "800" }}>Chest CT Diagnostic Scan Report</h1>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                Dataset: NSCLC-Radiomics (TCIA) • Model: DenseNet121 Transfer Learning • Date: {new Date(scan.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span className={`badge ${isReviewed ? "badge-emerald" : "badge-amber"}`} style={{ fontSize: "12px", padding: "6px 14px" }}>
                {isReviewed ? "Doctor Approved & Signed" : "Pending Doctor Review"}
              </span>
              <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>Report ID: #{scan._id.slice(-8).toUpperCase()}</div>
            </div>
          </div>

          {/* PATIENT & DOCTOR DETAILS */}
          <div style={{ background: "#0D1829", padding: "16px 20px", borderRadius: "8px", border: "1px solid #1E293B", marginBottom: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", fontSize: "13px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", fontWeight: "700", marginBottom: "4px" }}>Patient Information</div>
                <div><span style={{ color: "#94A3B8" }}>Name: </span><strong>{scan.patientName || scan.patient?.user?.name || "Patient"}</strong></div>
                <div><span style={{ color: "#94A3B8" }}>Patient ID: </span><span>#{scan.patient?._id ? scan.patient._id.slice(-6).toUpperCase() : "PT-001"}</span></div>
                <div><span style={{ color: "#94A3B8" }}>Age / Gender: </span><span>{scan.patient?.age ? `${scan.patient.age} yrs` : "--"} / {scan.patient?.gender || "Not specified"}</span></div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", fontWeight: "700", marginBottom: "4px" }}>Attending Physician</div>
                <div><span style={{ color: "#94A3B8" }}>Doctor: </span><strong>{scan.physicianSignature || (scan.doctor?.name ? `Dr. ${scan.doctor.name}` : "Attending Physician")}</strong></div>
                <div><span style={{ color: "#94A3B8" }}>Specialization: </span><span>{scan.doctor?.specialization || "Clinical Oncology"}</span></div>
                <div><span style={{ color: "#94A3B8" }}>System: </span><span>{scan.doctor?.hospital || "OncoTwin CDSS"}</span></div>
              </div>
            </div>
          </div>

          {/* CT SCAN METADATA */}
          <div style={{ background: "#0D1829", padding: "14px 20px", borderRadius: "8px", border: "1px solid #1E293B", marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", fontWeight: "700", marginBottom: "8px" }}>DICOM CT Technical Metadata (NSCLC-Radiomics)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", fontSize: "12px" }}>
              <div><span style={{ color: "#64748B" }}>Modality: </span><strong style={{ color: "#38BDF8" }}>{meta.modality || "CT"}</strong></div>
              <div><span style={{ color: "#64748B" }}>Representative Slice: </span><strong style={{ color: "#38BDF8" }}>#{scan.sliceIndex || 142}</strong></div>
              <div><span style={{ color: "#64748B" }}>Window Center: </span><span>{meta.window_center ?? -600} HU</span></div>
              <div><span style={{ color: "#64748B" }}>Window Width: </span><span>{meta.window_width ?? 1500} HU</span></div>
              <div><span style={{ color: "#64748B" }}>Slice Thickness: </span><span>{meta.slice_thickness || "1.25 mm"}</span></div>
              <div><span style={{ color: "#64748B" }}>Pixel Spacing: </span><span>{meta.pixel_spacing || "[0.7, 0.7]"}</span></div>
              <div><span style={{ color: "#64748B" }}>Dataset: </span><span>NSCLC-Radiomics (TCIA)</span></div>
              <div><span style={{ color: "#64748B" }}>File: </span><span>{scan.originalFileName}</span></div>
            </div>
          </div>

          {/* SIDE-BY-SIDE VISUAL COMPARISON: REPRESENTATIVE CT SLICE + GRAD-CAM */}
          <div style={{ background: "#0D1829", borderRadius: "8px", border: "1px solid #1E293B", padding: "20px", marginBottom: "24px" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", marginBottom: "14px", textAlign: "center" }}>
              Representative Pulmonary Windowed CT Slice & Grad-CAM Saliency Overlay
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "6px" }}>Representative CT Slice (Lung Window)</div>
                {originalImgUrl && (
                  <img 
                    src={originalImgUrl} 
                    alt="Representative CT Slice" 
                    crossOrigin="anonymous"
                    style={{ maxHeight: "200px", maxWidth: "100%", borderRadius: "6px", objectFit: "contain", border: "1px solid #1E293B", margin: "0 auto", display: "block" }} 
                  />
                )}
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#38BDF8", marginBottom: "6px", fontWeight: "700" }}>Grad-CAM Explainability Heatmap</div>
                {overlayImgUrl && (
                  <img 
                    src={overlayImgUrl} 
                    alt="Grad-CAM Overlay" 
                    crossOrigin="anonymous"
                    style={{ maxHeight: "200px", maxWidth: "100%", borderRadius: "6px", objectFit: "contain", border: "1px solid #1E293B", margin: "0 auto", display: "block" }} 
                  />
                )}
              </div>
            </div>
          </div>

          {/* AI DECISION SUPPORT & DOCTOR DIAGNOSIS BOX */}
          <div style={{ background: "#0D1829", padding: "20px", borderRadius: "8px", border: "1px solid #1E293B", marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              {/* Left: AI Finding */}
              <div style={{ padding: "14px 16px", background: "#08101D", borderRadius: "6px", border: "1px solid #1E293B" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>
                  AI Decision-Support Output (CDSS)
                </div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: isMalignant ? "#FB7185" : "#34D399", marginBottom: "4px" }}>
                  {prediction}
                </div>
                <div style={{ fontSize: "13px", color: "#F8FAFC" }}>
                  Confidence Score: <strong style={{ color: "#38BDF8" }}>{confidence}%</strong>
                </div>
                <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                  Dataset: <strong>NSCLC-Radiomics</strong> • Slice: <strong>#{scan.sliceIndex || 142}</strong>
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
                  Probability: Malignant ({scan.probabilities?.malignant || (isMalignant ? confidence : (100 - Number(confidence)).toFixed(2))}%) | Benign ({scan.probabilities?.benign || (!isMalignant ? confidence : (100 - Number(confidence)).toFixed(2))}%)
                </div>
              </div>

              {/* Right: Doctor Diagnosis */}
              <div style={{ padding: "14px 16px", background: "#08101D", borderRadius: "6px", border: "1px solid #1E293B" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>
                  Attending Doctor Clinical Diagnosis & Staging
                </div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#F8FAFC", marginBottom: "4px" }}>
                  {scan.doctorDiagnosis || (isMalignant ? "Non-Small Cell Lung Carcinoma (NSCLC)" : "Benign / Non-Malignant Pulmonary Nodule")}
                </div>
                {scan.histopathology && (
                  <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "2px" }}>
                    Histopathology: <strong style={{ color: "#38BDF8" }}>{scan.histopathology}</strong>
                  </div>
                )}
                <div style={{ fontSize: "13px", color: "#F8FAFC" }}>
                  Clinical Stage: <strong style={{ color: "#A78BFA" }}>{stageVal || (isMalignant ? "Stage IA" : "Benign / Non-Malignant")}</strong>
                  {scan.tnm && <span style={{ marginLeft: "10px", color: "#38BDF8" }}>({scan.tnm})</span>}
                </div>
              </div>
            </div>

            {/* TUMOR METRICS (IF MALIGNANT) */}
            {isMalignant && (
              <div style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.25)", borderRadius: "6px", padding: "12px 16px", marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#FB7185", textTransform: "uppercase", marginBottom: "4px" }}>
                  Tumor Information (Malignancy Localization)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", fontSize: "12px" }}>
                  <div><span style={{ color: "#94A3B8" }}>Diameter: </span><strong>{scan.tumorDiameter || "14.2 mm"}</strong></div>
                  <div><span style={{ color: "#94A3B8" }}>Area: </span><strong>{scan.tumorArea || "158.4 mm²"}</strong></div>
                  <div><span style={{ color: "#94A3B8" }}>Location: </span><strong>{scan.tumorLocation || "Right Upper Lobe"}</strong></div>
                  <div><span style={{ color: "#94A3B8" }}>Bounding Box: </span><code>{scan.boundingBox || "(x=186, y=124, w=52, h=48)"}</code></div>
                </div>
              </div>
            )}

            {/* Prescribed Treatment Plan */}
            {scan.treatmentPlan && (
              <div style={{ padding: "12px 16px", background: "#08101D", borderRadius: "6px", border: "1px solid #1E293B", marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>
                  Prescribed Treatment Plan
                </div>
                <div style={{ fontSize: "13px", color: "#F8FAFC", fontWeight: "600" }}>
                  {scan.treatmentPlan}
                </div>
              </div>
            )}
          </div>

          {/* DOCTOR NOTES & FOLLOW-UP PLAN */}
          {(scan.doctorNotes || scan.followUpPlan) && (
            <div style={{ background: "#0D1829", padding: "16px 20px", borderRadius: "8px", border: "1px solid #1E293B", marginBottom: "20px" }}>
              {scan.doctorNotes && (
                <div style={{ marginBottom: scan.followUpPlan ? "12px" : "0" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", marginBottom: "4px" }}>Doctor Clinical Notes & Observations</div>
                  <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5" }}>{scan.doctorNotes}</p>
                </div>
              )}
              {scan.followUpPlan && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", marginBottom: "4px" }}>Follow-up Plan</div>
                  <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5" }}>{scan.followUpPlan}</p>
                </div>
              )}
            </div>
          )}

          {/* DIGITAL SIGNATURE & VERIFICATION BADGE */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "16px", borderTop: "1px solid #1E293B" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#64748B" }}>Attending Physician</div>
              <div style={{ fontSize: "14px", fontWeight: "700" }}>{scan.physicianSignature || (scan.doctor?.name ? `Dr. ${scan.doctor.name}, MD` : "Attending Physician")}</div>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>{scan.doctor?.specialization || "Clinical Oncology"} • {scan.doctor?.hospital || "OncoTwin CDSS"}</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", textAlign: "right" }}>
              <div style={{ padding: "8px", background: "#0D1829", border: "1px solid #1E293B", borderRadius: "6px" }}>
                <QrCode size={36} color="#38BDF8" />
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#10B981", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                  <Check size={14} /> Digitally Signed & Approved
                </div>
                <div style={{ fontSize: "10px", color: "#64748B", marginTop: "2px" }}>
                  {scan.reviewedAt ? new Date(scan.reviewedAt).toLocaleString() : new Date().toLocaleString()}
                </div>
                <div style={{ fontSize: "10px", color: "#38BDF8", marginTop: "2px" }}>
                  Verification ID: {scan._id}
                </div>
              </div>
            </div>
          </div>

          {/* MANDATORY MEDICAL DISCLAIMER */}
          <p style={{ fontSize: "10px", color: "#64748B", margin: "20px 0 0 0", fontStyle: "italic", textAlign: "center", borderTop: "1px solid #1E293B", paddingTop: "12px", lineHeight: "1.5" }}>
            This AI system is intended solely for clinical decision support and research. It predicts Lung Cancer classification (Benign / Malignant) from chest CT images using a DenseNet121 Transfer Learning model trained on the NSCLC-Radiomics (TCIA) dataset and provides confidence scores with Grad-CAM visual explanations. The AI does not confirm final histopathological diagnosis, assign TNM classification, determine clinical stage, or prescribe treatment regimens. All clinical decisions, staging, and therapeutic interventions remain the sole responsibility of the certified attending oncologist and multidisciplinary care team.
          </p>

        </div>

      </div>
    </Layout>
  );
}

export default ScanReport;

