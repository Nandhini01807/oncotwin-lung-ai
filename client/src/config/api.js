const RAW_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Normalize SERVER_BASE by stripping any trailing slash or '/api' suffix
export const SERVER_BASE = RAW_URL.replace(/\/api\/?$/, "").replace(/\/+$/, "");
export const API_BASE = `${SERVER_BASE}/api`;

export default {
  SERVER_BASE,
  API_BASE,
};
