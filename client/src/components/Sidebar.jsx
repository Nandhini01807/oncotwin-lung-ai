import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Home,
  Calendar,
  FileText,
  Activity,
  HeartPulse,
  User,
  Users, 
  Upload, 
  Stethoscope
} from "lucide-react";

function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const userRole = (user?.role || "patient").toLowerCase();
  const isDoctor = userRole === "doctor";

  // Doctor Navigation
  const doctorNavItems = [
    {
      label: "Doctor Dashboard",
      path: "/doctor-dashboard",
      icon: <Users size={18} />
    },
    {
      label: "AI Scan Analysis",
      path: "/upload-scan",
      icon: <Upload size={18} />
    },
    {
      label: "Appointments",
      path: "/appointments",
      icon: <Calendar size={18} />
    },
    {
      label: "Digital Twin",
      path: "/digital-twin",
      icon: <HeartPulse size={18} />
    },
    {
      label: "Medical Reports",
      path: "/reports",
      icon: <FileText size={18} />
    },
    {
      label: "Doctor Profile",
      path: "/profile",
      icon: <User size={18} />
    }
  ];

  // Patient Navigation
  const patientNavItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <Home size={18} />
    },
    {
      label: "Appointments",
      path: "/appointments",
      icon: <Calendar size={18} />
    },
    {
      label: "Medical Reports",
      path: "/reports",
      icon: <FileText size={18} />
    },
    {
      label: "Scan Results",
      path: "/scan-results",
      icon: <Activity size={18} />
    },
    {
      label: "Digital Twin",
      path: "/digital-twin",
      icon: <HeartPulse size={18} />
    },
    {
      label: "Profile",
      path: "/profile",
      icon: <User size={18} />
    }
  ];

  const navItems = isDoctor ? doctorNavItems : patientNavItems;

  return (
    <aside className="sidebar">
      <div style={{ padding: "12px 14px 6px", fontSize: "11px", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "6px" }}>
        <Stethoscope size={14} color="var(--accent)" />
        {isDoctor ? "Doctor Portal" : "Patient Portal"}
      </div>

      <nav className="sidebar-nav" style={{ marginTop: "8px" }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="sidebar-text">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="card-glass" style={{ padding: "14px", marginTop: "auto", background: "rgba(21, 154, 156, 0.05)", border: "1px solid rgba(21, 154, 156, 0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isDoctor ? "var(--accent-purple, #8b5cf6)" : "var(--accent, #06b6d4)" }}></div>
          <span style={{ fontSize: "12px", fontWeight: "700", color: isDoctor ? "#a78bfa" : "var(--accent)" }}>
            {isDoctor ? "Doctor Console" : "Patient Console"}
          </span>
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          OncoTwin • CDSS
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

