import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Activity, Bell, User, LogOut, ShieldCheck, Stethoscope } from "lucide-react";

import NotificationBell from "./NotificationBell";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [engineLive, setEngineLive] = useState(true);

  // Real-time server connectivity health check
  useEffect(() => {
    const checkEngineHealth = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5000/api/digital-twin", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        // 200, 401, or 404 all indicate Node.js server is online
        setEngineLive(res.status < 500);
      } catch (err) {
        setEngineLive(false);
      }
    };

    checkEngineHealth();
    const interval = setInterval(checkEngineHealth, 15000); // Check every 15 sec
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="brand-icon">🧬</div>
        <div>
          <span className="brand-title text-gradient-cyan">OncoTwin</span>
          <span style={{ fontSize: "11px", display: "block", color: "var(--text-muted)", marginTop: "-2px" }}>
            AI Precision Oncology
          </span>
        </div>
      </Link>

      <div className="navbar-actions">
        {/* Real-time Health Connected Sync Badge */}
        <Link 
          to="/digital-twin" 
          className="sync-badge" 
          style={{ 
            textDecoration: "none", 
            cursor: "pointer",
            borderColor: engineLive ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
            background: engineLive ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)"
          }}
          title="Click to view live Digital Twin Console"
        >
          <span className="pulse-dot" style={{ background: engineLive ? "#10B981" : "#EF4444" }}></span>
          <span style={{ color: engineLive ? "#10B981" : "#EF4444", fontWeight: "600" }}>
            {engineLive ? "Digital Twin Engine Live" : "Digital Twin Engine Offline"}
          </span>
        </Link>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <NotificationBell />

            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-input)", padding: "6px 14px", borderRadius: "var(--radius-full)", border: "1px solid var(--border-light)" }}>
              <div style={{ 
                width: "32px", 
                height: "32px", 
                borderRadius: "50%", 
                background: user.role === "doctor" ? "rgba(139, 92, 246, 0.2)" : "rgba(6, 182, 212, 0.2)",
                color: user.role === "doctor" ? "var(--accent-purple)" : "var(--accent-cyan)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "14px"
              }}>
                {user.role === "doctor" ? <Stethoscope size={16} /> : <User size={16} />}
              </div>

              <div>
                <div style={{ fontSize: "13px", fontWeight: "600" }}>{user.name || "Demo User"}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>
                  {user.role || "Patient"} Account
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="btn btn-sm" 
                style={{ background: "transparent", color: "var(--text-muted)", padding: "4px" }}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px" }}>
            <Link to="/login" className="btn btn-secondary btn-sm">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
