import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  // 1. Unauthenticated Check: Redirect to login if user or JWT token is missing
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Extract role safely across any nested user object structures
  const userRole = (user.role || user.user?.role || "patient").toLowerCase();

  // 2. Role Authorization Check:
  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.some((role) => role.toLowerCase() === userRole);

    if (!isAllowed) {
      // If a Patient attempts to enter doctor-only routes (e.g., /doctor-dashboard), redirect to /dashboard
      if (userRole === "patient") {
        return <Navigate to="/dashboard" replace />;
      }
      // If a Doctor attempts to enter patient-only routes (e.g., /dashboard), redirect to /doctor-dashboard
      if (userRole === "doctor") {
        return <Navigate to="/doctor-dashboard" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;