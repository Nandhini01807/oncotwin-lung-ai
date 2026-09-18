import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, Clock, FileText, Brain, Calendar, Activity, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("http://localhost:5000/api/notifications/mine", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // Check every 20s
    return () => clearInterval(interval);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("Mark read error:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:5000/api/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("Mark all read error:", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "prediction_ready":
      case "prediction_reviewed":
        return <Brain size={16} color="var(--accent-purple)" />;
      case "report_uploaded":
        return <FileText size={16} color="var(--accent-cyan)" />;
      case "appointment_requested":
      case "appointment_updated":
        return <Calendar size={16} color="var(--accent-amber)" />;
      case "treatment_added":
        return <Activity size={16} color="#10b981" />;
      default:
        return <AlertCircle size={16} color="var(--accent-purple)" />;
    }
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary btn-sm"
        style={{
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          padding: 0,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        title="Notifications"
      >
        <Bell size={18} color={unreadCount > 0 ? "var(--accent-cyan)" : "var(--text-muted)"} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              background: "#ef4444",
              color: "white",
              fontSize: "10px",
              fontWeight: "800",
              borderRadius: "10px",
              minWidth: "18px",
              height: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              border: "2px solid var(--bg-dark)"
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN PANEL */}
      {isOpen && (
        <div
          className="card-glass"
          style={{
            position: "absolute",
            right: 0,
            top: "48px",
            width: "360px",
            maxHeight: "460px",
            overflowY: "auto",
            zIndex: 1000,
            padding: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            border: "1px solid var(--border-light)",
            background: "rgba(18, 24, 38, 0.98)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
            <div style={{ fontWeight: "700", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Bell size={15} color="var(--accent-purple)" /> Notifications
              {unreadCount > 0 && <span className="badge badge-cyan" style={{ fontSize: "10px" }}>{unreadCount} new</span>}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{ background: "none", border: "none", color: "var(--accent-cyan)", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: "13px" }}>
              No notifications yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.read && markAsRead(n._id)}
                  style={{
                    padding: "10px",
                    borderRadius: "var(--radius-sm)",
                    background: n.read ? "rgba(255,255,255,0.02)" : "rgba(139, 92, 246, 0.08)",
                    border: n.read ? "1px solid var(--border-color)" : "1px solid rgba(139, 92, 246, 0.3)",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <div style={{ marginTop: "2px" }}>{getIcon(n.type)}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "12px", margin: 0, color: n.read ? "var(--text-muted)" : "var(--text-main)", lineHeight: "1.4" }}>
                        {n.message}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                        <span style={{ fontSize: "10px", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "3px" }}>
                          <Clock size={10} /> {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {!n.read && (
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-purple)" }}></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
