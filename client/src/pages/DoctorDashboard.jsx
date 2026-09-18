import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";
import Layout from "../components/Layout";

import {
  ShieldAlert,
  Users,
  UserPlus,
  Trash2,
  Search,
  FileText,
  AlertCircle,
  Clock,
  ArrowRight,
  Upload
} from "lucide-react";

function DoctorDashboard() {
  const location = useLocation();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter and Sort Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("RECENCY");

  const fetchDoctorDashboard = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(
        "http://localhost:5000/api/doctors/dashboard",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load doctor dashboard");
      }

      setDashboard(data);
    } catch (err) {
      console.error("Doctor Dashboard Error:", err);
      setError(err.message || "Failed to load doctor dashboard");
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctorDashboard(false);

    const onFocus = () => fetchDoctorDashboard(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchDoctorDashboard, location.key]);

  const handleRemovePatient = async (patientId) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this patient from your list?"
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.delete(
        `http://localhost:5000/api/doctors/patients/${patientId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      fetchDoctorDashboard(true);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove patient");
    }
  };

  const rawPatients = dashboard?.patients || [];

  const filteredPatients = useMemo(() => {
    return rawPatients
      .filter((patient) => {
        const name = patient.user?.name || patient.name || "";
        const id = patient._id || "";
        const matchesSearch =
          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          id.toLowerCase().includes(searchQuery.toLowerCase());

        const stage = patient.cancerStage || "Not available yet";
        const matchesStage =
          stageFilter === "ALL" || stage.toLowerCase() === stageFilter.toLowerCase();

        return matchesSearch && matchesStage;
      })
      .sort((a, b) => {
        if (sortBy === "NAME") {
          const nameA = (a.user?.name || a.name || "").toLowerCase();
          const nameB = (b.user?.name || b.name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        }
        if (sortBy === "STAGE") {
          const stageA = a.cancerStage || "";
          const stageB = b.cancerStage || "";
          return stageA.localeCompare(stageB);
        }
        const dateA = new Date(a.lastActivity || a.createdAt).getTime();
        const dateB = new Date(b.lastActivity || b.createdAt).getTime();
        return dateB - dateA;
      });
  }, [rawPatients, searchQuery, stageFilter, sortBy]);

  if (loading && !dashboard) {
    return (
      <Layout>
        <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "500px" }}>
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🩺</div>
            <h3>Loading Doctor Portal...</h3>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !dashboard) {
    return (
      <Layout>
        <div className="page-container">
          <div className="card-glass" style={{ padding: "30px", textAlign: "center" }}>
            <ShieldAlert size={45} color="var(--accent-amber)" />
            <h2 style={{ marginTop: "15px" }}>Unable to load dashboard</h2>
            <p style={{ color: "var(--text-muted)", marginTop: "10px" }}>{error}</p>
            <button className="btn btn-primary" style={{ marginTop: "20px" }} onClick={() => fetchDoctorDashboard(false)}>
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const doctor = dashboard?.doctor;
  const doctorName = doctor?.user?.name || "Physician";
  const specialization = doctor?.specialization || "Clinical Oncology";
  const hospital = doctor?.hospital || "OncoTwin CDSS";
  const patientCount = dashboard?.patientCount || rawPatients.length;

  return (
    <Layout>
      <div className="page-container">
        
        {/* DOCTOR BANNER */}
        <div className="card-glass" style={{ padding: "26px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-purple)", fontWeight: "800", fontSize: "18px" }}>
                Dr
              </div>
              <div>
                <h1 style={{ fontSize: "22px", margin: 0 }}>Dr. {doctorName}</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: "2px 0 0 0" }}>
                  {specialization} • {hospital}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <Link to="/upload-scan" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Upload size={15} /> Scan Analysis
              </Link>
              <Link to="/doctor/assign-patient" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <UserPlus size={15} /> Add Patient
              </Link>
            </div>
          </div>

          <div style={{ marginTop: "20px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div className="card-glass" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px", minWidth: "180px" }}>
              <Users size={24} color="var(--accent-cyan)" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>My Patients</div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--accent-cyan)" }}>{patientCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* PATIENTS LIST */}
        <div className="card-glass" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
            <div>
              <h2 style={{ fontSize: "18px", margin: 0 }}>My Patients</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "2px" }}>
                Patients assigned to your care
              </p>
            </div>
            <span className="badge badge-purple">{filteredPatients.length} Patients</span>
          </div>

          {/* SEARCH & FILTER */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "18px", background: "var(--bg-input)", padding: "12px", borderRadius: "var(--radius-md)" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search patient name or ID..."
                className="form-control"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "32px", fontSize: "13px" }}
              />
              <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            </div>

            <div>
              <select className="form-control" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ fontSize: "13px" }}>
                <option value="ALL">All Stages</option>
                <option value="Stage I">Stage I</option>
                <option value="Stage II">Stage II</option>
                <option value="Stage III">Stage III</option>
                <option value="Stage IV">Stage IV</option>
                <option value="Not available yet">Stage Not available yet</option>
              </select>
            </div>

            <div>
              <select className="form-control" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ fontSize: "13px" }}>
                <option value="RECENCY">Sort: Recent Activity</option>
                <option value="NAME">Sort: Patient Name</option>
                <option value="STAGE">Sort: Stage</option>
              </select>
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
              <Users size={36} style={{ marginBottom: "10px", opacity: 0.5 }} />
              <h3>No patients found</h3>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>Try changing your search keywords.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Age / Gender</th>
                    <th>Stage</th>
                    <th>Reports</th>
                    <th>Last Activity</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => {
                    const patientName = patient.user?.name || patient.name || "Patient";
                    const patientId = patient._id.slice(-6).toUpperCase();
                    const stage = patient.cancerStage || "Not available yet";
                    const lastDate = patient.lastActivity
                      ? new Date(patient.lastActivity).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "Recent";

                    return (
                      <tr key={patient._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-input)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-purple)", fontWeight: "700", fontSize: "12px" }}>
                              {patientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ fontSize: "13px" }}>{patientName}</strong>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>#{patientId}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: "13px" }}>{patient.age ? `${patient.age} yrs` : "N/A"}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{patient.gender || "Not set"}</div>
                        </td>

                        <td>
                          <span className="badge badge-purple" style={{ fontSize: "12px" }}>
                            {stage}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                            <FileText size={14} color="var(--text-muted)" />
                            <span>{patient.reportsCount || 0} reports</span>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                            <Clock size={12} /> {lastDate}
                          </div>
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <Link to={`/doctor/patient/${patient._id}`} className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
                              View <ArrowRight size={13} />
                            </Link>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRemovePatient(patient._id)}
                              style={{ color: "#ef4444", padding: "4px 8px" }}
                              title="Remove from list"
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

export default DoctorDashboard;