import os
import io
import json
import base64
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms, models
from torchvision.models import densenet121
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "scans").mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "heatmaps").mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "overlays").mkdir(parents=True, exist_ok=True)

CLASS_MAPPING = {
    "lung_bnt": {"label": "Benign (Normal Lung Tissue)", "type": "Benign", "idx": 0},
    "lung_aca": {"label": "Malignant (Lung Adenocarcinoma)", "type": "Malignant", "idx": 1},
    "lung_scc": {"label": "Malignant (Lung Squamous Cell Carcinoma)", "type": "Malignant", "idx": 2}
}
CLASSES = ["lung_bnt", "lung_aca", "lung_scc"]

class DenseNetGradCAM:
    """
    Grad-CAM implementation for DenseNet121 target layer (features.norm5).
    Produces class activation map highlighting salient regions for model decision.
    """
    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self.hook_handle = None
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output
            output.register_hook(self._save_gradient)

        self.hook_handle = self.target_layer.register_forward_hook(forward_hook)

    def _save_gradient(self, grad):
        self.gradients = grad.clone()

    def generate(self, input_tensor: torch.Tensor, class_idx: int) -> np.ndarray:
        self.model.zero_grad()
        output = self.model(input_tensor)
        score = output[0, class_idx]
        score.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            return np.zeros((224, 224), dtype=np.float32)

        # Global average pooling over gradients
        weights = torch.mean(self.gradients, dim=[2, 3], keepdim=True)
        # Weighted combination of activation maps
        cam = torch.sum(weights * self.activations, dim=1).squeeze(0)
        # ReLU to keep only features that have a positive influence
        cam = torch.clamp(cam, min=0)
        cam_np = cam.detach().cpu().numpy()

        # Normalize 0 to 1
        max_val = np.max(cam_np)
        if max_val > 1e-8:
            cam_np = cam_np / max_val
        else:
            cam_np = np.zeros_like(cam_np)

        return cam_np

    def remove_hooks(self):
        if self.hook_handle:
            self.hook_handle.remove()

def apply_colormap_and_overlay(original_pil: Image.Image, cam_heatmap: np.ndarray, alpha=0.45) -> Tuple[Image.Image, Image.Image]:
    """
    Resizes heatmap to original image dimensions, applies custom colormap,
    and blends with original image.
    """
    orig_w, orig_h = original_pil.size
    heatmap_img = Image.fromarray(np.uint8(cam_heatmap * 255)).resize((orig_w, orig_h), resample=Image.Resampling.BILINEAR)
    heatmap_arr = np.array(heatmap_img) / 255.0

    # Custom Jet-like RGB colormap: Blue -> Cyan -> Yellow -> Red
    r = np.clip(1.5 - np.abs(heatmap_arr * 4 - 3), 0, 1)
    g = np.clip(1.5 - np.abs(heatmap_arr * 4 - 2), 0, 1)
    b = np.clip(1.5 - np.abs(heatmap_arr * 4 - 1), 0, 1)
    colored_heatmap = (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)
    colored_heatmap_pil = Image.fromarray(colored_heatmap)

    orig_arr = np.array(original_pil)
    overlay_arr = (orig_arr * (1.0 - alpha) + colored_heatmap * alpha).astype(np.uint8)
    overlay_pil = Image.fromarray(overlay_arr)

    return colored_heatmap_pil, overlay_pil

class DenseNetLungPipeline:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = self._build_model()
        self.weights_loaded = False
        self.metrics = None
        self._load_weights_and_metrics()

    def _build_model(self) -> nn.Module:
        model = densenet121(weights=None)
        num_features = model.classifier.in_features
        model.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(num_features, 256),
            nn.ReLU(),
            nn.Dropout(p=0.2),
            nn.Linear(256, len(CLASSES))
        )
        model.to(self.device)
        model.eval()
        return model

    def _load_weights_and_metrics(self):
        weights_path = MODELS_DIR / "densenet121_lung_cancer.pth"
        metrics_path = MODELS_DIR / "densenet121_lung_metrics.json"

        if weights_path.exists():
            try:
                state = torch.load(weights_path, map_location=self.device, weights_only=True)
                self.model.load_state_dict(state)
                self.weights_loaded = True
                print(f"[DenseNet Pipeline] Loaded DenseNet121 weights from {weights_path}")
            except Exception as e:
                print(f"[DenseNet Pipeline] Error loading weights: {e}")

        if metrics_path.exists():
            try:
                with open(metrics_path, "r", encoding="utf-8") as f:
                    self.metrics = json.load(f)
            except Exception as e:
                print(f"[DenseNet Pipeline] Error loading metrics: {e}")

    def analyze_scan(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        if not self.weights_loaded:
            # Try reloading once in case training just finished
            self._load_weights_and_metrics()
            if not self.weights_loaded:
                raise RuntimeError("DenseNet121 model weights are not loaded.")

        if not file_bytes or len(file_bytes) == 0:
            raise ValueError("Empty image bytes received.")

        try:
            image_pil = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Could not decode image file: {e}")

        # Preprocessing: 224x224, ImageNet normalization stats
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        input_tensor = transform(image_pil).unsqueeze(0).to(self.device)
        input_tensor.requires_grad_(True)

        # Grad-CAM target layer
        target_layer = self.model.features.norm5
        gradcam = DenseNetGradCAM(self.model, target_layer)

        self.model.eval()
        with torch.set_grad_enabled(True):
            logits = self.model(input_tensor)
            probs = torch.softmax(logits, dim=1).detach().cpu().numpy()[0]
            pred_class_idx = int(np.argmax(probs))
            cam_heatmap = gradcam.generate(input_tensor, class_idx=pred_class_idx)
            gradcam.remove_hooks()

        confidence = round(float(probs[pred_class_idx]) * 100, 2)
        raw_key = CLASSES[pred_class_idx]
        class_info = CLASS_MAPPING.get(raw_key, {"label": raw_key, "type": "Malignant"})

        primary_diagnosis = class_info["type"]
        classification_label = class_info["label"]

        # Generate colored heatmap and overlay
        colored_heatmap_pil, overlay_pil = apply_colormap_and_overlay(image_pil, cam_heatmap, alpha=0.45)

        # Convert overlay to base64
        overlay_buffer = io.BytesIO()
        overlay_pil.save(overlay_buffer, format="PNG")
        overlay_base64 = "data:image/png;base64," + base64.b64encode(overlay_buffer.getvalue()).decode("utf-8")

        # Also save to static files
        import uuid
        scan_id = uuid.uuid4().hex[:12]
        scan_filename = f"scan_{scan_id}.png"
        heatmap_filename = f"heatmap_{scan_id}.png"
        overlay_filename = f"overlay_{scan_id}.png"

        image_pil.save(UPLOADS_DIR / "scans" / scan_filename, format="PNG")
        colored_heatmap_pil.save(UPLOADS_DIR / "heatmaps" / heatmap_filename, format="PNG")
        overlay_pil.save(UPLOADS_DIR / "overlays" / overlay_filename, format="PNG")

        # Non-clinical lesion activation heuristic for reference hint
        activation_ratio = float(np.mean(cam_heatmap > 0.45))
        if primary_diagnosis == "Benign":
            severity_level = "None"
        elif activation_ratio < 0.12:
            severity_level = "Small"
        elif activation_ratio < 0.28:
            severity_level = "Moderate"
        else:
            severity_level = "Large"

        return {
            "cancerType": "lung",
            "supportedModality": "2D Medical Images (Kaggle Multi Cancer Dataset)",
            "classification": classification_label,
            "primary_diagnosis": primary_diagnosis,
            "subclass": raw_key,
            "confidence": confidence,
            "severity_level": severity_level,
            "gradcam_overlay": overlay_base64,
            "overlay_url": f"/uploads/overlays/{overlay_filename}",
            "heatmap_url": f"/uploads/heatmaps/{heatmap_filename}",
            "original_image": f"/uploads/scans/{scan_filename}",
            "modelVersion": "DenseNet121-MultiCancer-v1.0",
            "modelMetrics": self.metrics["metrics"] if self.metrics else None,
            "disclaimer": "This result is generated by the trained DenseNet121 model (Kaggle Multi Cancer Dataset) and is intended for clinical decision support under doctor review only. The AI predicts cancer class and confidence score only; the attending doctor assigns the official clinical stage."
        }

PIPELINE = DenseNetLungPipeline()
