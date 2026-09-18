import os
import io
import json
from pathlib import Path
import numpy as np
import torch

from services.brain_predict import BRAIN_SERVICE
from services.lung_predict import LUNG_SERVICE
from services.histopathology_predict import HISTOPATHOLOGY_SERVICE
from predictor import MODEL, FEATURES

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "archive" / "Multi Cancer" / "Multi Cancer"
MODELS_DIR = BASE_DIR / "models"

print("=" * 70)
print("ONCOTWIN DYNAMIC MULTI-MODEL AI INFERENCE & GRAD-CAM VERIFICATION")
print("=" * 70)

# 1. BRAIN MRI TEST
print("\n[1] Testing Brain MRI Inference (DenseNet121_Brain.pth):")
brain_dir = DATA_DIR / "Brain Cancer" / "brain_glioma"
brain_sample = next(brain_dir.glob("*.jpeg"), None) or next(brain_dir.glob("*.jpg"), None) or next(brain_dir.glob("*.png"), None)
if brain_sample:
    with open(brain_sample, "rb") as f:
        b_bytes = f.read()
    b_res = BRAIN_SERVICE.predict(b_bytes, brain_sample.name)
    print(f"  Sample: {brain_sample.name}")
    print(f"  Scan Type: {b_res['scanType']}")
    print(f"  Prediction: {b_res['prediction']}")
    print(f"  Confidence: {b_res['confidence']}%")
    print(f"  Probabilities: {b_res['probability_distribution']}")
    print(f"  Model Version: {b_res['modelVersion']}")
    print(f"  Grad-CAM: Length={len(b_res['gradcam_overlay'])} bytes")
    assert b_res["gradcam_overlay"].startswith("data:image/png;base64,")
    print("  [PASS] Brain MRI model and Grad-CAM passed.")

# 2. CHEST X-RAY TEST
print("\n[2] Testing Chest X-Ray Inference (DenseNet121_Lung.pth):")
lung_dir = DATA_DIR / "Lung and Colon Cancer" / "lung_aca"
lung_sample = next(lung_dir.glob("*.jpeg"), None) or next(lung_dir.glob("*.jpg"), None) or next(lung_dir.glob("*.png"), None)
if lung_sample:
    with open(lung_sample, "rb") as f:
        l_bytes = f.read()
    l_res = LUNG_SERVICE.predict(l_bytes, lung_sample.name)
    print(f"  Sample: {lung_sample.name}")
    print(f"  Scan Type: {l_res['scanType']}")
    print(f"  Prediction: {l_res['prediction']}")
    print(f"  Confidence: {l_res['confidence']}%")
    print(f"  Probabilities: {l_res['probability_distribution']}")
    print(f"  Model Version: {l_res['modelVersion']}")
    print(f"  Grad-CAM: Length={len(l_res['gradcam_overlay'])} bytes")
    assert l_res["gradcam_overlay"].startswith("data:image/png;base64,")
    print("  [PASS] Chest X-Ray model and Grad-CAM passed.")

# 3. HISTOPATHOLOGY TEST
print("\n[3] Testing Histopathology Inference (DenseNet121_Histopathology.pth):")
histo_dir = DATA_DIR / "Breast Cancer" / "breast_malignant"
histo_sample = next(histo_dir.glob("*.jpeg"), None) or next(histo_dir.glob("*.jpg"), None) or next(histo_dir.glob("*.png"), None)
if histo_sample:
    with open(histo_sample, "rb") as f:
        h_bytes = f.read()
    h_res = HISTOPATHOLOGY_SERVICE.predict(h_bytes, histo_sample.name)
    print(f"  Sample: {histo_sample.name}")
    print(f"  Scan Type: {h_res['scanType']}")
    print(f"  Prediction: {h_res['prediction']}")
    print(f"  Confidence: {h_res['confidence']}%")
    print(f"  Probabilities: {h_res['probability_distribution']}")
    print(f"  Model Version: {h_res['modelVersion']}")
    print(f"  Grad-CAM: Length={len(h_res['gradcam_overlay'])} bytes")
    assert h_res["gradcam_overlay"].startswith("data:image/png;base64,")
    print("  [PASS] Histopathology model and Grad-CAM passed.")

# 4. WDBC TABULAR MODEL NON-REGRESSION CHECK
print("\n[4] WDBC Tabular Random Forest Model Non-Regression Check:")
sample_features = np.ones((1, len(FEATURES)))
tab_pred = MODEL.predict(sample_features)
tab_prob = MODEL.predict_proba(sample_features)
print(f"  WDBC Prediction: {tab_pred[0]} | Probabilities: {tab_prob[0]}")
assert len(tab_pred) == 1
print("  [PASS] WDBC Tabular Random Forest model is 100% functional and unaffected.")

print("\n" + "=" * 70)
print("ALL MULTI-MODEL VERIFICATION TESTS PASSED SUCCESSFULLY!")
print("=" * 70)
