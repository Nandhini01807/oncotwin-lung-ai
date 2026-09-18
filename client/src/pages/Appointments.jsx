import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Check, 
  X,
  Search,
  RotateCcw,
  FileText
} from "lucide-react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

function Appointments() {
  const { user } = useAuth();
  const isDoctor = user?.role === "doctor";

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Request Modal State for Patients
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [formData, setFormData] = useState({
    requestedDate: "",
    timeString: "10:30 AM",
    reason: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointmentForReschedule, setSelectedAppointmentForReschedule] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({
    requestedDate: "",
    timeString: "10:30 AM",
    reason: ""
  });
  const [rescheduling, setRescheduling] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) return;

      const endpoint = isDoctor 
        ? `${API_BASE}/appointments/doctor`
        : `${API_BASE}/appointments/mine`;

      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAppointments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Appointments fetch error:", err);
      setError(err.response?.data?.message || err.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [isDoctor]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Handle patient creating appointment request
  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!formData.requestedDate) {
      alert("Please select an appointment date.");
      return;
    }
    if (!formData.reason.trim()) {
      alert("Please enter a reason for consultation.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/appointments`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowRequestModal(false);
      setFormData({
        requestedDate: "",
        timeString: "10:30 AM",
        reason: "",
        notes: ""
      });
      setSuccessMsg("Appointment Requested Successfully. Status: Pending Doctor Approval");
      setTimeout(() => setSuccessMsg(""), 5000);
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to request appointment");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle reschedule submission
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppointmentForReschedule) return;

    try {
      setRescheduling(true);
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/appointments/${selectedAppointmentForReschedule._id}/reschedule`,
        rescheduleData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRescheduleModalOpen(false);
      setSelectedAppointmentForReschedule(null);
      setSuccessMsg("Appointment rescheduled successfully.");
      setTimeout(() => setSuccessMsg(""), 5000);
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to reschedule appointment");
    } finally {
      setRescheduling(false);
    }
  };

  // Handle doctor updating status
  const handleUpdateStatus = async (id, newStatus) => {
    let doctorNotes = "";
    if (newStatus === "rejected" || newStatus === "accepted" || newStatus === "Approved" || newStatus === "Rejected") {
      const promptNote = window.prompt(
        `Enter optional clinical note / instructions for the patient:`,
        newStatus.toLowerCase().includes("accept") || newStatus.toLowerCase().includes("approv") 
          ? "Consultation confirmed. Please have your recent CT scans and records ready." 
          : "Please reschedule or contact clinical support."
      );
      if (promptNote !== null) doctorNotes = promptNote;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/appointments/${id}/status`,
        { status: newStatus, doctorNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAppointments();
    } catch (err) {
      console.error("Update status error:", err);
      alert(err.response?.data?.message || "Failed to update appointment status");
    }
  };

  // Handle patient cancel
  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment request?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/appointments/${id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAppointments();
    } catch (err) {
      console.error("Cancel error:", err);
      alert(err.response?.data?.message || "Failed to cancel appointment");
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "approved":
      case "accepted":
      case "confirmed":
        return <span className="badge badge-emerald" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><CheckCircle size={12} /> Approved</span>;
      case "completed":
        return <span className="badge badge-cyan" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Check size={12} /> Completed</span>;
      case "cancelled":
        return <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}><XCircle size={12} /> Cancelled</span>;
      case "rejected":
        return <span className="badge badge-rose" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="badge badge-purple" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Clock size={12} /> Pending Doctor Approval</span>;
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const s = (apt.status || "requested").toLowerCase();
    if (statusFilter === "approved" && s !== "accepted" && s !== "confirmed" && s !== "approved") return false;
    if (statusFilter === "pending" && s !== "requested" && s !== "pending") return false;
    if (statusFilter === "completed" && s !== "completed") return false;
    if (statusFilter === "rejected" && s !== "rejected" && s !== "cancelled") return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const doc = (apt.doctor?.name || apt.doctor?.user?.name || "").toLowerCase();
      const pat = (apt.patient?.user?.name || "").toLowerCase();
      const reason = (apt.reason || "").toLowerCase();
      const notes = (apt.notes || "").toLowerCase();
      return doc.includes(term) || pat.includes(term) || reason.includes(term) || notes.includes(term);
    }

    return true;
  });

  return (
    <Layout>
      <div className="page-container">
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
              <Stethoscope size={14} /> Clinical Decision Support System
            </div>
            <h1 style={{ fontSize: "28px", margin: 0 }}>
              {isDoctor ? "Doctor Appointment Requests" : <>Clinical <span className="text-gradient-cyan">Appointments</span></>}
            </h1>
          </div>

          {!isDoctor && (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowRequestModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <Plus size={16} /> Request Appointment
            </button>
          )}
        </div>

        {/* SUCCESS ALERT */}
        {successMsg && (
          <div style={{ padding: "14px 18px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "var(--radius-md)", color: "#10B981", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ERROR ALERT */}
        {error && (
          <div style={{ padding: "14px", background: "rgba(214, 69, 69, 0.12)", border: "1px solid rgba(214, 69, 69, 0.4)", borderRadius: "var(--radius-md)", color: "#D64545", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        {/* FILTER TABS & SEARCH BAR */}
        <div className="card-glass" style={{ padding: "16px 20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["all", "approved", "pending", "completed", "rejected"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`btn btn-sm ${statusFilter === tab ? "btn-primary" : "btn-secondary"}`}
                style={{ textTransform: "capitalize", fontSize: "12px" }}
              >
                {tab === "all" ? `All (${appointments.length})` : tab}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", maxWidth: "300px", width: "100%" }}>
            <Search size={15} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "11px" }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search appointments..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ paddingLeft: "32px", fontSize: "12px", height: "36px" }}
            />
          </div>
        </div>

        {/* APPOINTMENTS LIST */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px" }}>📅</div>
            <h3>Loading appointments...</h3>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="card-glass" style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <Calendar size={48} style={{ marginBottom: "14px", opacity: 0.4 }} />
            <h3>No Appointments Found</h3>
            <p style={{ fontSize: "13px", maxWidth: "420px", margin: "6px auto 16px" }}>
              {isDoctor 
                ? "No patient appointment requests match your current filter." 
                : "You have no appointments in this status. Click 'Request Appointment' to submit a consultation request."}
            </p>
            {!isDoctor && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowRequestModal(true)}>
                <Plus size={14} /> Request Appointment
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredAppointments.map((apt) => {
              const patientName = apt.patient?.user?.name || apt.patient?.name || "Patient";
              const doctorName = apt.doctor?.name || (apt.doctor?.user?.name ? `Dr. ${apt.doctor.user.name}` : "Attending Physician");
              
              const displayName = isDoctor ? patientName : doctorName;

              const dateFormatted = apt.requestedDate ? new Date(apt.requestedDate).toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
              }) : "Date pending";

              const timeStr = apt.timeString || "10:30 AM";
              const s = (apt.status || "pending").toLowerCase();
              const isPending = s === "requested" || s === "pending";
              const isApproved = s === "approved" || s === "accepted" || s === "confirmed";
              const isCancelled = s === "cancelled";

              return (
                <div 
                  key={apt._id} 
                  className="card-glass"
                  style={{ 
                    padding: "20px 24px",
                    borderLeft: isApproved ? "4px solid #10B981" : isPending ? "4px solid #8b5cf6" : isCancelled ? "4px solid rgba(255,255,255,0.1)" : "4px solid var(--accent)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "14px", marginBottom: "14px" }}>
                    
                    <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: isDoctor ? "rgba(139, 92, 246, 0.15)" : "rgba(6, 182, 212, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: isDoctor ? "#a78bfa" : "var(--accent)" }}>
                        {isDoctor ? <User size={20} /> : <Stethoscope size={20} />}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "3px" }}>
                          <strong style={{ fontSize: "16px", color: "var(--text-main)" }}>{displayName}</strong>
                          {getStatusBadge(apt.status)}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "10px" }}>
                          <span>{isDoctor ? "Patient Consultation Request" : "Clinical Decision Support System"}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Consultation Time</div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-main)" }}>
                        {timeStr}
                      </div>
                    </div>

                  </div>

                  {/* DETAILS GRID */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", fontSize: "13px", marginBottom: "14px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Appointment Date</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", color: "var(--text-main)", fontWeight: "600" }}>
                        <Calendar size={13} color="var(--accent)" /> {dateFormatted}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Preferred Time</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", color: "var(--text-main)" }}>
                        <Clock size={13} color="var(--accent)" /> {timeStr}
                      </div>
                    </div>

                    <div style={{ gridColumn: "span 2" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Reason for Consultation</div>
                      <div style={{ marginTop: "3px", color: "var(--text-main)" }}>
                        {apt.reason || "General review / follow-up"}
                      </div>
                    </div>

                    {apt.notes && (
                      <div style={{ gridColumn: "span 2" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Additional Notes</div>
                        <div style={{ marginTop: "3px", color: "var(--text-muted)", fontSize: "12px" }}>
                          {apt.notes}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* DOCTOR CLINICAL RESPONSE / NOTES */}
                  {apt.doctorNotes && (
                    <div style={{ padding: "10px 14px", background: "rgba(6, 182, 212, 0.06)", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "var(--text-main)", marginBottom: "14px" }}>
                      <strong style={{ color: "var(--accent)" }}>Doctor Response:</strong> {apt.doctorNotes}
                    </div>
                  )}

                  {/* ACTION CONTROLS */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                    {/* DOCTOR ACTIONS */}
                    {isDoctor && (
                      <>
                        {isPending && (
                          <>
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateStatus(apt._id, "Approved")}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setSelectedAppointmentForReschedule(apt);
                                setRescheduleData({
                                  requestedDate: apt.requestedDate ? new Date(apt.requestedDate).toISOString().slice(0, 10) : "",
                                  timeString: apt.timeString || "10:30 AM",
                                  reason: apt.reason || ""
                                });
                                setRescheduleModalOpen(true);
                              }}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <RotateCcw size={13} /> Reschedule
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleUpdateStatus(apt._id, "Rejected")}
                              style={{ color: "#ef4444", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <X size={14} /> Reject
                            </button>
                          </>
                        )}

                        {isApproved && (
                          <>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setSelectedAppointmentForReschedule(apt);
                                setRescheduleData({
                                  requestedDate: apt.requestedDate ? new Date(apt.requestedDate).toISOString().slice(0, 10) : "",
                                  timeString: apt.timeString || "10:30 AM",
                                  reason: apt.reason || ""
                                });
                                setRescheduleModalOpen(true);
                              }}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <RotateCcw size={13} /> Reschedule
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleUpdateStatus(apt._id, "Completed")}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <CheckCircle size={14} color="#10b981" /> Mark as Completed
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {/* PATIENT ACTIONS */}
                    {!isDoctor && !isCancelled && apt.status !== "Completed" && apt.status !== "completed" && (
                      <>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedAppointmentForReschedule(apt);
                            setRescheduleData({
                              requestedDate: apt.requestedDate ? new Date(apt.requestedDate).toISOString().slice(0, 10) : "",
                              timeString: apt.timeString || "10:30 AM",
                              reason: apt.reason || ""
                            });
                            setRescheduleModalOpen(true);
                          }}
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <RotateCcw size={13} /> Reschedule
                        </button>

                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleCancel(apt._id)}
                          style={{ color: "#ef4444" }}
                        >
                          Cancel Request
                        </button>
                      </>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* MODAL: PATIENT REQUEST APPOINTMENT */}
        {showRequestModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div className="card-glass" style={{ maxWidth: "500px", width: "100%", padding: "28px", background: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ fontSize: "18px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar size={18} color="var(--accent)" /> Request Appointment
                </h3>
                <button onClick={() => setShowRequestModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateAppointment}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "12px" }}>Appointment Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={formData.requestedDate} 
                      onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })} 
                      required 
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "12px" }}>Preferred Time</label>
                    <select 
                      className="form-control" 
                      value={formData.timeString} 
                      onChange={(e) => setFormData({ ...formData, timeString: e.target.value })}
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:45 AM">11:45 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:30 PM">03:30 PM</option>
                      <option value="04:45 PM">04:45 PM</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontSize: "12px" }}>Reason for Consultation</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    value={formData.reason} 
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })} 
                    placeholder="Describe symptoms, CT scan review questions, or follow-up reason..."
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label" style={{ fontSize: "12px" }}>Additional Notes <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>(optional)</span></label>
                  <textarea 
                    className="form-control" 
                    rows="2" 
                    value={formData.notes} 
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                    placeholder="Any prior imaging records, medications, or special requirements..."
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>
                    Cancel Request
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Submitting..." : "Request Appointment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: RESCHEDULE */}
        {rescheduleModalOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div className="card-glass" style={{ maxWidth: "460px", width: "100%", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "17px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <RotateCcw size={16} color="var(--accent)" /> Reschedule Appointment
                </h3>
                <button onClick={() => setRescheduleModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit}>
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontSize: "12px" }}>New Appointment Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={rescheduleData.requestedDate} 
                    onChange={(e) => setRescheduleData({ ...rescheduleData, requestedDate: e.target.value })} 
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="form-label" style={{ fontSize: "12px" }}>Preferred Time</label>
                  <select 
                    className="form-control" 
                    value={rescheduleData.timeString} 
                    onChange={(e) => setRescheduleData({ ...rescheduleData, timeString: e.target.value })}
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:45 AM">11:45 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="04:45 PM">04:45 PM</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: "18px" }}>
                  <label className="form-label" style={{ fontSize: "12px" }}>Reason for Rescheduling</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={rescheduleData.reason} 
                    onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })} 
                    placeholder="Updated schedule or preference..."
                    required 
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setRescheduleModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={rescheduling}>
                    {rescheduling ? "Submitting..." : "Confirm Reschedule"}
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

export default Appointments;
