import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import {
  FileText,
  Download,
  Eye,
  Search,
  Calendar,
  Building2,
  Stethoscope,
  CheckCircle2,
  X,
  Printer,
  ShieldCheck
} from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication required. Please login.");

        const res = await axios.get(`${API_BASE}/reports`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setReports(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Fetch reports error:", err);
        setError(err.response?.data?.message || err.message || "Failed to load medical reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const filteredReports = reports.filter((report) => {
    const s = searchTerm.toLowerCase();
    const name = (report.reportName || "").toLowerCase();
    const id = (report.reportIdString || report._id || "").toLowerCase();
    const type = (report.reportType || "").toLowerCase();
    const doc = (report.doctorName || "").toLowerCase();
    const summary = (report.diagnosisSummary || "").toLowerCase();

    const matchesSearch = name.includes(s) || id.includes(s) || type.includes(s) || doc.includes(s) || summary.includes(s);

    if (typeFilter !== "all" && (report.reportType || "").toLowerCase() !== typeFilter.toLowerCase()) {
      return false;
    }

    return matchesSearch;
  });

  return (
    <Layout>
      <div className="page-container">
        
        {/* HEADER */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
            <FileText size={14} /> Clinical Decision Support System
          </div>
          <h1 style={{ fontSize: "28px", margin: 0 }}>
            Doctor-Approved <span className="text-gradient-cyan">Medical Reports</span>
          </h1>
        </div>


        {/* SEARCH AND FILTER BAR */}
        <div className="card-glass" style={{ padding: "16px 20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["all", "Chest CT Scan", "Biopsy Histology", "Blood Biomarkers"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setTypeFilter(tab)}
                className={`btn btn-sm ${typeFilter === tab ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "12px" }}
              >
                {tab === "all" ? `All Documents (${reports.length})` : tab}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", maxWidth: "320px", width: "100%" }}>
            <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "11px" }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search reports by ID, name, or doctor..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ paddingLeft: "32px", fontSize: "12px", height: "36px" }}
            />
          </div>
        </div>

        {error && (
          <div style={{ padding: "14px", background: "rgba(214, 69, 69, 0.12)", border: "1px solid rgba(214, 69, 69, 0.4)", borderRadius: "var(--radius-md)", color: "#D64545", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        {/* REPORTS LIST */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>📄</div>
            <h3>Loading verified medical documents...</h3>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="card-glass" style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <FileText size={48} style={{ marginBottom: "14px", opacity: 0.4 }} />
            <h3>No Medical Reports Found</h3>
            <p style={{ fontSize: "13px", maxWidth: "420px", margin: "6px auto" }}>
              No doctor-approved documents match your search criteria.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredReports.map((report) => {
              const reportId = report.reportIdString || `REP2026${report._id.slice(-4).toUpperCase()}`;
              const docName = report.doctorName || "Attending Physician";
              const hospital = report.hospital || "OncoTwin CDSS";
              const reportDateFormatted = new Date(report.reportDate || report.createdAt || Date.now()).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric"
              });

              return (
                <div 
                  key={report._id} 
                  className="card-glass"
                  style={{ 
                    padding: "22px 26px",
                    borderLeft: "4px solid #10B981"
                  }}
                >
                  {/* TOP ROW */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "14px", marginBottom: "14px" }}>
                    
                    <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "rgba(6, 182, 212, 0.12)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FileText size={22} />
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "3px" }}>
                          <strong style={{ fontSize: "16px", color: "var(--text-main)" }}>
                            {report.reportName || "Medical_Diagnostic_Report.pdf"}
                          </strong>
                          <span className="badge badge-purple">{report.reportType || "Diagnostic"}</span>
                          <span className="badge badge-emerald" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <CheckCircle2 size={11} /> Approved
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "var(--text-muted)" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Calendar size={13} color="var(--accent)" /> Date: <strong style={{ color: "var(--text-main)" }}>{reportDateFormatted}</strong>
                          </span>
                          <span>•</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Stethoscope size={13} color="var(--accent)" /> Doctor: <strong style={{ color: "var(--text-main)" }}>{docName}</strong>
                          </span>
                          <span>•</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <ShieldCheck size={13} color="var(--accent)" /> System: <strong style={{ color: "var(--text-main)" }}>{hospital}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Report ID</div>
                      <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                        {reportId}
                      </div>
                    </div>

                  </div>

                  {/* DIAGNOSIS SUMMARY & FINDINGS */}
                  <div style={{ marginBottom: "16px", background: "var(--bg-input)", padding: "14px 18px", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Clinical Diagnosis Summary
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "var(--text-main)" }}>
                      {report.diagnosisSummary || "Non-Small Cell Lung Carcinoma (NSCLC) identified in Right Upper Lobe. VATS lobectomy and clinical staging recommended."}
                    </p>
                    {report.findings && (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                        <strong>Findings:</strong> {report.findings}
                      </div>
                    )}
                  </div>

                  {/* ACTION CONTROLS */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", paddingTop: "8px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Status: <strong style={{ color: "#10B981" }}>Doctor Signed & Approved</strong>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedReport(report)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <Eye size={14} /> View Report
                      </button>

                      <button 
                        type="button" 
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setTimeout(() => window.print(), 300);
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <Download size={14} /> Download PDF
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* MODAL: VIEW REPORT DETAILS */}
        {selectedReport && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setSelectedReport(null)}>
            <div className="card-glass" style={{ maxWidth: "650px", width: "100%", padding: "30px", background: "var(--bg-card)", border: "1px solid var(--border-light)" }} onClick={(e) => e.stopPropagation()}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "14px", marginBottom: "18px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--accent)", textTransform: "uppercase", fontWeight: "700" }}>
                    {selectedReport.hospital || "OncoTwin CDSS"} • Clinical Document
                  </div>
                  <h2 style={{ fontSize: "18px", margin: "2px 0 0 0" }}>
                    {selectedReport.reportName}
                  </h2>
                </div>
                <button onClick={() => setSelectedReport(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", marginBottom: "16px" }}>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Report ID: </span>
                  <strong style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                    {selectedReport.reportIdString || `REP2026${selectedReport._id.slice(-4).toUpperCase()}`}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Report Type: </span>
                  <span className="badge badge-purple">{selectedReport.reportType}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Date: </span>
                  <strong>{new Date(selectedReport.reportDate || selectedReport.createdAt).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Physician: </span>
                  <strong>{selectedReport.doctorName || "Attending Physician"}</strong>
                </div>
              </div>

              <div style={{ background: "var(--bg-input)", padding: "16px", borderRadius: "var(--radius-md)", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: "var(--accent)", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>
                  Diagnosis Summary
                </div>
                <p style={{ margin: "0 0 10px 0", fontSize: "13px", lineHeight: "1.5" }}>
                  {selectedReport.diagnosisSummary}
                </p>

                {selectedReport.findings && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px", marginTop: "8px", fontSize: "12px" }}>
                    <strong style={{ color: "var(--text-main)" }}>Detailed Findings: </strong>
                    <span style={{ color: "var(--text-muted)" }}>{selectedReport.findings}</span>
                  </div>
                )}

                {selectedReport.recommendation && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px", marginTop: "8px", fontSize: "12px" }}>
                    <strong style={{ color: "#10B981" }}>Physician Recommendation: </strong>
                    <span style={{ color: "var(--text-muted)" }}>{selectedReport.recommendation}</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="badge badge-emerald">Doctor Approved & Signed</span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedReport(null)}>
                    Close
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Printer size={13} /> Print / Save PDF
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

export default Reports;