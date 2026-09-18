# 🫁 OncoTwin – AI-Assisted Lung Nodule Detection and Clinical Decision Support System

**OncoTwin** is an AI-assisted Clinical Decision Support System for pulmonary nodule detection from Chest CT DICOM images. The system uses a DenseNet121 Transfer Learning model trained on the LIDC-IDRI dataset to identify suspicious pulmonary nodules, generate confidence scores, and produce Grad-CAM visual explanations. The attending physician reviews the AI output, confirms the diagnosis, assigns the official TNM classification and clinical stage, prescribes treatment, and approves the final medical report.

---

## ⚠️ Mandatory Clinical Disclaimer & Safety Rules

> [!IMPORTANT]
> **Clinical Disclaimer:**
> *"This AI system is intended solely for clinical decision support and research. It detects suspicious pulmonary nodules from chest CT images using a Deep Learning model and provides confidence scores with Grad-CAM visual explanations. The AI does not diagnose lung cancer, assign TNM classification, determine cancer stage, or prescribe treatment. Final clinical decisions remain the responsibility of the attending physician."*

### Key Safety Constraints & Boundaries
- **Image-Based Decision Support Only:** The AI provides only image-based decision support for pulmonary nodule detection.
- **Strictly No Autonomous Diagnosis or Staging:** The AI **NEVER** diagnoses lung cancer, assigns TNM classification, predicts Stage I–IV, or recommends treatments.
- **Attending Physician Sole Authority:** Only the attending doctor manually enters the Confirmed Diagnosis, Clinical Stage, TNM Classification, Treatment Plan, Follow-up Plan, and Clinical Notes, and signs/approves the report.
- **Doctor Portal vs. Patient Portal Separation:**
  - **Doctor Portal:** Accepts **ONLY Chest CT DICOM (`.dcm`)** files up to **50 MB**. Rejects non-DICOM files with: `"Please upload a Chest CT DICOM (.dcm) file."`.
  - **Patient Portal:** Strictly read-only access to view doctor-approved reports, download signed PDF summaries, track treatment timelines, and view health tracking metrics.

---

## 📊 1. Training Dataset: LIDC-IDRI (The Cancer Imaging Archive - TCIA)

- **Dataset Name:** LIDC-IDRI (Lung Image Database Consortium and Image Database Resource Initiative)
- **Source:** The Cancer Imaging Archive (TCIA)
- **Dataset Modality:** Chest CT Scans (DICOM `.dcm`)
- **Radiologist Annotations:** Pulmonary Nodules (Consensus contours and 1–5 malignancy ratings from 4 thoracic radiologists)
- **Clinical Dataset Limitation:**
  > *The dataset primarily contains pulmonary nodule annotations and radiologist malignancy ratings. It does NOT provide confirmed clinical TNM staging for every patient.*
- **Supported Input Format:** **DICOM (`.dcm`) only** (Max upload size: **50 MB**).
- **Model Version:** `DenseNet121_LIDC_v1`

---

## 🧠 2. AI Model Architecture (DenseNet121 + Grad-CAM)

- **Architecture:** DenseNet121 Transfer Learning
- **Input:** Representative 2D CT Slice extracted from DICOM (`512x512` $\rightarrow$ `224x224` normalized tensor)
- **AI Decision-Support Outputs:**
  1. **Prediction:**
     - `• Suspicious Pulmonary Nodule Detected`
     - `• No Suspicious Pulmonary Nodule Detected`
  2. **Confidence Score (%)**
  3. **Risk Level (`High` / `Moderate` / `Low`)**
  4. **Grad-CAM Visual Saliency Heatmap** (computed on `features.norm5`)
  5. **Representative Slice Index** (e.g. `#142`)
- **Strict Boundary:** The AI does **NOT** perform Cancer Diagnosis, TNM Prediction, Cancer Stage Prediction, or Treatment Recommendation.

---

### 🔄 3. End-to-End Physician Clinical Workflow

```text
1. Doctor Login (JWT Authentication & Role Guard)
     ↓
2. Select Patient Record from Doctor Dashboard
     ↓
3. Upload Chest CT Scan (.dcm DICOM / 50MB Max)
     ↓
4. Backend validates DICOM format (.dcm header check) & file size
     ↓
5. pydicom reads DICOM & extracts raw CT pixel array
     ↓
6. Hounsfield Unit (HU) Conversion (Slope & Intercept)
     ↓
7. Pulmonary Lung Windowing (WL: -600 HU, WW: 1500 HU)
     ↓
8. Extract representative 2D CT Slice & Resize to 224 × 224
     ↓
9. DenseNet121 Transfer Learning Forward Pass & Softmax Probability
     ↓
10. Grad-CAM computes Visual Saliency Heatmap on features.norm5
     ↓
11. AI returns Decision-Support Findings:
    • Prediction: Suspicious Pulmonary Nodule Detected / No Suspicious Pulmonary Nodule Detected
    • Confidence Score (%)
    • Risk Level (High / Moderate / Low)
    • Representative Slice Index
    • Grad-CAM Saliency Heatmap
     ↓
====================== CLINICAL DECISION PHASE ======================
12. Review Original CT Slice
     ↓
13. Review Grad-CAM Heatmap
     ↓
14. Compare with patient clinical history (symptoms, smoking history, prior scans)
     ↓
15. Confirm diagnosis (Manual Physician Entry)
     ↓
16. Enter TNM classification (Primary Tumor T, Regional Nodes N, Metastasis M)
     ↓
17. Enter clinical stage (Stage IA–IV / Benign)
     ↓
18. Prescribe treatment (Surgery, Chemotherapy, Radiotherapy, Surveillance)
     ↓
19. Approve report ("Save Assessment & Approve Report")
=====================================================================
     ↓
20. Generate Signed Professional PDF Diagnostic Report with QR Verification
     ↓
21. Patient Portal Receives Doctor-Approved Report (Read-Only)
```

---

## 📁 4. Clinical Condition Demonstration Inputs (`sample_scans/`)

The repository includes representative demonstration files in `sample_scans/` designed for testing the AI CDSS workflow and validating format-handling pipeline execution.

> [!NOTE]
> **Demonstration Notice:** These sample scans are representative demonstration files for testing the software pipeline and UI integration, not verified clinical patient cases. Sample confidence scores and predictions are illustrative demo outputs to validate system response. All final clinical assessments are marked as pending complete clinical evaluation by the physician.

| File Name | Clinical Scenario Simulated | AI CDSS Output | Risk Level | Physician Assessment Status |
| :--- | :--- | :--- | :--- | :--- |
| **`sample_01_high_risk_nodule.dcm`** | 24mm Spiculated Upper Lobe Solid Nodule | `Suspicious Pulmonary Nodule Detected` | `High` | *Pending Physician Assessment (Determined after complete clinical evaluation)* |
| **`sample_02_moderate_risk_nodule.dcm`** | 12mm Part-Solid Ground-Glass Nodule | `Suspicious Pulmonary Nodule Detected` | `Moderate` | *Pending Physician Assessment (Determined after complete clinical evaluation)* |
| **`sample_03_clear_lung.dcm`** | Normal Clear Lung Parenchyma | `No Suspicious Pulmonary Nodule Detected` | `Low` | *Pending Physician Assessment (Determined after complete clinical evaluation)* |
| **`sample_04_calcified_granuloma.dcm`** | 6mm Dense Calcified Benign Granuloma | `No Suspicious Pulmonary Nodule Detected` | `Low` | *Pending Physician Assessment (Determined after complete clinical evaluation)* |
| **`sample_05_apical_scarring.dcm`** | Apical Pleural Thickening & Fibrotic Scarring | `No Suspicious Pulmonary Nodule Detected` | `Low` | *Pending Physician Assessment (Determined after complete clinical evaluation)* |
| **`sample_06_invalid_format.png`** | Non-DICOM Format Test File (.png) | `Rejected by Format Guard` | N/A | Validation Error: *"Please upload a Chest CT DICOM (.dcm) file."* |

*(Note: File naming strictly avoids misleading names like `lung_cancer.dcm`)*

---

## 📄 5. PDF Medical Diagnostic Report Structure

The generated printable medical report (`/report/:id`) maintains a strict clinical separation:

### 1. AI Decision-Support Section (Automated)
- AI Prediction (`Suspicious Pulmonary Nodule Detected` / `No Suspicious Pulmonary Nodule Detected`)
- Model Confidence Score (%)
- Risk Level (`High` / `Moderate` / `Low`)
- Extracted 2D DICOM Slice & Grad-CAM Visual Saliency Overlay
- Representative Slice Index (`#142`)
- Model Architecture: `DenseNet121 Transfer Learning (LIDC-IDRI)`
- Mandatory Clinical Disclaimer

### 2. Attending Physician Section (Manual Clinical Input)
- Confirmed Clinical Diagnosis
- TNM Classification (Primary Tumor, Regional Nodes, Distant Metastasis)
- Official Clinical Stage (`Stage IA`–`IV` / `Benign`)
- Prescribed Treatment Plan & Protocol
- Follow-up Plan & Clinical Notes
- Attending Doctor Digital Signature & Verification QR Code

---

## 🧬 6. Digital Twin Longitudinal Tracking

The Digital Twin module stores and visualizes longitudinal follow-up information entered or approved by clinicians. It aggregates patient state over time to assist clinical continuity:
- **CT Follow-up History & Scan Timeline:** Chronological record of previous CT uploads and AI nodule detection findings.
- **Clinician-Approved Treatment Regimens:** Doctor-prescribed medical treatments, surgical dates, or radiation cycles.
- **Patient Symptom & Vital Metrics Log:** Longitudinal observations such as cough severity, dyspnea, weight, and oxygen saturation.
- **Doctor Clinical Notes & Follow-up Directives:** Detailed observations and next review dates recorded by the physician.

> [!NOTE]
> The Digital Twin stores longitudinal clinical follow-up data entered or approved by clinicians. The system does **not** claim automated tumor volume calculation or biological growth prediction.

---

## 🏛️ 7. System Architecture & Integrated Modules

The platform consists of the following core modules:
1. **React Frontend (`client/`):** Role-based routing, DICOM viewer, Grad-CAM toggle, doctor review panel, and PDF report generator.
2. **Node.js / Express Backend (`server/`):** REST API, JWT authentication, 50MB Multer DICOM upload guard, role-based guards, and MongoDB models.
3. **MongoDB Database:** Stores user profiles, patients, doctors, `ScanAnalysis` records, treatments, and clinical notes.
4. **FastAPI AI Service (`ai/`):** High-performance Python service for pydicom ingestion, Hounsfield Unit pulmonary windowing, DenseNet121 forward pass, and Grad-CAM generation.
5. **Security & Audit Logs:** Role-based access control (Doctor vs. Patient), audit logging, and HIPAA-compliant structure.

---

## 🚀 8. Quick Start & Execution

### Prerequisites
- Node.js (v18+)
- Python (v3.10+) with `pydicom`, `torch`, `torchvision`, `fastapi`, `uvicorn`, `pillow`
- MongoDB running locally on `localhost:27017`

### Step 1: Start FastAPI AI Service
```bash
cd ai
python -m uvicorn main:app --reload --port 8000
```

### Step 2: Start Express.js Backend Server
```bash
cd server
npm install
npm run dev
```

### Step 3: Start React Client
```bash
cd client
npm install
npm run dev
```

### Step 4: Run Automated Verification Tests
```bash
cd ai
python test_samples.py
```

---

## 📜 9. Mandatory Clinical Disclaimer

> **Clinical Disclaimer:**  
> *"This AI system is intended solely for clinical decision support and research. It detects suspicious pulmonary nodules from chest CT images using a Deep Learning model and provides confidence scores with Grad-CAM visual explanations. The AI does not diagnose lung cancer, assign TNM classification, determine cancer stage, or prescribe treatment. Final clinical decisions remain the responsibility of the attending physician."*
#   o n c o t w i n  
 