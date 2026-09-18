import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Search, 
  Trash2, 
  Eye, 
  Plus, 
  Upload
} from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

function ScanHistory() {
  const { user } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchScans = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/doctor/history`, {
        params: { search },
        headers: { Authorization: `Bearer ${token}` }
      });
      setScans(res.data.scans || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load scan history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, [search]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this scan record?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/doctor/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScans(scans.filter((s) => s._id !== id));
    } catch (err) {
      alert("Failed to delete scan: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <Layout>
      <div className="page-container" style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "60px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "24px", margin: 0, fontWeight: "800" }}>
              Scan History
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
              All uploaded scans and results
            </p>
          </div>

          <Link to="/upload-scan" className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Plus size={16} /> Upload Scan
          </Link>
        </div>

        {/* SEARCH */}
        <div className="card-glass" style={{ padding: "14px", marginBottom: "20px" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search patient or file name..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "34px", fontSize: "13px" }}
            />
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          </div>
        </div>

        {/* LIST */}
        <div className="card-glass" style={{ padding: "0", overflow: "hidden" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
              Loading scan history...
            </div>
          ) : scans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <h3>No scans found</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                Upload a scan to start.
              </p>
              <Link to="/upload-scan" className="btn btn-primary btn-sm" style={{ marginTop: "12px" }}>
                Upload Scan
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>File</th>
                    <th>Date</th>
                    <th>Modality</th>
                    <th>AI Finding</th>
                    <th>Confidence</th>
                    <th>Doctor Stage</th>
                    <th>TNM</th>
                    <th>Reviewed</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => {
                    const isRev = s.isApproved || s.verificationStatus === "Approved" || s.verificationStatus === "Doctor Verified" || s.verificationStatus === "Reviewed";
                    return (
                      <tr key={s._id}>
                        <td><strong>{s.patientName || "Patient"}</strong></td>
                        <td>{s.originalFileName}</td>
                        <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                        <td><span className="badge badge-cyan">Chest CT</span></td>
                        <td>
                          <span className={`badge ${s.primaryDiagnosis === "Benign" || (s.prediction || s.classification)?.toLowerCase().includes("no suspicious") ? "badge-emerald" : "badge-rose"}`}>
                            {s.prediction || s.classification || "Analyzed"}
                          </span>
                        </td>
                        <td>{s.confidence || 0}%</td>
                        <td>
                          <strong style={{ color: s.doctorAssignedStage ? "var(--text-main)" : "var(--text-muted)", fontSize: "12px" }}>
                            {s.doctorAssignedStage || "Not set"}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontSize: "11px", color: "var(--accent-cyan)", fontWeight: "700" }}>
                            {s.tnm || "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isRev ? "badge-emerald" : "badge-amber"}`}>
                            {isRev ? "Yes" : "Waiting for review"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <Link to={`/scan-result/${s._id}`} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Eye size={13} /> View
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(s._id, e)}
                              className="btn btn-secondary btn-sm"
                              style={{ color: "#ef4444" }}
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

export default ScanHistory;
