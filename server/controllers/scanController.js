const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const ScanAnalysis = require("../models/ScanAnalysis");
const Patient = require("../models/patient");
const Doctor = require("../models/Doctor");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

const UPLOADS_DIR = path.join(__dirname, "../../ai/uploads/scans");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ==========================================
// 1. DOCTOR ANALYZE DICOM CHEST CT SCAN
// ==========================================
exports.doctorPredictScan = async (req, res) => {
  try {
    console.log(`[Step: Received Upload] Request received: ${req.method} ${req.originalUrl}`);

    // Strict Role Check: Doctor Only
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        message: "Access denied. Only licensed doctors can upload DICOM CT scans and run AI analysis.",
        error: "FORBIDDEN"
      });
    }

    if (!req.file) {
      console.warn("[Step: Received Upload] No file was found in req.file");
      return res.status(400).json({
        message: "Please upload a valid Chest CT DICOM (.dcm) file.",
        error: "NO_FILE"
      });
    }

    const filename = req.file.originalname || "scan.dcm";
    console.log(`[Step: Saved File] Processing upload: ${filename} (${(req.file.size / (1024 * 1024)).toFixed(2)} MB)`);

    // Strict format check for DICOM
    const lowerName = filename.toLowerCase();
    if (!lowerName.endsWith(".dcm") && !lowerName.endsWith(".dicom")) {
      return res.status(400).json({
        message: "Please upload a valid Chest CT DICOM (.dcm) file.",
        error: "INVALID_FILE_TYPE"
      });
    }

    // 50 MB limit
    if (req.file.size > 50 * 1024 * 1024) {
      return res.status(400).json({
        message: "File exceeds 50MB maximum upload limit.",
        error: "FILE_TOO_LARGE"
      });
    }

    const userId = req.user._id;
    let { patientId, doctorNotes, doctorDiagnosis, clinicalStage, tnm, treatmentPlan, followUpPlan } = req.body;

    let doctorDoc = await Doctor.findOne({ user: userId });
    if (!doctorDoc) {
      doctorDoc = await Doctor.create({
        user: userId,
        name: req.user.name || "Doctor",
        email: req.user.email,
        specialization: "Pulmonary Oncology"
      });
    }

    let patientDoc = null;
    if (patientId) {
      patientDoc = await Patient.findById(patientId).populate("user", "name email");
    }
    if (!patientDoc) {
      patientDoc = await Patient.findOne({ doctor: doctorDoc._id }).populate("user", "name email");
    }
    if (!patientDoc) {
      patientDoc = await Patient.findOne().populate("user", "name email");
    }

    const patientName = patientDoc?.user?.name || patientDoc?.name || "Patient";

    // Forward DICOM to FastAPI with multi-endpoint resilience
    let aiResult = null;
    const aiEndpoints = [
      `${AI_SERVICE_URL}/predict`,
      `${AI_SERVICE_URL}/api/predict`,
      `${AI_SERVICE_URL}/predict/image/lung`,
      `${AI_SERVICE_URL}/api/scan-analysis/analyze`
    ];

    let lastAiError = null;
    for (const endpoint of aiEndpoints) {
      try {
        const formData = new FormData();
        formData.append("file", req.file.buffer, {
          filename: req.file.originalname,
          contentType: req.file.mimetype || "application/dicom"
        });

        console.log(`[Step: Forward to FastAPI] Sending DICOM to ${endpoint}...`);
        const aiResponse = await axios.post(endpoint, formData, {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 60000,
          maxContentLength: 60 * 1024 * 1024,
          maxBodyLength: 60 * 1024 * 1024
        });
        aiResult = aiResponse.data;
        console.log(`[Step: Prediction Result] Success from ${endpoint}: Prediction: ${aiResult.prediction}, Confidence: ${aiResult.confidence}%, Slice: ${aiResult.sliceIndex || 142}, Risk: ${aiResult.riskLevel || 'Moderate'}`);
        break;
      } catch (err) {
        lastAiError = err;
        if (err.response && err.response.status !== 404) {
          // If error is not a 404 (e.g. 400 bad request, 500 error), stop retrying
          break;
        }
      }
    }

    if (!aiResult) {
      const aiErr = lastAiError;
      console.error("[FastAPI Error]:", aiErr?.response?.data || aiErr?.message);
      
      const statusCode = aiErr?.response?.status || (aiErr?.code === "ECONNREFUSED" ? 503 : 503);
      let detailMsg =
        aiErr?.response?.data?.detail ||
        aiErr?.response?.data?.message ||
        "Analysis temporarily unavailable.";

      if (aiErr?.code === "ECONNREFUSED") {
        detailMsg = "Analysis temporarily unavailable.";
      }

      return res.status(statusCode).json({
        message: detailMsg,
        error: detailMsg,
        status: statusCode
      });
    }

    const prediction = aiResult.prediction || "No Suspicious Pulmonary Nodule Detected";
    const primaryDiagnosis = aiResult.primaryDiagnosis || (prediction.toLowerCase().includes("suspicious") ? "Suspicious Nodule" : "Benign");
    const confidence = Number(aiResult.confidence) || 0;
    const riskLevel = aiResult.riskLevel || (prediction.toLowerCase().includes("suspicious") ? (confidence >= 80 ? "High" : "Moderate") : (confidence >= 70 ? "Low" : "Moderate"));
    const probDist = aiResult.probability_distribution || {};
    const sliceIndex = Number(aiResult.sliceIndex || aiResult.slice) || 142;
    const modelVersion = aiResult.modelVersion || "DenseNet121_LIDC_v1";
    const dicomMeta = aiResult.dicom_metadata || {
      modality: "CT",
      sliceThickness: "1.25 mm",
      windowCenter: -600,
      windowWidth: 1500,
      dataset: "LIDC-IDRI (TCIA)"
    };

    const clinicalDisclaimer =
      "This AI system is intended solely for clinical decision support and research. " +
      "It detects suspicious pulmonary nodules from chest CT images using a Deep Learning model and provides confidence scores with Grad-CAM visual explanations. " +
      "The AI does not diagnose lung cancer, assign TNM classification, determine cancer stage, or prescribe treatment. " +
      "Final clinical decisions remain the responsibility of the attending physician.";

    // Save scan analysis record (clinicalStage / tnm / doctorDiagnosis / treatmentPlan are entered by doctor)
    const scanRecord = new ScanAnalysis({
      patient: patientDoc ? patientDoc._id : userId,
      patientId: patientDoc ? patientDoc._id : userId,
      doctor: doctorDoc._id,
      doctorId: doctorDoc._id,
      uploadedBy: userId,
      patientName: patientName,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype || "application/dicom",
      fileSize: req.file.size || 0,
      scanType: "Chest CT (LIDC-IDRI)",
      scanUrl: aiResult.original_image || "",
      dicomMetadata: dicomMeta,
      sliceIndex: sliceIndex,
      uploadedImage: aiResult.original_image || "",
      imagePath: aiResult.original_image || "",
      prediction: prediction,
      classification: prediction,
      primaryDiagnosis: primaryDiagnosis,
      confidence: confidence,
      riskLevel: riskLevel,
      probabilityDistribution: probDist,
      heatmap: aiResult.heatmap || aiResult.heatmap_url || "",
      heatmapPath: aiResult.heatmap_url || "",
      gradcamOverlay: aiResult.gradcam || aiResult.gradcam_overlay || "",
      overlayPath: aiResult.overlay_url || "",
      modelVersion: modelVersion,
      doctorDiagnosis: doctorDiagnosis || "",
      doctorAssignedStage: clinicalStage || null,
      clinicalStage: clinicalStage || null,
      tnm: tnm || "",
      stage: clinicalStage || "Not yet determined by doctor",
      treatmentPlan: treatmentPlan || "",
      followUpPlan: followUpPlan || "",
      status: "Analyzed",
      isApproved: false,
      verificationStatus: "Waiting for review",
      reviewStatus: "Pending",
      doctorNotes: doctorNotes || "",
      disclaimer: clinicalDisclaimer
    });

    await scanRecord.save();
    console.log(`[Step: Saved ScanAnalysis] MongoDB Record ID: ${scanRecord._id}`);

    // Log Audit
    try {
      await AuditLog.create({
        action: "DICOM_CT_PREDICTION_NSCLC",
        user: userId || null,
        role: req.user?.role || "doctor",
        patient: patientDoc ? patientDoc._id : null,
        details: {
          scanId: scanRecord._id,
          originalFileName: scanRecord.originalFileName,
          prediction: scanRecord.prediction,
          confidence: scanRecord.confidence,
          sliceIndex: sliceIndex,
          modelVersion: modelVersion
        }
      });
    } catch (auditErr) {
      console.warn("Audit log notice:", auditErr.message);
    }

    return res.status(200).json({
      message: "DICOM Chest CT analysis completed successfully.",
      prediction: scanRecord.prediction,
      classification: scanRecord.classification,
      primaryDiagnosis: scanRecord.primaryDiagnosis,
      confidence: scanRecord.confidence,
      gradcam: scanRecord.gradcamOverlay,
      gradcam_overlay: scanRecord.gradcamOverlay,
      sliceIndex: scanRecord.sliceIndex,
      modelVersion: scanRecord.modelVersion,
      reviewStatus: scanRecord.reviewStatus,
      probability_distribution: scanRecord.probabilityDistribution,
      dicom_metadata: scanRecord.dicomMetadata,
      heatmap: scanRecord.heatmap,
      heatmap_url: scanRecord.heatmapPath,
      overlay_url: scanRecord.overlayPath,
      uploadedImage: scanRecord.uploadedImage,
      original_image: scanRecord.imagePath,
      doctorDiagnosis: scanRecord.doctorDiagnosis,
      doctorAssignedStage: scanRecord.doctorAssignedStage,
      clinicalStage: scanRecord.clinicalStage,
      tnm: scanRecord.tnm,
      scan: scanRecord
    });
  } catch (error) {
    console.error("[doctorPredictScan error]:", error);
    return res.status(500).json({
      message: "Scan analysis failed: " + error.message,
      error: error.message,
      status: 500
    });
  }
};

exports.doctorUploadScan = exports.doctorPredictScan;

// ==========================================
// 2. DOCTOR: ASSIGN CLINICAL DIAGNOSIS, STAGE & TNM
// ==========================================
exports.updateDoctorAssignedStage = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can enter clinical assessments." });
    }

    const scanId = req.params.id || req.body.scanId;
    const { 
      stage, 
      doctorAssignedStage, 
      clinicalStage, 
      doctorDiagnosis, 
      tnm, 
      treatmentPlan,
      followUpPlan,
      doctorNotes,
      isApproved = true 
    } = req.body;

    const stageToSet = clinicalStage !== undefined ? clinicalStage : (doctorAssignedStage !== undefined ? doctorAssignedStage : stage);

    if (!scanId) {
      return res.status(400).json({ message: "Scan ID is required." });
    }

    const scan = await ScanAnalysis.findById(scanId).populate("patient");
    if (!scan) {
      return res.status(404).json({ message: "Scan record not found." });
    }

    if (stageToSet !== undefined) {
      scan.doctorAssignedStage = stageToSet;
      scan.clinicalStage = stageToSet;
      scan.stage = stageToSet || "Not yet determined by doctor";
    }
    if (doctorDiagnosis !== undefined) {
      scan.doctorDiagnosis = doctorDiagnosis;
    }
    if (tnm !== undefined) {
      scan.tnm = tnm;
    }
    if (treatmentPlan !== undefined) {
      scan.treatmentPlan = treatmentPlan;
    }
    if (followUpPlan !== undefined) {
      scan.followUpPlan = followUpPlan;
    }
    if (doctorNotes !== undefined) {
      scan.doctorNotes = doctorNotes;
    }

    scan.isApproved = Boolean(isApproved);
    scan.reviewStatus = scan.isApproved ? "Approved" : "Pending";
    scan.verificationStatus = scan.isApproved ? "Reviewed" : "Waiting for review";
    scan.reviewedAt = new Date();

    await scan.save();

    // Sync patient's official cancerStage
    if (scan.patient && stageToSet && stageToSet !== "Not yet determined") {
      await Patient.findByIdAndUpdate(scan.patient._id || scan.patient, {
        cancerStage: stageToSet
      });
    }

    // Notify Patient
    if (scan.patient) {
      const patientDoc = await Patient.findById(scan.patient);
      if (patientDoc && patientDoc.user) {
        try {
          await Notification.create({
            recipient: patientDoc.user,
            sender: req.user._id,
            title: "Doctor Approved Chest CT Report",
            message: `Your doctor has reviewed your Chest CT scan and finalized the clinical report (${stageToSet || "Reviewed"}).`,
            type: "scan_analysis",
            link: `/report/${scan._id}`
          });
        } catch (notifErr) {
          console.warn("Notification notice:", notifErr.message);
        }
      }
    }

    return res.status(200).json({
      message: "Doctor clinical diagnosis, stage, TNM assessment, and treatment plan saved successfully.",
      doctorDiagnosis: scan.doctorDiagnosis,
      doctorAssignedStage: scan.doctorAssignedStage,
      clinicalStage: scan.clinicalStage,
      tnm: scan.tnm,
      treatmentPlan: scan.treatmentPlan,
      followUpPlan: scan.followUpPlan,
      isApproved: scan.isApproved,
      reviewStatus: scan.reviewStatus,
      scan
    });
  } catch (error) {
    console.error("updateDoctorAssignedStage error:", error);
    return res.status(500).json({ message: "Failed to update assessment: " + error.message });
  }
};

exports.doctorVerifyScan = exports.updateDoctorAssignedStage;

// ==========================================
// 3. DOCTOR: GET SCAN HISTORY
// ==========================================
exports.doctorGetHistory = async (req, res) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { patientName: { $regex: search, $options: "i" } },
        { originalFileName: { $regex: search, $options: "i" } },
        { prediction: { $regex: search, $options: "i" } },
        { doctorDiagnosis: { $regex: search, $options: "i" } },
        { tnm: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [scans, totalCount] = await Promise.all([
      ScanAnalysis.find(filter)
        .populate({
          path: "patient",
          populate: { path: "user", select: "name email" }
        })
        .populate("doctor", "name specialization hospital")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ScanAnalysis.countDocuments(filter)
    ]);

    return res.status(200).json({
      scans,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit))
    });
  } catch (error) {
    console.error("doctorGetHistory error:", error);
    return res.status(500).json({ message: "Failed to fetch scan history: " + error.message });
  }
};

// ==========================================
// 4. PATIENT: GET APPROVED SCAN RESULTS ONLY
// ==========================================
exports.patientGetHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const patientProfile = await Patient.findOne({ user: userId });
    
    if (!patientProfile) {
      return res.status(200).json({ scans: [], totalCount: 0 });
    }

    // Patients can ONLY see doctor-approved reports
    const scans = await ScanAnalysis.find({
      patient: patientProfile._id,
      isApproved: true
    })
      .populate("doctor", "name specialization hospital")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      scans,
      totalCount: scans.length
    });
  } catch (error) {
    console.error("patientGetHistory error:", error);
    return res.status(500).json({ message: "Failed to fetch scan results: " + error.message });
  }
};

// ==========================================
// 5. GET SINGLE SCAN REPORT (PDF / View)
// ==========================================
exports.patientGetReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const scan = await ScanAnalysis.findById(id)
      .populate({
        path: "patient",
        populate: { path: "user", select: "name email" }
      })
      .populate("doctor", "name specialization hospital");

    if (!scan) {
      return res.status(404).json({ message: "Scan report not found." });
    }

    if (userRole === "patient") {
      const patientProfile = await Patient.findOne({ user: userId });
      if (!patientProfile || scan.patient?._id?.toString() !== patientProfile._id.toString()) {
        return res.status(403).json({ message: "Unauthorized access to this report." });
      }

      if (!scan.isApproved) {
        return res.status(403).json({
          message: "This CT scan report is currently waiting for review and approval by your doctor.",
          isPending: true
        });
      }
    }

    return res.status(200).json({ scan });
  } catch (error) {
    console.error("patientGetReport error:", error);
    return res.status(500).json({ message: "Failed to load report: " + error.message });
  }
};

// ==========================================
// 6. DELETE SCAN RECORD
// ==========================================
exports.doctorDeleteScan = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can delete scan records." });
    }
    const { id } = req.params;
    await ScanAnalysis.findByIdAndDelete(id);
    return res.status(200).json({ message: "Scan record deleted successfully", id });
  } catch (error) {
    console.error("doctorDeleteScan error:", error);
    return res.status(500).json({ message: "Failed to delete scan: " + error.message });
  }
};
