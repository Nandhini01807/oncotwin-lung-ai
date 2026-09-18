import os
import io
import json
import base64
import uuid
from pathlib import Path
from typing import Dict, Any
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms
from torchvision.models import densenet121
from PIL import Image

from services.gradcam import DenseNetGradCAM, apply_colormap_and_overlay

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "scans").mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "heatmaps").mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "overlays").mkdir(parents=True, exist_ok=True)

HISTOPATHOLOGY_CLASSES = [
    {"key": "breast_benign", "label": "Benign Histopathology Tissue", "type": "Benign", "short": "Benign Tissue"},
    {"key": "breast_malignant", "label": "Malignant Carcinoma Cells Detected", "type": "Malignant", "short": "Malignant Carcinoma"},
    {"key": "cervix_dyk", "label": "Dyskeratotic Abnormal Precancerous Cells", "type": "Malignant", "short": "Abnormal Cells"}
]

class HistopathologyInferenceService:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = self._build_model()
        self.weights_loaded = False
        self._load_weights()

    def _build_model(self) -> nn.Module:
        model = densenet121(weights=None)
        num_features = model.classifier.in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(num_features, 256),
            nn.ReLU(),
            nn.Dropout(p=0.2),
            nn.Linear(256, len(HISTOPATHOLOGY_CLASSES))
        )
        model.to(self.device)
        model.eval()
        return model

    def _load_weights(self):
        for candidate in ["histopathology_model.pth", "DenseNet121_Histopathology.pth"]:
            w_path = MODELS_DIR / candidate
            if w_path.exists():
                try:
                    state = torch.load(w_path, map_location=self.device, weights_only=True)
                    self.model.load_state_dict(state)
                    self.weights_loaded = True
                    print(f"[Histopathology Service] Loaded weights from {w_path}")
                    break
                except Exception as e:
                    print(f"[Histopathology Service] Error loading weights: {e}")

    def predict(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        if not self.weights_loaded:
            self._load_weights()
            if not self.weights_loaded:
                raise RuntimeError("Histopathology model weights (DenseNet121_Histopathology.pth) not found.")

        try:
            image_pil = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Could not decode Histopathology image: {e}")

        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        input_tensor = transform(image_pil).unsqueeze(0).to(self.device)
        input_tensor.requires_grad_(True)

        gradcam = DenseNetGradCAM(self.model, self.model.features.norm5)

        self.model.eval()
        with torch.set_grad_enabled(True):
            logits = self.model(input_tensor)
            probs = torch.softmax(logits, dim=1).detach().cpu().numpy()[0]
            pred_idx = int(np.argmax(probs))
            cam_heatmap = gradcam.generate(input_tensor, class_idx=pred_idx)
            gradcam.remove_hooks()

        class_info = HISTOPATHOLOGY_CLASSES[pred_idx]
        confidence = round(float(probs[pred_idx]) * 100, 2)

        prob_dist = {
            cls_item["short"]: round(float(probs[i]) * 100, 2)
            for i, cls_item in enumerate(HISTOPATHOLOGY_CLASSES)
        }

        colored_heatmap_pil, overlay_pil = apply_colormap_and_overlay(image_pil, cam_heatmap, alpha=0.45)

        overlay_buffer = io.BytesIO()
        overlay_pil.save(overlay_buffer, format="PNG")
        overlay_base64 = "data:image/png;base64," + base64.b64encode(overlay_buffer.getvalue()).decode("utf-8")

        scan_id = uuid.uuid4().hex[:12]
        scan_filename = f"scan_histo_{scan_id}.png"
        heatmap_filename = f"heatmap_histo_{scan_id}.png"
        overlay_filename = f"overlay_histo_{scan_id}.png"

        image_pil.save(UPLOADS_DIR / "scans" / scan_filename, format="PNG")
        colored_heatmap_pil.save(UPLOADS_DIR / "heatmaps" / heatmap_filename, format="PNG")
        overlay_pil.save(UPLOADS_DIR / "overlays" / overlay_filename, format="PNG")

        return {
            "scanType": "Histopathology",
            "prediction": class_info["label"],
            "primary_diagnosis": class_info["type"],
            "confidence": confidence,
            "probability_distribution": prob_dist,
            "gradcam_overlay": overlay_base64,
            "overlay_url": f"/uploads/overlays/{overlay_filename}",
            "heatmap_url": f"/uploads/heatmaps/{heatmap_filename}",
            "original_image": f"/uploads/scans/{scan_filename}",
            "modelVersion": "DenseNet121_Histopathology.pth (Kaggle Multi Cancer Dataset)",
            "disclaimer": "This result is generated by DenseNet121 (Histopathology model) and is intended for clinical decision support under doctor review only. The doctor manually assigns the official clinical stage."
        }

HISTOPATHOLOGY_SERVICE = HistopathologyInferenceService()
