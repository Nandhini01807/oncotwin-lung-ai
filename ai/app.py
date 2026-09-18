import os
import json
import logging
import traceback
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from services.predict import LUNG_CT_SERVICE

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OncoTwin_AI_App")

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "scans").mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "heatmaps").mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "overlays").mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="OncoTwin – AI-Assisted Lung Nodule Detection and Clinical Decision Support System",
    description="Real DenseNet121 Transfer Learning Inference & Grad-CAM Visual Decision Support for Chest CT DICOM Scans (LIDC-IDRI / TCIA)",
    version="11.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

@app.get("/")
def root():
    return {
        "title": "OncoTwin – AI-Assisted Lung Nodule Detection and Clinical Decision Support System",
        "summary": "OncoTwin is an AI-assisted Clinical Decision Support System for pulmonary nodule detection from Chest CT DICOM images. The system uses a DenseNet121 Transfer Learning model trained on the LIDC-IDRI dataset to identify suspicious pulmonary nodules, generate confidence scores, and produce Grad-CAM visual explanations. The attending physician reviews the AI output, confirms the diagnosis, assigns the official TNM classification and clinical stage, prescribes treatment, and approves the final medical report.",
        "dataset": "LIDC-IDRI (The Cancer Imaging Archive - TCIA)",
        "modality": "Chest CT (.dcm)",
        "supported_formats": ["DICOM (.dcm)"],
        "architecture": "DenseNet121 Transfer Learning",
        "weights": "densenet121_best.pth",
        "gradcam_supported": True,
        "windowing": "Pulmonary Lung Window (WL: -600 HU, WW: 1500 HU)",
        "max_upload_size_mb": 50,
        "disclaimer": MANDATORY_CLINICAL_DISCLAIMER
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "weights_loaded": LUNG_CT_SERVICE.weights_loaded,
        "device": str(LUNG_CT_SERVICE.device),
        "dataset": "LIDC-IDRI (TCIA)",
        "model": "DenseNet121"
    }

@app.get("/metrics")
@app.get("/api/ai/model-info")
def get_metrics():
    return {
        "dataset": "LIDC-IDRI (TCIA) Chest CT",
        "architecture": "DenseNet121",
        "classes": [
            "No Suspicious Pulmonary Nodule Detected",
            "Suspicious Pulmonary Nodule Detected"
        ],
        "disclaimer": MANDATORY_CLINICAL_DISCLAIMER
    }

# Master Prediction Endpoint for Lung CT
@app.post("/predict/image/lung")
@app.post("/predict/lung")
@app.post("/predict")
@app.post("/api/predict")
@app.post("/analyze")
@app.post("/api/analyze")
@app.post("/api/scan-analysis/analyze")
@app.post("/api/ai/image-assessment")
@app.post("/predict/image")
@app.post("/analyze/image")
async def predict_chest_ct(
    file: UploadFile = File(...)
):
    """
    Real DenseNet121 Chest CT Inference Endpoint:
    Reads DICOM (.dcm) file, applies pulmonary lung windowing, extracts 2D slice and sliceIndex,
    runs DenseNet121 inference, generates fresh Grad-CAM overlay, and returns prediction payload.
    """
    logger.info(f"[Step: Received Upload] Received CT scan file: {file.filename if file else 'None'}")

    if not file:
        raise HTTPException(status_code=400, detail="Please upload a Chest CT DICOM (.dcm) file.")

    filename = file.filename or "scan.dcm"
    
    # Strict format check: accept ONLY .dcm / .dicom
    lower_name = filename.lower()
    if not (lower_name.endswith(".dcm") or lower_name.endswith(".dicom")):
        logger.warning(f"[Step: Read DICOM] Rejected non-DICOM file: {filename}")
        raise HTTPException(
            status_code=400,
            detail="Please upload a Chest CT DICOM (.dcm) file."
        )

    contents = await file.read()

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Please upload a Chest CT DICOM (.dcm) file.")

    # 50 MB limit
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 50MB maximum upload limit.")

    try:
        result = LUNG_CT_SERVICE.predict_dicom(contents, filename)
        return JSONResponse(status_code=200, content=result)
    except ValueError as v_err:
        logger.error(f"[Step: Read DICOM] Validation error: {v_err}")
        raise HTTPException(status_code=400, detail=str(v_err))
    except RuntimeError as r_err:
        logger.error(f"[Step: Load Model] Runtime error: {r_err}")
        raise HTTPException(status_code=503, detail="AI model unavailable.")
    except Exception as exc:
        logger.error(f"[AI Service Error] Full stack trace:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"DICOM CT analysis failed: {str(exc)}")
