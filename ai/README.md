# OncoTwin – Explainable AI-Based Lung Cancer Detection and Clinical Decision Support System using Chest CT

[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?style=flat&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Model](https://img.shields.io/badge/Architecture-DenseNet121-blue.svg)](https://arxiv.org/abs/1608.06993)
[![Explainability](https://img.shields.io/badge/Explainability-Grad--CAM-green.svg)](https://arxiv.org/abs/1610.02391)
[![Dataset](https://img.shields.io/badge/Dataset-NSCLC--Radiomics%20(TCIA)-orange.svg)](https://wiki.cancerimagingarchive.net/display/Public/NSCLC-Radiomics)
[![Target](https://img.shields.io/badge/Target%20Layer-features.norm5-purple.svg)]()

---

## 1. Executive Summary & Clinical Problem Formulation

Lung cancer is the leading cause of cancer-related mortality worldwide. Early and precise radiological assessment via Low-Dose Computed Tomography (LDCT) and Thoracic CT is crucial for improving patient 5-year survival rates. 

**OncoTwin** is a production-grade, explainable Clinical Decision Support System (CDSS) built for thoracic radiologists and oncologists. Using **Transfer Learning with DenseNet121** and **Gradient-Weighted Class Activation Mapping (Grad-CAM)**, the system:
1. Ingests raw volumetric Thoracic CT scans in **DICOM (`.dcm`)** format.
2. Performs calibrated radiometric conversion into **Hounsfield Units (HU)**.
3. Applies clinical **Pulmonary Lung Windowing** ($\text{WL} = -600\text{ HU}, \text{WW} = 1500\text{ HU}$).
4. Classifies scans into **Class 0 (Benign)** and **Class 1 (Malignant)**.
5. Produces high-resolution, biologically correlated visual explanations via **Grad-CAM** anchored at `features.norm5`.
6. Provides seamless integration into clinical reporting workflows while strictly enforcing medical boundary guardrails.

---

## 2. End-to-End Pipeline Architecture

```
                                CLINICAL WORKFLOW
                                
   +-----------------------+       +------------------------+       +------------------------+
   |  Doctor Portal Ingest | ----> | Physical Radiometric   | ----> | Pulmonary Lung Window  |
   |  Chest CT DICOM (.dcm)|       | Rescale Slope/Intercept|       | WL = -600, WW = 1500   |
   +-----------------------+       +------------------------+       +------------------------+
                                                                                 |
                                                                                 v
   +-----------------------+       +------------------------+       +------------------------+
   | Explainable Grad-CAM  | <---- | DenseNet121 Backbone   | <---- | Resize 224x224 &       |
   | Target: features.norm5|       | Pretrained + GAP Head  |       | Tensor Normalization   |
   +-----------------------+       +------------------------+       +------------------------+
              |                                 |
              v                                 v
   +--------------------------------------------------------+
   |   Clinical Decision Support System (CDSS) Report       |
   |   - Diagnosis: Malignant (P=0.94) vs Benign (P=0.06)   |
   |   - Grad-CAM Heatmap & Native Alpha-Blended Overlay    |
   |   - Quadrant: Right Upper Lobe | Estimated Diam: 18.2mm|
   |   - Attending Physician Review & Final Approval        |
   +--------------------------------------------------------+
```

---

## 3. Radiometric & Preprocessing Mathematics

Standard image processing cannot be directly applied to medical CT scans due to machine-specific detector gains. OncoTwin implements standard radiological physics:

### A. Conversion to Physical Hounsfield Units (HU)
The stored 12-bit or 16-bit integers are converted to radiodensity values using DICOM tags `(0028,1053)` and `(0028,1052)`:
$$\text{HU} = \text{PixelValue} \times \text{RescaleSlope} + \text{RescaleIntercept}$$

### B. Pulmonary Lung Windowing
To optimize visualization of lung parenchyma, ground-glass opacities, and solid nodules while filtering out extraneous mediastinal soft tissue and bone:
- **Window Center / Level (WL)**: $-600\text{ HU}$
- **Window Width (WW)**: $1500\text{ HU}$
- **Lower Cutoff**: $\text{WL} - \frac{\text{WW}}{2} = -600 - 750 = -1350\text{ HU}$
- **Upper Cutoff**: $\text{WL} + \frac{\text{WW}}{2} = -600 + 750 = +150\text{ HU}$

$$\text{HU}_{\text{windowed}} = \text{clip}(\text{HU}, -1350, +150)$$

### C. Linear Normalization
$$\text{Pixel}_{\text{norm}} = \left( \frac{\text{HU}_{\text{windowed}} - (-1350)}{150 - (-1350)} \right) \times 255 = \left( \frac{\text{HU}_{\text{windowed}} + 1350}{1500} \right) \times 255$$

---

## 4. Deep Learning Model Architecture

The deep learning network leverages **DenseNet121** (Densely Connected Convolutional Networks):

```
Input: (3, 224, 224)
  │
  ├─ DenseNet121 Backbone (Features: Conv0, DenseBlock1-4, Transition1-3, Norm5)
  │    └─ features.norm5 ────> [Grad-CAM Hook Target: 7x7x1024 Activation Map]
  │
  ├─ Global Average Pooling: AdaptiveAvgPool2d((1, 1)) -> (Batch, 1024)
  │
  ├─ Classifier Head:
  │    ├─ Dropout(p=0.30)
  │    ├─ Linear(1024 -> 256)
  │    ├─ ReLU()
  │    ├─ Dropout(p=0.20)
  │    └─ Linear(256 -> 2)  [Logits: Benign (0), Malignant (1)]
  │
  └─ Calibrated Softmax: P(y=k|x) = exp(z_k / T) / sum(exp(z_j / T)), with T = 1.45
```

### Why DenseNet121 for Thoracic CT?
1. **Feature Reuse**: Direct connections from all preceding layers preserve fine-grained edge details (spiculated margins, pleural tail signs) across deep layers.
2. **Mitigated Vanishing Gradients**: Short paths between layers allow effective gradient flow during backpropagation.
3. **Parameter Efficiency**: DenseNet121 requires significantly fewer parameters (7.0M) than ResNet50 (25.6M) or VGG16 (138M), minimizing overfitting on medical cohorts.

---

## 5. Explainable AI: Grad-CAM Formulation

Grad-CAM identifies regions in the input CT slice that maximally influenced the model's prediction for class $c$:

1. **Gradients** of score $y^c$ with respect to feature maps $A^k$ of `features.norm5`:
   $$\frac{\partial y^c}{\partial A^k}$$

2. **Neuron Importance Weights ($\alpha_k^c$)** via Global Average Pooling:
   $$\alpha_k^c = \frac{1}{Z} \sum_{i} \sum_{j} \frac{\partial y^c}{\partial A_{i,j}^k}$$

3. **Saliency Map Generation**:
   $$L_{\text{Grad-CAM}}^c = \text{ReLU}\left( \sum_{k} \alpha_k^c A^k \right)$$

4. **Alpha-Blending on Native CT Scan**:
   $$I_{\text{Overlay}} = (1 - \alpha) \cdot I_{\text{CT}} + \alpha \cdot I_{\text{Heatmap}} \quad (\alpha = 0.45)$$

---

## 6. Dataset Structure: NSCLC-Radiomics (TCIA)

The pipeline is designed for the **The Cancer Imaging Archive (TCIA) NSCLC-Radiomics (Lung1)** cohort.

```
data/
└── NSCLC-Radiomics/
    ├── malignant/
    │   ├── LUNG1-001_0001.dcm
    │   ├── LUNG1-002_0001.dcm
    │   └── ...
    └── benign/
        ├── BENIGN-001_0001.dcm
        ├── BENIGN-002_0001.dcm
        └── ...
```

- **Stratified Partitioning**:
  - **70% Training**: Augmented with Random Rotation ($\pm 15^\circ$), Horizontal Flip ($p=0.5$), Color Jitter ($\pm 15\%$), Gaussian Blur ($3 \times 3$), and Random Resized Crop ($224 \times 224$).
  - **15% Validation**: Model selection and Early Stopping (Patience = 10 epochs).
  - **15% Independent Test Set**: Unbiased generalization evaluation.

---

## 7. How to Run Training & Inference

### A. Environment Installation
```bash
cd ai
pip install -r requirements.txt
```

### B. Model Training
```bash
python train.py --data_dir ../sample_scans --output_dir ./models --epochs 50 --batch_size 16 --lr 1e-4
```

### C. Clinical Inference & Grad-CAM Generation
```bash
# Terminal formatted output:
python predict.py ../sample_scans/sample_01_high_risk_nodule.dcm

# Save blended Grad-CAM PNG:
python predict.py ../sample_scans/sample_01_high_risk_nodule.dcm --save_overlay ./models/gradcam_sample.png

# JSON API output:
python predict.py ../sample_scans/sample_01_high_risk_nodule.dcm --json_output
```

---

## 8. Clinical Evaluation Metrics

The pipeline outputs full clinical metrics saved to `models/test_metrics.json` and publication-ready graphs:

| Metric | Clinical Definition | Target Benchmark |
|---|---|---|
| **Sensitivity (Recall)** | True Malignant Detection Rate ($\frac{TP}{TP + FN}$) | $\ge 92.0\%$ |
| **Specificity** | Correct Benign Rejection Rate ($\frac{TN}{TN + FP}$) | $\ge 88.0\%$ |
| **Precision (PPV)** | Positive Predictive Value ($\frac{TP}{TP + FP}$) | $\ge 90.0\%$ |
| **F1-Score** | Harmonic Mean of Precision and Sensitivity | $\ge 0.90$ |
| **ROC-AUC** | Area Under the Receiver Operating Characteristic Curve | $\ge 0.94$ |

### Exported Artifacts:
- `models/loss_curve.png` – Cross-Entropy Loss vs Epochs (Train vs Val)
- `models/accuracy_curve.png` – Classification Accuracy vs Epochs (Train vs Val)
- `models/confusion_matrix.png` – Annotated Heatmap ($TP, TN, FP, FN$)
- `models/roc_curve.png` – ROC Curve with AUC Score
- `models/training_history.csv` – Epoch-wise CSV logs
- `models/best_model.pth` – Checkpoint with optimal validation loss

---

## 9. Clinical Guardrails & Ethical Boundaries

1. **No Automated TNM Staging**: T (Tumor size/extent), N (Lymph node involvement), and M (Distant metastasis) staging require whole-body PET-CT, biopsy histology, and lymph node dissection. The AI never generates automated TNM stages.
2. **No Automated AJCC Cancer Stage (I-IV)**: Stage grouping is exclusively determined by the multidisciplinary oncology board (MDT).
3. **No Automated Histopathology**: AI does not guess histological subtype (LUAD, LUSC, SCLC) without microscopic tissue pathology.
4. **Physician Review Required**: All AI findings must be verified and approved by the attending radiologist/oncologist before appearing in the Patient Portal.
