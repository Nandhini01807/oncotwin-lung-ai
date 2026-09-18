const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));

// Serve static uploaded scans, heatmaps, and overlays
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "../ai/uploads")));

// Standard Modules
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
app.use("/api/doctors", require("./routes/doctorRoutes"));
app.use("/api/doctor", require("./routes/doctorRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/predictions", require("./routes/predictionRoutes"));
app.use("/api/treatments", require("./routes/treatmentRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/digital-twin", require("./routes/digitalTwinRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/audit", require("./routes/auditRoutes"));

// Medical DICOM CT Scan Analysis Routes
const scanRoutes = require("./routes/scanRoutes");
app.use("/api/scan-analysis", scanRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/doctor", scanRoutes);
app.use("/api", scanRoutes);
app.use("/", scanRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "OncoTwin API is running",
    service: "LIDC-IDRI Chest CT Analysis & Clinical Decision Support",
    version: "10.0.0"
  });
});

// Explicit 404 Handler identifying failing endpoint
app.use((req, res) => {
  console.warn(`[404 Handler] Unmatched Route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
    status: 404,
    detail: `The endpoint ${req.method} ${req.originalUrl} does not exist on this server.`
  });
});

module.exports = app;
