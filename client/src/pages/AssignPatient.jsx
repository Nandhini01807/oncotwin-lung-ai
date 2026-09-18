import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Users, UserPlus, ShieldAlert } from "lucide-react";

function AssignPatient() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchPatients();
  }, []);

  // ==========================================
  // GET ALL PATIENTS
  // ==========================================

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please login again.");
      }

      const response = await fetch(
        "http://localhost:5000/api/patients/unassigned",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load patients"
        );
      }

      const list = data.patients || (Array.isArray(data) ? data : []);
      setPatients(list);

    } catch (err) {
      console.error("Fetch patients error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ASSIGN PATIENT
  // ==========================================

  const handleAssign = async () => {
    try {
      setError("");
      setSuccess("");

      if (!selectedPatient) {
        setError("Please select a patient.");
        return;
      }

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please login again.");
      }

      setAssigning(true);

      const response = await fetch(
        "http://localhost:5000/api/doctors/patients/assign",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            patientId: selectedPatient,
          }),
        }
      );

      const data = await response.json();

      console.log("Assign Patient:", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to assign patient"
        );
      }

      setSuccess(
        data.message || "Patient assigned successfully!"
      );

      setSelectedPatient("");

      // Wait briefly, then return to dashboard
      setTimeout(() => {
        navigate("/doctor-dashboard");
      }, 1200);

    } catch (err) {
      console.error("Assign patient error:", err);
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <Layout>
        <div
          className="page-container"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "500px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <Users size={45} />

            <h3 style={{ marginTop: "15px" }}>
              Loading patients...
            </h3>

            <p
              style={{
                color: "var(--text-muted)",
                marginTop: "8px",
              }}
            >
              Fetching available patients.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <Layout>
      <div className="page-container">

        {/* HEADER */}

        <div
          style={{
            marginBottom: "30px",
          }}
        >
          <h1 style={{ fontSize: "32px" }}>
            Assign Patient
          </h1>

          <p
            style={{
              color: "var(--text-muted)",
              marginTop: "6px",
            }}
          >
            Assign an unassigned patient to your doctor account.
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div
            className="card-glass"
            style={{
              padding: "20px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <ShieldAlert
              size={25}
              color="var(--accent-amber)"
            />

            <span>{error}</span>
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div
            className="card-glass"
            style={{
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <strong>{success}</strong>
          </div>
        )}

        {/* ASSIGN CARD */}

        <div
          className="card-glass"
          style={{
            padding: "30px",
            maxWidth: "700px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              marginBottom: "25px",
            }}
          >
            <div
              className="stat-icon"
              style={{
                background:
                  "rgba(6, 182, 212, 0.15)",
                color: "var(--accent-cyan)",
              }}
            >
              <UserPlus size={25} />
            </div>

            <div>
              <h2>Select Patient</h2>

              <p
                style={{
                  color: "var(--text-muted)",
                  marginTop: "5px",
                }}
              >
                Choose a patient to assign to you.
              </p>
            </div>
          </div>

          {/* PATIENT SELECT */}

          {patients.length === 0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <Users
                size={45}
                style={{ marginBottom: "12px" }}
              />

              <h3>No patients available</h3>

              <p style={{ marginTop: "8px" }}>
                There are currently no patients available for assignment.
              </p>
            </div>
          ) : (
            <>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
              >
                Patient
              </label>

              <select
                value={selectedPatient}
                onChange={(e) =>
                  setSelectedPatient(e.target.value)
                }
                className="form-control"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginBottom: "20px",
                }}
              >
                <option value="">
                  -- Select Patient --
                </option>

                {patients.map((patient) => {
                  const patientName =
                    patient.user?.name ||
                    patient.name ||
                    "Unknown Patient";

                  const patientEmail =
                    patient.user?.email ||
                    patient.email ||
                    "";

                  return (
                    <option
                      key={patient._id}
                      value={patient._id}
                    >
                      {patientName}
                      {patientEmail
                        ? ` - ${patientEmail}`
                        : ""}
                    </option>
                  );
                })}
              </select>

              {/* BUTTON */}

              <button
                className="btn btn-primary"
                onClick={handleAssign}
                disabled={assigning || !selectedPatient}
                style={{
                  width: "100%",
                }}
              >
                {assigning
                  ? "Assigning..."
                  : "Assign Patient"}
              </button>
            </>
          )}

          {/* BACK */}

          <button
            className="btn btn-secondary"
            onClick={() => navigate("/doctor-dashboard")}
            style={{
              width: "100%",
              marginTop: "12px",
            }}
          >
            Back to Dashboard
          </button>
        </div>

      </div>
    </Layout>
  );
}

export default AssignPatient;