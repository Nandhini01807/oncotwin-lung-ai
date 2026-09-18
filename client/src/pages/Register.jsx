import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Stethoscope,
  CheckCircle,
  Phone,
  MapPin,
  Calendar,
  Droplets,
} from "lucide-react";

import API from "../services/api";
import { useAuth } from "../context/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState("patient");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",

    // Patient details
    age: "",
    gender: "",
    bloodGroup: "",
    phone: "",
    address: "",
    cancerType: "",
    medicalHistory: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [passwordRules, setPasswordRules] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  });

  // ==========================================
  // HANDLE INPUT
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "password") {
      setPasswordRules({
        length: value.length >= 12 && value.length <= 16,
        uppercase: /[A-Z]/.test(value),
        lowercase: /[a-z]/.test(value),
        number: /[0-9]/.test(value),
        symbol: /[^A-Za-z0-9]/.test(value),
      });
    }
  };

  // ==========================================
  // EMAIL VALIDATION
  // ==========================================

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
    formData.email
  );

  // ==========================================
  // PASSWORD VALIDATION
  // ==========================================

  const isPasswordValid =
    passwordRules.length &&
    passwordRules.uppercase &&
    passwordRules.lowercase &&
    passwordRules.number &&
    passwordRules.symbol;

  // ==========================================
  // REGISTER
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMsg("");
    setSuccessMsg("");

    // -----------------------------
    // Basic validation
    // -----------------------------

    if (!formData.name.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    if (!isEmailValid) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg(
        "Password must be 12–16 characters and contain uppercase, lowercase, number and symbol."
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    // -----------------------------
    // Patient validation
    // -----------------------------

    if (role === "patient") {
      if (!formData.age) {
        setErrorMsg("Please enter your age.");
        return;
      }

      if (
        Number(formData.age) < 1 ||
        Number(formData.age) > 120
      ) {
        setErrorMsg("Please enter a valid age.");
        return;
      }

      if (!formData.gender) {
        setErrorMsg("Please select your gender.");
        return;
      }

      if (!formData.bloodGroup) {
        setErrorMsg("Please select your blood group.");
        return;
      }

      if (!formData.phone) {
        setErrorMsg("Please enter your phone number.");
        return;
      }

      if (!/^[0-9]{10}$/.test(formData.phone)) {
        setErrorMsg("Phone number must contain exactly 10 digits.");
        return;
      }
    }

    setLoading(true);

    try {
      // -----------------------------
      // Data sent to backend
      // -----------------------------

      const registrationData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: role,
      };

      // Add patient details only for patient
      if (role === "patient") {
        registrationData.age = Number(formData.age);
        registrationData.gender = formData.gender;
        registrationData.bloodGroup = formData.bloodGroup;
        registrationData.phone = formData.phone;
        registrationData.address = formData.address;
        registrationData.cancerType = formData.cancerType;
        registrationData.medicalHistory =
          formData.medicalHistory;
      }

      console.log("Registration data:", registrationData);

      const response = await API.post(
        "/auth/register",
        registrationData
      );

      console.log("Registration response:", response.data);

      // Save user + JWT
      login(response.data);

      setSuccessMsg("Registration successful!");

      setTimeout(() => {
        if (response.data.role === "doctor") {
          navigate("/doctor-dashboard");
        } else {
          navigate("/dashboard");
        }
      }, 500);
    } catch (error) {
      console.error("Registration error:", error);

      setErrorMsg(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // PASSWORD RULE
  // ==========================================

  const Rule = ({ valid, children }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "7px",
        fontSize: "12px",
        color: valid
          ? "var(--accent-emerald)"
          : "var(--text-muted)",
        marginBottom: "5px",
      }}
    >
      <CheckCircle size={13} />
      {children}
    </div>
  );

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="login-page">
      <div
        className="login-card card-glass card-glass-glow"
        style={{
          padding: "36px 32px",
          maxWidth: "520px",
          width: "100%",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div
            className="brand-icon"
            style={{
              margin: "0 auto 14px",
              width: "56px",
              height: "56px",
              fontSize: "30px",
            }}
          >
            🧬
          </div>

          <h1
            className="text-gradient-cyan"
            style={{
              fontSize: "30px",
              fontWeight: "800",
              marginBottom: "6px",
            }}
          >
            Create OncoTwin Account
          </h1>

          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "14px",
            }}
          >
            Create your secure AI Oncology account
          </p>
        </div>

        {/* ROLE SWITCHER */}

        <div
          style={{
            display: "flex",
            background: "var(--bg-input)",
            padding: "5px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setRole("patient");
              setErrorMsg("");
            }}
            style={{
              flex: 1,
              padding: "11px",
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
              cursor: "pointer",
            }}
          >
            <User size={16} /> Patient
          </button>

          <button
            type="button"
            onClick={() => {
              setRole("doctor");
              setErrorMsg("");
            }}
            style={{
              flex: 1,
              padding: "11px",
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
              cursor: "pointer",
            }}
          >
            <Stethoscope size={16} /> Doctor
          </button>
        </div>

        {/* ERROR */}

        {errorMsg && (
          <div
            style={{
              padding: "12px",
              marginBottom: "18px",
              borderRadius: "8px",
              color: "#ff6b81",
              background: "rgba(244,63,94,0.12)",
              border:
                "1px solid rgba(244,63,94,0.3)",
              fontSize: "13px",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* SUCCESS */}

        {successMsg && (
          <div
            style={{
              padding: "12px",
              marginBottom: "18px",
              borderRadius: "8px",
              color: "var(--accent-emerald)",
              background:
                "rgba(16,185,129,0.12)",
              border:
                "1px solid rgba(16,185,129,0.3)",
              fontSize: "13px",
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* NAME */}

          <div
            className="form-group"
            style={{ marginBottom: "18px" }}
          >
            <label className="form-label">
              Full Name
            </label>

            <div style={{ position: "relative" }}>
              <User
                size={18}
                color="var(--text-muted)"
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "14px",
                }}
              />

              <input
                type="text"
                name="name"
                className="form-control"
                style={{ paddingLeft: "42px" }}
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* EMAIL */}

          <div
            className="form-group"
            style={{ marginBottom: "18px" }}
          >
            <label className="form-label">
              Email Address
            </label>

            <div style={{ position: "relative" }}>
              <Mail
                size={18}
                color="var(--text-muted)"
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "14px",
                }}
              />

              <input
                type="email"
                name="email"
                className="form-control"
                style={{ paddingLeft: "42px" }}
                placeholder="example@gmail.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* PATIENT DETAILS */}

          {role === "patient" && (
            <>
              {/* AGE */}

              <div
                className="form-group"
                style={{ marginBottom: "18px" }}
              >
                <label className="form-label">
                  Age
                </label>

                <div style={{ position: "relative" }}>
                  <Calendar
                    size={18}
                    color="var(--text-muted)"
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "14px",
                    }}
                  />

                  <input
                    type="number"
                    name="age"
                    className="form-control"
                    style={{ paddingLeft: "42px" }}
                    placeholder="Enter your age"
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* GENDER */}

              <div
                className="form-group"
                style={{ marginBottom: "18px" }}
              >
                <label className="form-label">
                  Gender
                </label>

                <select
                  name="gender"
                  className="form-control"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select Gender
                  </option>
                  <option value="Male">
                    Male
                  </option>
                  <option value="Female">
                    Female
                  </option>
                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* BLOOD GROUP */}

              <div
                className="form-group"
                style={{ marginBottom: "18px" }}
              >
                <label className="form-label">
                  Blood Group
                </label>

                <div style={{ position: "relative" }}>
                  <Droplets
                    size={18}
                    color="var(--text-muted)"
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "14px",
                    }}
                  />

                  <select
                    name="bloodGroup"
                    className="form-control"
                    style={{ paddingLeft: "42px" }}
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select Blood Group
                    </option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              {/* PHONE */}

              <div
                className="form-group"
                style={{ marginBottom: "18px" }}
              >
                <label className="form-label">
                  Phone Number
                </label>

                <div style={{ position: "relative" }}>
                  <Phone
                    size={18}
                    color="var(--text-muted)"
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "14px",
                    }}
                  />

                  <input
                    type="tel"
                    name="phone"
                    className="form-control"
                    style={{ paddingLeft: "42px" }}
                    placeholder="10 digit phone number"
                    maxLength="10"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* ADDRESS */}

              <div
                className="form-group"
                style={{ marginBottom: "18px" }}
              >
                <label className="form-label">
                  Address
                </label>

                <div style={{ position: "relative" }}>
                  <MapPin
                    size={18}
                    color="var(--text-muted)"
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "14px",
                    }}
                  />

                  <input
                    type="text"
                    name="address"
                    className="form-control"
                    style={{ paddingLeft: "42px" }}
                    placeholder="Enter your address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* CANCER TYPE */}

              <div
                className="form-group"
                style={{ marginBottom: "18px" }}
              >
                <label className="form-label">
                  Cancer Type
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "11px",
                      marginLeft: "6px",
                    }}
                  >
                    Optional
                  </span>
                </label>

                <select
                  name="cancerType"
                  className="form-control"
                  value={formData.cancerType}
                  onChange={handleChange}
                >
                  <option value="">Select Cancer Type (Optional)</option>
                  <option value="Breast">Breast</option>
                  <option value="Lung">Lung</option>
                  <option value="Colorectal">Colorectal</option>
                  <option value="Prostate">Prostate</option>
                  <option value="Skin">Skin</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* MEDICAL HISTORY */}

              <div
                className="form-group"
                style={{ marginBottom: "18px" }}
              >
                <label className="form-label">
                  Medical History
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "11px",
                      marginLeft: "6px",
                    }}
                  >
                    Optional
                  </span>
                </label>

                <textarea
                  name="medicalHistory"
                  className="form-control"
                  placeholder="Enter relevant medical history"
                  rows="3"
                  value={formData.medicalHistory}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {/* PASSWORD */}

          <div
            className="form-group"
            style={{ marginBottom: "10px" }}
          >
            <label className="form-label">
              Password
            </label>

            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                color="var(--text-muted)"
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "14px",
                }}
              />

              <input
                type="password"
                name="password"
                className="form-control"
                style={{ paddingLeft: "42px" }}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* PASSWORD RULES */}

          <div
            style={{
              padding: "14px",
              marginBottom: "20px",
              background: "var(--bg-input)",
              borderRadius: "var(--radius-md)",
              border:
                "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "700",
                marginBottom: "10px",
              }}
            >
              🔐 Password Requirements
            </div>

            <Rule valid={passwordRules.length}>
              Make it long: Use 12–16 characters.
            </Rule>

            <Rule
              valid={
                passwordRules.uppercase &&
                passwordRules.lowercase
              }
            >
              Mix characters: Uppercase + lowercase
              letters.
            </Rule>

            <Rule valid={passwordRules.number}>
              Include at least one number.
            </Rule>

            <Rule valid={passwordRules.symbol}>
              Include at least one symbol.
            </Rule>

            <Rule valid={true}>
              Use a memorable phrase instead of a simple
              word.
            </Rule>

            <Rule valid={true}>
              Avoid personal details such as names or
              birthdays.
            </Rule>

            <Rule valid={true}>
              Do not reuse this password for other
              accounts.
            </Rule>
          </div>

          {/* CONFIRM PASSWORD */}

          <div
            className="form-group"
            style={{ marginBottom: "24px" }}
          >
            <label className="form-label">
              Confirm Password
            </label>

            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                color="var(--text-muted)"
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "14px",
                }}
              />

              <input
                type="password"
                name="confirmPassword"
                className="form-control"
                style={{ paddingLeft: "42px" }}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "15px",
              borderRadius: "var(--radius-md)",
            }}
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : `Create ${
                  role === "doctor"
                    ? "Doctor"
                    : "Patient"
                } Account`}

            <ArrowRight size={18} />
          </button>
        </form>

        {/* LOGIN */}

        <p
          style={{
            textAlign: "center",
            marginTop: "24px",
            fontSize: "14px",
            color: "var(--text-muted)",
          }}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            style={{
              color: "var(--accent-cyan)",
              fontWeight: "700",
            }}
          >
            Login Here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;