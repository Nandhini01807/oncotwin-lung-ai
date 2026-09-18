# 🫁 OncoTwin – Comprehensive Project & Viva Guide

## Recommended Project Title
**OncoTwin – AI-Assisted Lung Nodule Detection and Clinical Decision Support System**

---

## ⚠️ Mandatory Clinical Disclaimer
> *"This AI system is intended solely for clinical decision support and research. It detects suspicious pulmonary nodules from chest CT images using a Deep Learning model and provides confidence scores with Grad-CAM visual explanations. The AI does not diagnose lung cancer, assign TNM classification, determine cancer stage, or prescribe treatment. Final clinical decisions remain the responsibility of the attending physician."*

---

## 1. What the System Does
OncoTwin is an AI-assisted Clinical Decision Support System (CDSS) for thoracic computed tomography (Chest CT) DICOM image analysis and longitudinal patient tracking. The application supports two distinct authenticated roles:

- **Doctor Portal:**
  - Authenticated access via JWT with doctor-role authorization.
  - Uploads Chest CT DICOM (`.dcm`) scans up to 50 MB.
  - Inspects AI nodule detection outputs, confidence scores, risk levels, and Grad-CAM visual saliency overlays.
  - Conducts full clinical evaluations: reviews original CT slices, compares findings with patient clinical history, confirms diagnosis, assigns TNM classification, enters clinical stage, prescribes treatments, and signs/approves diagnostic reports.
  - Generates official signed PDF medical diagnostic reports.

- **Patient Portal (Read-Only Access):**
  - Authenticated access via JWT with patient-role authorization.
  - Views doctor-approved diagnostic summaries and downloadable signed PDF reports.
  - Tracks doctor-prescribed treatment regimens and timelines.
  - Logs longitudinal health tracking metrics (symptoms, vitals) for clinician review.

---

## 2. System Architecture

```text
Browser (React + Vite + Tailwind CSS)
         │  (REST API calls with JWT Bearer token)
         ▼
Node.js / Express.js Backend (:5000)
   ├── JWT Auth & Role Middleware (Doctor vs Patient)
   ├── 50MB Multer DICOM Upload & Magic-Byte Validation Guard
   ├── Audit Logging & MongoDB Data Layer
   └── Reverse Proxy / HTTP Client to AI Microservice
         │
         ▼
Python FastAPI AI Microservice (:8000)
   ├── pydicom: Ingests raw DICOM pixel array & rescale metadata
   ├── Radiometry: Hounsfield Unit (HU) Conversion
   ├── Preprocessing: Pulmonary Lung Windowing (WL: -600 HU, WW: 1500 HU)
   ├── Model: DenseNet-121 Transfer Learning (trained on LIDC-IDRI)
   └── Explainability: Grad-CAM on layer `features.norm5`
```

---

## 3. End-to-End Clinical & Technical Workflow

```text
1. Doctor logs into Doctor Portal (JWT Authentication & Role Guard)
     ↓
2. Doctor selects patient record from Doctor Dashboard
     ↓
3. Doctor uploads Chest CT Scan (.dcm DICOM / 50MB Max limit)
     ↓
4. Backend validates DICOM format (.dcm extension + DICM header) & file size
     ↓
5. AI Service (FastAPI) loads scan using pydicom
     ↓
6. Hounsfield Unit (HU) Conversion: HU = pixel_value * RescaleSlope + RescaleIntercept
     ↓
7. Pulmonary Lung Windowing: WL = -600 HU, WW = 1500 HU (HU bounds: [-1350, +150])
     ↓
8. Extract representative 2D axial CT slice and resize to 224 × 224 tensor
     ↓
9. DenseNet-121 Transfer Learning Forward Pass & Softmax Probability computation
     ↓
10. Grad-CAM computes visual saliency heatmap on `features.norm5`
     ↓
11. AI outputs Decision-Support Telemetry:
    • Prediction: Suspicious Pulmonary Nodule Detected / No Suspicious Pulmonary Nodule Detected
    • Confidence Score (%)
    • Risk Level (High / Moderate / Low)
    • Representative Slice Index
    • Grad-CAM Visual Saliency Heatmap
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
16. Enter TNM classification (Primary Tumor T, Regional Nodes N, Distant Metastasis M)
     ↓
17. Enter clinical stage (Stage IA–IV / Benign)
     ↓
18. Prescribe treatment (Surgery, Chemotherapy, Radiotherapy, Surveillance)
     ↓
19. Approve report ("Save Assessment & Approve Report")
=====================================================================
     ↓
20. System compiles doctor-signed PDF diagnostic report with QR verification
     ↓
21. Patient Portal receives doctor-approved report in read-only view
```

---

## 4. AI Algorithms, Preprocessing & Dataset Details

### Training Dataset: LIDC-IDRI (TCIA)
- **Name:** Lung Image Database Consortium and Image Database Resource Initiative (LIDC-IDRI)
- **Source:** The Cancer Imaging Archive (TCIA)
- **Modality:** Thoracic Computed Tomography (Chest CT)
- **Format:** DICOM (`.dcm`)
- **Radiologist Annotations:** 4 thoracic radiologists provided consensus spatial contours and 1–5 malignancy suspicion ratings for pulmonary nodules.
- **Dataset Limitation:** The dataset primarily contains nodule annotations and radiologist ratings. It does NOT contain confirmed clinical TNM staging or biopsy-proven histology for every patient.

### CT Radiometry & Hounsfield Unit (HU) Conversion
Raw DICOM pixel values are converted to calibrated physical attenuation units:
$$\text{HU} = (\text{Pixel Value} \times \text{RescaleSlope}) + \text{RescaleIntercept}$$

- **Air:** $\approx -1000\text{ HU}$
- **Lung Parenchyma:** $-900\text{ HU}$ to $-500\text{ HU}$
- **Ground-Glass Opacity:** $-450\text{ HU}$ to $-200\text{ HU}$
- **Solid Nodule / Soft Tissue:** $+20\text{ HU}$ to $+60\text{ HU}$
- **Calcification / Bone:** $+300\text{ HU}$ to $+1500+\text{ HU}$

### Pulmonary Lung Windowing
- **Window Level (Center, $WL$):** $-600\text{ HU}$
- **Window Width ($WW$):** $1500\text{ HU}$
- **Window Range:** $[-1350\text{ HU}, +150\text{ HU}]$ mapped to $[0.0, 1.0]$ grayscale.

### DenseNet-121 Deep Learning Architecture
- **Backbone:** DenseNet-121 (Dense Convolutional Network with 121 layers).
- **Core Principle:** Direct connections from any layer to all subsequent layers ($x_\ell = H_\ell([x_0, x_1, \dots, x_{\ell-1}])$).
- **Advantage:** Maximum feature reuse, compact parameters, and strong gradient flow across deep representations.
- **Input Tensor:** $3 \times 224 \times 224$ normalized with ImageNet statistics (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]).
- **Classifier:** Global Adaptive Average Pooling $\rightarrow$ Linear layer ($1024 \rightarrow 2$) $\rightarrow$ Softmax probability.

### Grad-CAM Visual Explainability
- **Target Layer:** `features.norm5` (the final batch normalization layer of DenseBlock 4 before pooling).
- **Gradient Weights:** $\alpha_k^c = \frac{1}{Z} \sum_{i} \sum_{j} \frac{\partial Y^c}{\partial A_{i,j}^k}$
- **Saliency Map:** $L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_k \alpha_k^c A^k\right)$
- **Overlay:** Upsampled $7 \times 7$ feature activation map blended with OpenCV JET colormap onto the grayscale CT slice.

---

## 5. Sample Demonstration Inputs (`sample_scans/`)

The repository includes a suite of representative demonstration files in `sample_scans/`:

> *Notice: These files are representative demonstration files for testing the software pipeline and UI integration, not verified clinical patient cases. Sample confidence scores and predictions are illustrative demo outputs to validate system response. All final clinical assessments are marked as pending complete clinical evaluation by the physician.*

| File Name | Simulated Finding | AI CDSS Output | Risk Level | Physician Assessment Status |
| :--- | :--- | :--- | :--- | :--- |
| **`sample_01_high_risk_nodule.dcm`** | 24mm Spiculated Solid Upper Lobe Nodule | `Suspicious Pulmonary Nodule Detected` | `High` | *Pending Physician Assessment (Determined after complete clinical evaluation)* |
| **`sample_02_moderate_risk_nodule.dcm`** | 12mm Part-Solid Ground-Glass Nodule | `Suspicious Pulmonary Nodule Detected` | `Moderate` | *Pending Physician Assessment (Determined after complete clinical evaluation)* |
| **`sample_03_clear_lung.dcm`** | Normal Clear Lung Parenchyma | `No Suspicious Pulmonary Nodule Detected` | `Low` | *Pending Physician Assessment (Determined after complete clinical evaluation)* |
| **`sample_04_calcified_granuloma.dcm`** | 6mm Dense Calcified Benign Granuloma | `No Suspicious Pulmonary Nodule Detected` | `Low` | *Pending Physician Assessment (Determined after complete clinical evaluation)* |
| **`sample_05_apical_scarring.dcm`** | Apical Pleural Thickening & Fibrotic Scarring | `No Suspicious Pulmonary Nodule Detected` | `Low` | *Pending Physician Assessment (Determined after complete clinical evaluation)* |
| **`sample_06_invalid_format.png`** | Non-DICOM Format Test File (.png) | `Rejected by Format Guard` | N/A | Validation Error: *"Please upload a Chest CT DICOM (.dcm) file."* |

---

## 6. Digital Twin Longitudinal Tracking

The Digital Twin module stores and visualizes longitudinal follow-up information entered or approved by clinicians. It aggregates patient state over time to assist clinical continuity:
- **CT Follow-up History & Scan Timeline:** Tracks previous scans and AI nodule detection records.
- **Clinician-Approved Treatment Regimens:** Records active medications, surgery dates, or radiation cycles prescribed by the physician.
- **Patient Symptom & Vital Metrics Log:** Stores longitudinal tracking data such as cough severity, shortness of breath, weight, and oxygen saturation.
- **Doctor Clinical Observations:** Chronological record of physician notes and follow-up directives.

> *Note: The Digital Twin stores longitudinal clinical follow-up data entered or approved by clinicians. The system does not claim automated tumor volume calculation or biological growth prediction.*

---

## 7. Key Viva Questions & Answers for Examination

### Q1: What is the primary purpose and scope of OncoTwin?
**A:** OncoTwin is an AI-assisted Clinical Decision Support System (CDSS) for detecting suspicious pulmonary nodules from Chest CT DICOM images. It assists radiologists and attending physicians by localizing suspicious nodules and providing visual Grad-CAM explanations. It does not replace the physician.

### Q2: Why does the AI not output cancer stage, TNM classification, or treatment?
**A:** In real clinical oncology, cancer staging (TNM) requires comprehensive histopathological biopsy, whole-body PET-CT scans, and clinical lymph node evaluation—information that cannot be determined solely from an isolated chest CT slice. Furthermore, the LIDC-IDRI training dataset only provides radiologist nodule contours and ratings, not TNM staging. All staging and treatment prescribing must be performed by the attending doctor.

### Q3: Why is DenseNet-121 chosen as the neural network backbone?
**A:** DenseNet-121 connects each layer to every other layer in a feed-forward fashion. This maximizes feature reuse, mitigates vanishing gradients during backpropagation, produces compact feature representations (1024 channels), and is especially effective for detecting subtle textural features like ground-glass opacity or nodule spiculation.

### Q4: What is the purpose of Hounsfield Unit (HU) conversion and Lung Windowing?
**A:** Raw CT pixel values differ across scanner manufacturers. Rescale Slope and Intercept map pixel values to standardized Hounsfield Units where Air is -1000 HU and Water is 0 HU. Applying pulmonary windowing (Window Level = -600 HU, Window Width = 1500 HU) isolates the lung parenchyma range ([-1350 HU, +150 HU]), maximizing contrast for nodules while suppressing irrelevant high-density bone or low-density background air.

### Q5: How does Grad-CAM work in this system?
**A:** Grad-CAM calculates the gradient of the winning nodule class score with respect to the feature activation maps of layer `features.norm5` (the final normalization layer of DenseBlock 4). Global average pooling of these gradients yields importance weights $\alpha_k$, which are linearly combined with the feature maps and passed through a ReLU activation. The resulting heatmap highlights the exact region of the CT slice that triggered the nodule detection.

### Q6: How are Doctor and Patient access rights separated?
**A:** Authentication uses stateless JSON Web Tokens (JWT) containing cryptographically signed user IDs and roles (`doctor` or `patient`). Express route middleware enforces role guards. Doctors have write access to upload scans, enter clinical diagnoses, assign TNM stages, prescribe treatments, and approve reports. Patients have read-only access to doctor-approved diagnostic summaries and signed PDF reports.

### Q7: What is the Digital Twin module in OncoTwin?
**A:** The Digital Twin is a longitudinal data aggregator that stores and displays physician-approved clinical follow-up data, prior scan findings, vital sign logs, reported symptoms, and prescribed treatment milestones over time. It does not perform automated tumor volume calculation or growth simulation.

---

## 8. Demonstration Checklist for Reviewers

1. **System Login:** Demonstrate Doctor vs. Patient role-based access control.
2. **Scan Ingestion & Guard:** Upload `sample_06_invalid_format.png` to demonstrate the DICOM format guard rejecting non-DICOM uploads.
3. **Nodule Detection & Explainability:** Upload `sample_01_high_risk_nodule.dcm` to demonstrate DenseNet-121 nodule detection and Grad-CAM overlay on `features.norm5`.
4. **Physician Clinical Workflow:**
   - Review Original CT Slice & Grad-CAM heatmap.
   - Compare findings with patient clinical history.
   - Manually enter Confirmed Clinical Diagnosis, TNM Classification, Clinical Stage, and Treatment Plan.
   - Click "Save Assessment & Approve Report".
5. **PDF Diagnostic Report:** Open the generated doctor-signed PDF report displaying the separation between AI telemetry and doctor assessment.
6. **Patient Portal Verification:** Log in as the patient to show the read-only view of the doctor-approved report and longitudinal treatment timeline.

