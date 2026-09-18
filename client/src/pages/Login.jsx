import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Stethoscope,
  User,
  ArrowRight,
  Lock,
  Mail
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState("patient");

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ==========================================
  // HANDLE INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // ==========================================
  // HANDLE LOGIN
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setErrorMsg("");

    // Remove any old/fake token
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    try {
      console.log("Attempting login...");

      const response = await API.post("/auth/login", {
        email: formData.email,
        password: formData.password,
        role: role
      });

      console.log("LOGIN RESPONSE:", response.data);

      // Make sure backend returned JWT
      if (!response.data.token) {
        throw new Error(
          "Login successful but server did not return an authentication token."
        );
      }

      // Save real user + JWT
      login(response.data);

      console.log(
        "REAL TOKEN:",
        localStorage.getItem("token")
      );

      // Navigate according to user role
      const userRole = (response.data.user?.role || response.data.role || role || "patient").toLowerCase();
      if (userRole === "doctor") {
        navigate("/doctor-dashboard");
      } else {
        navigate("/dashboard");
      }

    } catch (error) {

      console.error("LOGIN ERROR:", error);

      const message =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please check your email and password.";

      setErrorMsg(message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div
        className="login-card card-glass card-glass-glow"
        style={{
          padding: "36px 32px"
        }}
      >

        {/* ==========================================
            HEADER
        ========================================== */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "28px"
          }}
        >

          <div
            className="brand-icon"
            style={{
              margin: "0 auto 14px",
              width: "56px",
              height: "56px",
              fontSize: "30px"
            }}
          >
            🧬
          </div>

          <h1
            style={{
              fontSize: "30px",
              fontWeight: "800",
              letterSpacing: "-0.03em",
              marginBottom: "6px"
            }}
            className="text-gradient-cyan"
          >
            Welcome to OncoTwin
          </h1>

          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "14px"
            }}
          >
            AI-Powered Digital Twin & Precision Oncology Platform
          </p>

        </div>


        {/* ==========================================
            ROLE SWITCHER
        ========================================== */}

        <div
          style={{
            display: "flex",
            background: "var(--bg-input)",
            padding: "5px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            marginBottom: "24px"
          }}
        >

          {/* PATIENT */}

          <button
            type="button"
            onClick={() => {
              setRole("patient");
              setErrorMsg("");
            }}
            style={{
              flex: 1,
              padding: "11px 16px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background:
                role === "patient"
                  ? "#159A9C"
                  : "transparent",
              color:
                role === "patient"
                  ? "#FFFFFF"
                  : "var(--text-muted)",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <User size={16} />

            Patient Account
          </button>


          {/* DOCTOR */}

          <button
            type="button"
            onClick={() => {
              setRole("doctor");
              setErrorMsg("");
            }}
            style={{
              flex: 1,
              padding: "11px 16px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background:
                role === "doctor"
                  ? "#6C63FF"
                  : "transparent",
              color:
                role === "doctor"
                  ? "#FFFFFF"
                  : "var(--text-muted)",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <Stethoscope size={16} />

            Oncologist / Doctor
          </button>

        </div>


        {/* ==========================================
            ERROR MESSAGE
        ========================================== */}

        {errorMsg && (
          <div
            style={{
              padding: "12px",
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              borderRadius: "var(--radius-sm)",
              color: "var(--accent-rose)",
              fontSize: "13px",
              marginBottom: "18px"
            }}
          >
            {errorMsg}
          </div>
        )}


        {/* ==========================================
            LOGIN FORM
        ========================================== */}

        <form onSubmit={handleSubmit}>

          {/* EMAIL */}

          <div
            className="form-group"
            style={{
              marginBottom: "18px"
            }}
          >

            <label
              className="form-label"
              style={{
                fontSize: "12px"
              }}
            >
              Email Address
            </label>

            <div
              style={{
                position: "relative"
              }}
            >

              <Mail
                size={18}
                color="var(--text-muted)"
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "14px"
                }}
              />

              <input
                type="email"
                name="email"
                className="form-control"
                style={{
                  paddingLeft: "42px"
                }}
                placeholder={
                  role === "doctor"
                    ? "doctor@email.com"
                    : "patient@email.com"
                }
                value={formData.email}
                onChange={handleChange}
                required
              />

            </div>

          </div>


          {/* PASSWORD */}

          <div
            className="form-group"
            style={{
              marginBottom: "24px"
            }}
          >

            <label
              className="form-label"
              style={{
                fontSize: "12px"
              }}
            >
              Password
            </label>

            <div
              style={{
                position: "relative"
              }}
            >

              <Lock
                size={18}
                color="var(--text-muted)"
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "14px"
                }}
              />

              <input
                type="password"
                name="password"
                className="form-control"
                style={{
                  paddingLeft: "42px"
                }}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />

            </div>

          </div>


          {/* LOGIN BUTTON */}

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "15px",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
            disabled={loading}
          >

            {loading
              ? "Authenticating..."
              : `Sign In as ${
                  role === "doctor"
                    ? "Doctor"
                    : "Patient"
                }`
            }

            {!loading && <ArrowRight size={18} />}

          </button>

        </form>


        {/* ==========================================
            REGISTER
        ========================================== */}

        <p
          style={{
            textAlign: "center",
            marginTop: "24px",
            fontSize: "14px",
            color: "var(--text-muted)"
          }}
        >

          Don't have an account?{" "}

          <Link
            to="/register"
            style={{
              color: "var(--accent-cyan)",
              fontWeight: "700"
            }}
          >
            Register Here
          </Link>

        </p>

      </div>

    </div>
  );
}

export default Login;