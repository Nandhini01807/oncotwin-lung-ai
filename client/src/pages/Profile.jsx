import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Heart, 
  Stethoscope, 
  FileText, 
  Building2, 
  AlertTriangle,
  CreditCard,
  UserCheck,
  Cigarette,
  Sparkles
} from "lucide-react";

function Profile() {
  const { user } = useAuth();
  
  const registeredName = user?.name || user?.user?.name || "Krishna";
  const registeredEmail = user?.email || user?.user?.email || "krishna.patient@oncotwin.org";
  const userRole = (user?.role || user?.user?.role || "patient").toLowerCase();
  const isDoctor = userRole === "doctor";

  // Clinical Profile Form state
  const [profileData, setProfileData] = useState({
    patientIdString: "PT20260045",
    hospital: "OncoTwin CDSS",
    doctorName: "Attending Physician",
    doctorSpecialization: "Clinical Oncology",
    age: 54,
    gender: "Male",
    bloodGroup: "O+",
    phone: "+91 98400 11223",
    address: "No. 42, Anna Nagar West, Chennai, Tamil Nadu - 600040",
    cancerType: "Non-Small Cell Lung Carcinoma (NSCLC)",
    cancerStage: "Stage IA (T1b N0 M0)",
    stageVerificationStatus: "Doctor Verified",
    stageSource: "Chest CT (NSCLC-Radiomics) & Clinical Staging",
    medicalHistory: "Chest CT evaluated for pulmonary lesion. DenseNet121 Transfer Learning and Grad-CAM radiomics utilized for clinical decision support.",
    smokingHistory: "Former smoker, 15 pack-years, quit 2019",
    allergies: "Penicillin, Sulfa drugs",
    chronicConditions: "Hypertension (controlled with Amlodipine 5mg)",
    emergencyName: "Lakshmi Krishna",
    emergencyRelation: "Spouse",
    emergencyPhone: "+91 98401 23456",
    insuranceProvider: "National Health Insurance / Private",
    insurancePolicyNumber: "CDSS-8829104-A",
    insuranceCoverageLimit: "Standard",
    insuranceValidTill: "31 Dec 2027"
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) return;

        const endpoint = isDoctor 
          ? "http://localhost:5000/api/doctors/profile"
          : "http://localhost:5000/api/patients/profile";

        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data) {
            setProfileData(prev => ({
              ...prev,
              patientIdString: data.patientIdString || prev.patientIdString,
              hospital: data.hospital || data.doctor?.hospital || prev.hospital,
              doctorName: data.doctor?.user?.name || data.doctor?.name || prev.doctorName,
              doctorSpecialization: data.doctor?.specialization || prev.doctorSpecialization,
              age: data.age || prev.age,
              gender: data.gender || prev.gender,
              bloodGroup: data.bloodGroup || prev.bloodGroup,
              phone: data.phone || prev.phone,
              address: data.address || prev.address,
              cancerType: data.cancerType || prev.cancerType,
              cancerStage: data.cancerStage || prev.cancerStage,
              stageVerificationStatus: data.stageVerificationStatus || prev.stageVerificationStatus,
              stageSource: data.stageSource || prev.stageSource,
              medicalHistory: data.medicalHistory || prev.medicalHistory,
              smokingHistory: data.smokingHistory || prev.smokingHistory,
              allergies: Array.isArray(data.allergies) ? data.allergies.join(", ") : (data.allergies || prev.allergies),
              chronicConditions: Array.isArray(data.chronicConditions) ? data.chronicConditions.join(", ") : (data.chronicConditions || prev.chronicConditions),
              emergencyName: data.emergencyContact?.name || prev.emergencyName,
              emergencyRelation: data.emergencyContact?.relation || prev.emergencyRelation,
              emergencyPhone: data.emergencyContact?.phone || prev.emergencyPhone,
              insuranceProvider: data.insurance?.provider || prev.insuranceProvider,
              insurancePolicyNumber: data.insurance?.policyNumber || prev.insurancePolicyNumber,
              insuranceCoverageLimit: data.insurance?.coverageLimit || prev.insuranceCoverageLimit,
              insuranceValidTill: data.insurance?.validTill || prev.insuranceValidTill
            }));
          }
        }
      } catch (err) {
        console.warn("Profile fetch warning:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isDoctor]);

  const handleChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please login again.");

      const endpoint = isDoctor
        ? "http://localhost:5000/api/doctors/profile"
        : "http://localhost:5000/api/patients/profile";

      const payload = isDoctor
        ? profileData
        : {
            age: Number(profileData.age),
            gender: profileData.gender,
            bloodGroup: profileData.bloodGroup,
            phone: profileData.phone,
            address: profileData.address,
            medicalHistory: profileData.medicalHistory,
            smokingHistory: profileData.smokingHistory,
            allergies: typeof profileData.allergies === "string" ? profileData.allergies.split(",").map(s => s.trim()).filter(Boolean) : profileData.allergies,
            chronicConditions: typeof profileData.chronicConditions === "string" ? profileData.chronicConditions.split(",").map(s => s.trim()).filter(Boolean) : profileData.chronicConditions,
            emergencyContact: {
              name: profileData.emergencyName,
              relation: profileData.emergencyRelation,
              phone: profileData.emergencyPhone
            },
            insurance: {
              provider: profileData.insuranceProvider,
              policyNumber: profileData.insurancePolicyNumber,
              coverageLimit: profileData.insuranceCoverageLimit,
              validTill: profileData.insuranceValidTill
            }
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      setMessage({ type: "success", text: "Patient clinical record and contact details updated successfully!" });
    } catch (err) {
      console.error("Profile update error:", err);
      setMessage({ type: "error", text: err.message || "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="page-container" style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 20px" }}>
        
        {/* Hospital Header & Banner */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "8px" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", background: "rgba(14, 165, 233, 0.1)", border: "1px solid rgba(14, 165, 233, 0.25)", borderRadius: "100px", fontSize: "12px", fontWeight: "600", color: "var(--color-primary)", marginBottom: "8px" }}>
                <ShieldCheck size={13} /> {profileData.hospital} • Patient Record
              </div>
              <h1 style={{ fontSize: "28px", fontWeight: "700", color: "var(--text-main)", letterSpacing: "-0.02em", margin: 0 }}>
                {isDoctor ? "Doctor Clinical Profile" : "Patient Clinical Demographics & Record"}
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
                Official electronic health record (EHR) demographics, emergency contacts, insurance policies, and doctor-verified staging.
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "8px 16px", borderRadius: "10px", textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#10B981", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Record Status
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#10B981", display: "flex", alignItems: "center", gap: "6px" }}>
                  <UserCheck size={16} /> Verified Active
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Feedback */}
        {message.text && (
          <div 
            style={{ 
              padding: "14px 18px", 
              marginBottom: "24px", 
              borderRadius: "12px",
              background: message.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
              color: message.type === "success" ? "#10B981" : "#EF4444",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontWeight: "500",
              fontSize: "14px"
            }}
          >
            {message.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px", alignItems: "start" }}>
          
          {/* Left Column: Hospital Identification Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div className="card-glass" style={{ padding: "24px", textAlign: "center" }}>
              <div style={{ 
                width: "88px", 
                height: "88px", 
                borderRadius: "50%", 
                background: "linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)",
                border: "2px solid var(--color-primary)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: "700",
                margin: "0 auto 16px auto",
                boxShadow: "0 8px 24px rgba(14, 165, 233, 0.15)"
              }}>
                {registeredName.charAt(0).toUpperCase()}
              </div>

              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-main)", marginBottom: "4px" }}>
                {registeredName}
              </h2>
              
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", background: "rgba(14, 165, 233, 0.12)", color: "var(--color-primary)", borderRadius: "100px", fontSize: "12px", fontWeight: "600", marginBottom: "18px", textTransform: "capitalize" }}>
                <ShieldCheck size={13} /> {userRole} Account
              </div>

              {/* Patient Core Parameters */}
              <div style={{ background: "rgba(15, 23, 42, 0.4)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "14px", textAlign: "left", display: "flex", flexDirection: "column", gap: "10px" }}>
                
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Patient ID (MRN)</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-primary)", fontFamily: "monospace" }}>
                    {profileData.patientIdString}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Registered Email</div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px", wordBreak: "break-all" }}>
                    <Mail size={13} color="var(--color-primary)" /> {registeredEmail}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned Physician</div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Stethoscope size={13} color="#10B981" /> {profileData.doctorName}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Clinical System</div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldCheck size={13} color="var(--color-primary)" /> {profileData.hospital}
                  </div>
                </div>

              </div>
            </div>

            {/* Baseline Metrics Summary */}
            <div className="card-glass" style={{ padding: "18px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Activity size={14} color="var(--color-primary)" /> Quick Vitals Baseline
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "rgba(15, 23, 42, 0.3)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Blood Group</div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#EF4444" }}>{profileData.bloodGroup}</div>
                </div>
                <div style={{ background: "rgba(15, 23, 42, 0.3)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Age & Gender</div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)" }}>{profileData.age}y, {profileData.gender.slice(0, 1)}</div>
                </div>
                <div style={{ background: "rgba(15, 23, 42, 0.3)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)", gridColumn: "span 2" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Clinical Staging</div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#F59E0B" }}>{profileData.cancerStage}</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Complete Clinical Profile & Demographics Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* SECTION 1: Physician-Supervised Clinical Baseline (Read-Only/Supervised) */}
              <div className="card-glass" style={{ padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(14, 165, 233, 0.15)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Activity size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
                        Clinical Baseline & Diagnostic Status
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                        Verified by Attending Physician ({profileData.doctorName})
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", padding: "3px 10px", background: "rgba(16, 185, 129, 0.15)", color: "#10B981", borderRadius: "100px", fontWeight: "600", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                    Physician Verified
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>
                      Primary Diagnosis / Indication
                    </label>
                    <input 
                      type="text" 
                      value={profileData.cancerType} 
                      readOnly 
                      disabled
                      style={{ width: "100%", padding: "10px 14px", background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontWeight: "600", fontSize: "14px", cursor: "not-allowed" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>
                      Physician Staging (TNM 8th Ed.)
                    </label>
                    <input 
                      type="text" 
                      value={profileData.cancerStage} 
                      readOnly 
                      disabled
                      style={{ width: "100%", padding: "10px 14px", background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "#F59E0B", fontWeight: "700", fontSize: "14px", cursor: "not-allowed" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>
                      Smoking History & Pack-Years
                    </label>
                    <input 
                      type="text" 
                      name="smokingHistory"
                      value={profileData.smokingHistory} 
                      onChange={handleChange}
                      placeholder="e.g. Former smoker, 15 pack-years, quit 2019"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>
                      Known Drug Allergies
                    </label>
                    <input 
                      type="text" 
                      name="allergies"
                      value={profileData.allergies} 
                      onChange={handleChange}
                      placeholder="e.g. Penicillin, Sulfa drugs"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Chronic Comorbidities & Pre-existing Conditions
                  </label>
                  <input 
                    type="text" 
                    name="chronicConditions"
                    value={profileData.chronicConditions} 
                    onChange={handleChange}
                    placeholder="e.g. Hypertension, Type 2 Diabetes"
                    style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Clinical Baseline Notes & Presenting Symptoms
                  </label>
                  <textarea 
                    name="medicalHistory"
                    rows={3}
                    value={profileData.medicalHistory} 
                    onChange={handleChange}
                    style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "13px", lineHeight: "1.5", resize: "vertical" }}
                  />
                </div>
              </div>

              {/* SECTION 2: Patient Demographics & Contact Details */}
              <div className="card-glass" style={{ padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", color: "#818CF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
                      Patient Personal Demographics & Contact
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                      Personal details used for hospital correspondence and appointment reminders.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Age (Years)</label>
                    <input 
                      type="number" 
                      name="age"
                      value={profileData.age} 
                      onChange={handleChange}
                      required
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Gender</label>
                    <select 
                      name="gender"
                      value={profileData.gender} 
                      onChange={handleChange}
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Blood Group</label>
                    <select 
                      name="bloodGroup"
                      value={profileData.bloodGroup} 
                      onChange={handleChange}
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    >
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "16px", marginBottom: "8px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Primary Phone</label>
                    <input 
                      type="text" 
                      name="phone"
                      value={profileData.phone} 
                      onChange={handleChange}
                      required
                      placeholder="+91 98400 11223"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Residential Address</label>
                    <input 
                      type="text" 
                      name="address"
                      value={profileData.address} 
                      onChange={handleChange}
                      placeholder="Street, City, State, PIN"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Emergency Contact Information */}
              <div className="card-glass" style={{ padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Heart size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
                      Emergency Contact (Next of Kin)
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                      Designated family member or caregiver to notify in case of acute medical changes.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Contact Person Name</label>
                    <input 
                      type="text" 
                      name="emergencyName"
                      value={profileData.emergencyName} 
                      onChange={handleChange}
                      placeholder="e.g. Lakshmi Krishna"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Relationship</label>
                    <input 
                      type="text" 
                      name="emergencyRelation"
                      value={profileData.emergencyRelation} 
                      onChange={handleChange}
                      placeholder="e.g. Spouse / Child"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Emergency Phone Number</label>
                    <input 
                      type="text" 
                      name="emergencyPhone"
                      value={profileData.emergencyPhone} 
                      onChange={handleChange}
                      placeholder="e.g. +91 98401 23456"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Health Insurance & Coverage */}
              <div className="card-glass" style={{ padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
                      Health Insurance & Policy Coverage
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                      TPA and insurance cashless claims coordination for hospital treatments.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Insurance Provider</label>
                    <input 
                      type="text" 
                      name="insuranceProvider"
                      value={profileData.insuranceProvider} 
                      onChange={handleChange}
                      placeholder="e.g. Star Health Platinum Comprehensive"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Policy / Member ID</label>
                    <input 
                      type="text" 
                      name="insurancePolicyNumber"
                      value={profileData.insurancePolicyNumber} 
                      onChange={handleChange}
                      placeholder="e.g. SH-8829104-A"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Sum Insured / Coverage Limit</label>
                    <input 
                      type="text" 
                      name="insuranceCoverageLimit"
                      value={profileData.insuranceCoverageLimit} 
                      onChange={handleChange}
                      placeholder="e.g. ₹15,00,000"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>Policy Validity Date</label>
                    <input 
                      type="text" 
                      name="insuranceValidTill"
                      value={profileData.insuranceValidTill} 
                      onChange={handleChange}
                      placeholder="e.g. 31 Dec 2027"
                      style={{ width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "8px", color: "var(--text-main)", fontSize: "14px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit / Save Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", alignItems: "center" }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={saving} 
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px", fontSize: "15px", fontWeight: "600", borderRadius: "10px" }}
                >
                  <Save size={18} /> {saving ? "Saving Changes..." : "Save Record Changes"}
                </button>
              </div>

            </form>

          </div>

        </div>

      </div>
    </Layout>
  );
}

export default Profile;