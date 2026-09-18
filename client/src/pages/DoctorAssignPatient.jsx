import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

function DoctorAssignPatient() {

    const navigate = useNavigate();

    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState("");
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ==================================================
    // LOAD UNASSIGNED PATIENTS
    // ==================================================

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {

        try {

            setLoading(true);
            setError("");

            const token =
                localStorage.getItem("token");

            if (!token) {
                throw new Error(
                    "Please login again."
                );
            }

            const response = await fetch(
                "http://localhost:5000/api/patients/unassigned",
                {
                    method: "GET",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                        "Content-Type":
                            "application/json"
                    }
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to load patients"
                );
            }

            const unassignedPatients =
                data.patients || (Array.isArray(data) ? data : []);

            setPatients(
                unassignedPatients
            );

        } catch (err) {

            console.error(
                "Fetch Patients Error:",
                err
            );

            setError(
                err.message
            );

        } finally {

            setLoading(false);
        }
    };


    // ==================================================
    // ASSIGN PATIENT
    // ==================================================

    const handleAssign = async () => {

        if (!selectedPatient) {

            setError(
                "Please select a patient."
            );

            return;
        }

        try {

            setAssigning(true);
            setError("");
            setSuccess("");

            const token =
                localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:5000/api/doctors/patients/assign",
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        patientId:
                            selectedPatient
                    })
                }
            );

            const data =
                await response.json();

            console.log(
                "Assign Patient:",
                data
            );

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to assign patient"
                );
            }

            setSuccess(
                "Patient assigned successfully!"
            );

            setSelectedPatient("");

            // Remove assigned patient
            // from the current list
            setPatients((prev) =>
                prev.filter(
                    (patient) =>
                        patient._id !==
                        selectedPatient
                )
            );

        } catch (err) {

            console.error(
                "Assign Error:",
                err
            );

            setError(
                err.message
            );

        } finally {

            setAssigning(false);
        }
    };


    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {

        return (
            <Layout>

                <div className="page-container">

                    <h2>
                        Loading patients...
                    </h2>

                </div>

            </Layout>
        );
    }


    // ==================================================
    // PAGE
    // ==================================================

    return (
        <Layout>

            <div className="page-container">

                {/* HEADER */}

                <div
                    style={{
                        display: "flex",
                        justifyContent:
                            "space-between",
                        alignItems: "center",
                        marginBottom: "30px",
                        gap: "15px",
                        flexWrap: "wrap"
                    }}
                >

                    <div>

                        <h1>
                            Assign Patient
                        </h1>

                        <p
                            style={{
                                color:
                                    "var(--text-muted)",
                                marginTop: "6px"
                            }}
                        >
                            Assign an unassigned
                            patient to your
                            oncology care list.
                        </p>

                    </div>

                    <Link
                        to="/doctor-dashboard"
                        className="btn btn-secondary"
                    >
                        Back to Dashboard
                    </Link>

                </div>


                {/* SUCCESS */}

                {success && (

                    <div
                        style={{
                            padding: "15px",
                            marginBottom: "20px",
                            borderRadius: "8px",
                            background:
                                "rgba(34,197,94,0.15)",
                            color:
                                "#22c55e"
                        }}
                    >
                        {success}
                    </div>

                )}


                {/* ERROR */}

                {error && (

                    <div
                        style={{
                            padding: "15px",
                            marginBottom: "20px",
                            borderRadius: "8px",
                            background:
                                "rgba(239,68,68,0.15)",
                            color:
                                "#ef4444"
                        }}
                    >
                        {error}
                    </div>

                )}


                {/* ASSIGN CARD */}

                <div className="card-glass">

                    <h2>
                        Select Patient
                    </h2>

                    <p
                        style={{
                            color:
                                "var(--text-muted)",
                            marginTop: "6px",
                            marginBottom: "25px"
                        }}
                    >
                        Only patients who are not
                        currently assigned to a
                        doctor are shown.
                    </p>


                    {patients.length === 0 ? (

                        <div
                            style={{
                                textAlign: "center",
                                padding: "50px 20px",
                                color:
                                    "var(--text-muted)"
                            }}
                        >

                            <h3>
                                No unassigned
                                patients
                            </h3>

                            <p
                                style={{
                                    marginTop: "8px"
                                }}
                            >
                                All available patients
                                are already assigned
                                to a doctor.
                            </p>

                        </div>

                    ) : (

                        <>

                            {/* PATIENT SELECT */}

                            <div
                                style={{
                                    marginBottom:
                                        "25px"
                                }}
                            >

                                <label
                                    style={{
                                        display:
                                            "block",
                                        marginBottom:
                                            "8px",
                                        fontWeight:
                                            "600"
                                    }}
                                >
                                    Patient
                                </label>

                                <select
                                    value={
                                        selectedPatient
                                    }
                                    onChange={(e) =>
                                        setSelectedPatient(
                                            e.target.value
                                        )
                                    }
                                    style={{
                                        width:
                                            "100%",
                                        padding:
                                            "12px",
                                        borderRadius:
                                            "8px",
                                        border:
                                            "1px solid var(--border-color)",
                                        background:
                                            "var(--bg-secondary)",
                                        color:
                                            "var(--text-primary)"
                                    }}
                                >

                                    <option value="">
                                        -- Select Patient --
                                    </option>

                                    {patients.map(
                                        (patient) => (

                                            <option
                                                key={
                                                    patient._id
                                                }
                                                value={
                                                    patient._id
                                                }
                                            >
                                                {
                                                    patient.user?.name ||
                                                    patient.name ||
                                                    "Unknown Patient"
                                                }
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* SELECTED PATIENT DETAILS */}

                            {selectedPatient && (

                                <div
                                    className="card-glass"
                                    style={{
                                        marginBottom:
                                            "25px"
                                    }}
                                >

                                    {(() => {

                                        const patient =
                                            patients.find(
                                                (p) =>
                                                    p._id ===
                                                    selectedPatient
                                            );

                                        if (!patient)
                                            return null;

                                        return (

                                            <>

                                                <h3>
                                                    Patient
                                                    Information
                                                </h3>

                                                <div
                                                    style={{
                                                        marginTop:
                                                            "15px"
                                                    }}
                                                >

                                                    <p>
                                                        <strong>
                                                            Name:
                                                        </strong>{" "}
                                                        {
                                                            patient.user?.name ||
                                                            patient.name ||
                                                            "N/A"
                                                        }
                                                    </p>

                                                    <p>
                                                        <strong>
                                                            Age:
                                                        </strong>{" "}
                                                        {
                                                            patient.age ||
                                                            "N/A"
                                                        }
                                                    </p>

                                                    <p>
                                                        <strong>
                                                            Gender:
                                                        </strong>{" "}
                                                        {
                                                            patient.gender ||
                                                            "N/A"
                                                        }
                                                    </p>

                                                    <p>
                                                        <strong>
                                                            Cancer:
                                                        </strong>{" "}
                                                        {
                                                            patient.cancerType ||
                                                            "Not yet recorded"
                                                        }
                                                    </p>

                                                    <p>
                                                        <strong>
                                                            Stage:
                                                        </strong>{" "}
                                                        {
                                                            patient.cancerStage ||
                                                            "Stage not yet determined"
                                                        }
                                                    </p>

                                                </div>

                                            </>

                                        );

                                    })()}

                                </div>

                            )}


                            {/* ASSIGN BUTTON */}

                            <button
                                className="btn btn-primary"
                                onClick={
                                    handleAssign
                                }
                                disabled={
                                    assigning ||
                                    !selectedPatient
                                }
                            >

                                {assigning
                                    ? "Assigning..."
                                    : "Assign Patient"}

                            </button>

                        </>

                    )}

                </div>

            </div>

        </Layout>
    );
}

export default DoctorAssignPatient;