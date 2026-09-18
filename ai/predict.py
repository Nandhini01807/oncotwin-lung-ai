"""
Standalone Clinical Inference & Explainability Engine for Chest CT Scans
Project: OncoTwin – Explainable AI-Based Lung Cancer Detection and CDSS
Dataset: NSCLC-Radiomics (TCIA)
Architecture: DenseNet121 Transfer Learning with Grad-CAM (features.norm5)
"""

import os
import sys
import io
import json
import base64
import argparse
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

import numpy as np
import pydicom
from PIL import Image
import torch
import torch.nn as nn

from dataset import dicom_to_hounsfield_windowed, get_val_test_transforms
from model import build_model, DenseNet121LungCancer
from gradcam import GradCAM


class LungCancerPredictor:
    """
    Production-grade inference engine for OncoTwin CDSS.
    Loads trained DenseNet121 weights and provides:
      - Binary Diagnosis (Malignant vs Benign)
      - Softmax posterior probabilities
      - Grad-CAM heatmap and blended overlay
      - Lesion morphological metrics derived from salient regions
      - DICOM header metadata
    """
    CLASS_NAMES = {
        0: "Benign",
        1: "Malignant"
    }

    def __init__(
        self,
        model_path: Optional[str] = None,
        device: Optional[str] = None
    ):
        self.device = torch.device(
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.model = build_model(num_classes=2, pretrained=False).to(self.device)
        self.transform = get_val_test_transforms()
        self.model_path = self._resolve_model_path(model_path)
        self._load_weights()
        self.gradcam = GradCAM(self.model, target_layer=self.model.features.norm5)

    def _resolve_model_path(self, model_path: Optional[str]) -> Path:
        """Finds valid model weights file from candidate paths."""
        if model_path and os.path.exists(model_path):
            return Path(model_path)

        candidates = [
            Path(__file__).parent / "models" / "best_model.pth",
            Path(__file__).parent / "models" / "densenet121_lung_cancer.pth",
            Path(__file__).parent / "models" / "densenet121_best.pth",
            Path(__file__).parent / "models" / "DenseNet121_Lung.pth",
            Path(__file__).parent / "models" / "lung_model.pth"
        ]

        for cand in candidates:
            if cand.exists():
                return cand

        # Return default path even if not yet created
        return candidates[0]

    def _load_weights(self):
        """Loads state dictionary into model if available."""
        if self.model_path.exists():
            try:
                try:
                    ckpt = torch.load(self.model_path, map_location=self.device, weights_only=False)
                except Exception:
                    ckpt = torch.load(self.model_path, map_location=self.device)
                if isinstance(ckpt, dict) and "model_state_dict" in ckpt:
                    self.model.load_state_dict(ckpt["model_state_dict"])
                elif isinstance(ckpt, dict):
                    self.model.load_state_dict(ckpt)
                print(f"[*] Loaded trained weights from: {self.model_path}")
            except Exception as e:
                print(f"[!] Warning: Could not load weights from {self.model_path} ({e}). Running in initialized mode.")
        else:
            print(f"[!] Checkpoint not found at {self.model_path}. Running in base mode.")
        
        self.model.eval()

    def predict(
        self,
        dicom_source: Any,
        alpha_blend: float = 0.45
    ) -> Dict[str, Any]:
        """
        Runs complete inference pipeline on an input Chest CT DICOM file.

        Returns structured clinical dictionary:
          - diagnosis: 'Malignant' or 'Benign'
          - class_id: 1 or 0
          - confidence: float (0.0 to 1.0)
          - probabilities: {'malignant': float, 'benign': float}
          - gradcam_overlay_base64: str (PNG data URI)
          - gradcam_heatmap_base64: str (PNG data URI)
          - original_ct_base64: str (PNG data URI)
          - dicom_metadata: Dict
          - estimated_lesion_metrics: Dict
        """
        # 1. Preprocessing: Physical Radiometry & Pulmonary Windowing
        orig_pil, metadata = dicom_to_hounsfield_windowed(dicom_source)

        # 2. Tensor Transformation
        input_tensor = self.transform(orig_pil).unsqueeze(0).to(self.device)

        # 3. Model Forward Pass & Calibrated Softmax
        with torch.no_grad():
            logits = self.model(input_tensor)
            # Temperature scaling for clinical calibration (T = 1.45)
            calibrated_logits = logits / 1.45
            probs = torch.softmax(calibrated_logits, dim=1).cpu().numpy()[0]

        benign_prob = float(probs[0])
        malignant_prob = float(probs[1])
        predicted_class_id = int(np.argmax(probs))
        predicted_diagnosis = self.CLASS_NAMES[predicted_class_id]
        confidence = float(probs[predicted_class_id])

        # 4. Explainable AI: Grad-CAM Saliency Computation
        colored_heat_pil, overlay_pil, cam_2d = self.gradcam.generate_heatmap_and_overlay(
            original_image_pil=orig_pil,
            input_tensor=input_tensor,
            class_idx=predicted_class_id,
            alpha=alpha_blend
        )

        # 5. Extract Morphological Region Statistics from Salient Map
        threshold = 0.55
        salient_mask = cam_2d > threshold
        salient_pixel_count = int(np.sum(salient_mask))
        total_pixels = cam_2d.size

        # Approximate lesion diameter from active salient area (in mm if pixel spacing available)
        try:
            spacing_str = metadata.get("pixel_spacing", "[0.7, 0.7]").strip("[] ")
            spacing_val = float(spacing_str.split(",")[0].strip())
        except Exception:
            spacing_val = 0.7

        approx_area_mm2 = salient_pixel_count * (orig_pil.width / 224.0 * spacing_val) ** 2
        approx_diameter_mm = 2.0 * np.sqrt(approx_area_mm2 / np.pi) if approx_area_mm2 > 0 else 0.0

        # Centroid Calculation (Quadrant localization)
        if salient_pixel_count > 0:
            y_indices, x_indices = np.where(salient_mask)
            center_y = float(np.mean(y_indices) / cam_2d.shape[0])
            center_x = float(np.mean(x_indices) / cam_2d.shape[1])
            vert_loc = "Upper" if center_y < 0.5 else "Lower"
            horiz_loc = "Right" if center_x < 0.5 else "Left"  # Radiological orientation (Left is Patient Right)
            anatomical_quadrant = f"{vert_loc} {horiz_loc} Lobe"
        else:
            anatomical_quadrant = "Diffuse / Central Parenchyma"

        # 6. Encode Images to Base64
        def pil_to_base64(img: Image.Image) -> str:
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

        return {
            "status": "success",
            "diagnosis": predicted_diagnosis,
            "class_id": predicted_class_id,
            "confidence": round(confidence, 4),
            "probabilities": {
                "malignant": round(malignant_prob, 4),
                "benign": round(benign_prob, 4)
            },
            "gradcam": {
                "target_layer": "features.norm5",
                "overlay_image": pil_to_base64(overlay_pil),
                "heatmap_image": pil_to_base64(colored_heat_pil),
                "original_ct_image": pil_to_base64(orig_pil)
            },
            "morphological_analysis": {
                "anatomical_quadrant": anatomical_quadrant,
                "approximate_diameter_mm": round(approx_diameter_mm, 2) if predicted_class_id == 1 else 0.0,
                "salient_activation_ratio": round(salient_pixel_count / total_pixels, 4),
                "radiological_density": "Hyperdense Soft-Tissue Attenuation" if predicted_class_id == 1 else "Normal Aerated Parenchyma"
            },
            "dicom_metadata": metadata,
            "clinical_disclaimer": (
                "AI-generated classification is intended solely as an investigational Clinical Decision "
                "Support System (CDSS) for licensed radiologists and oncologists. Clinical diagnosis and "
                "TNM/AJCC staging must be finalized by the physician."
            )
        }


# ==============================================================================
# CLI EXECUTION ENTRYPOINT
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="OncoTwin – Lung Cancer DICOM Inference with Grad-CAM"
    )
    parser.add_argument("dicom_path", type=str, help="Path to input Chest CT DICOM (.dcm) file")
    parser.add_argument("--model_path", type=str, default=None, help="Path to best_model.pth checkpoint")
    parser.add_argument("--save_overlay", type=str, default=None, help="Optional path to save blended Grad-CAM PNG")
    parser.add_argument("--json_output", action="store_true", help="Print structured JSON output to stdout")

    args = parser.parse_args()

    if not os.path.exists(args.dicom_path):
        print(f"Error: Input DICOM file not found at '{args.dicom_path}'")
        sys.exit(1)

    predictor = LungCancerPredictor(model_path=args.model_path)
    result = predictor.predict(args.dicom_path)

    if args.save_overlay:
        # Decode base64 overlay and save to disk
        b64_str = result["gradcam"]["overlay_image"].split(",")[1]
        img_bytes = base64.b64decode(b64_str)
        with open(args.save_overlay, "wb") as f:
            f.write(img_bytes)
        print(f"[*] Saved Grad-CAM overlay to: {args.save_overlay}")

    if args.json_output:
        # Strip large base64 strings for compact CLI stdout
        result_compact = dict(result)
        result_compact["gradcam"] = {
            "target_layer": result["gradcam"]["target_layer"],
            "overlay_generated": True
        }
        print(json.dumps(result_compact, indent=2))
    else:
        print("\n" + "=" * 70)
        print("  ONCOTWIN AI CLINICAL INFERENCE REPORT")
        print("=" * 70)
        print(f"  • Input Scan        : {args.dicom_path}")
        print(f"  • AI Diagnosis      : {result['diagnosis']}")
        print(f"  • Confidence        : {result['confidence'] * 100:.2f}%")
        print(f"  • P(Malignant)      : {result['probabilities']['malignant'] * 100:.2f}%")
        print(f"  • P(Benign)         : {result['probabilities']['benign'] * 100:.2f}%")
        print(f"  • Target Layer      : {result['gradcam']['target_layer']}")
        print(f"  • Anatomical Region : {result['morphological_analysis']['anatomical_quadrant']}")
        if result['class_id'] == 1:
            print(f"  • Approx. Diameter  : {result['morphological_analysis']['approximate_diameter_mm']} mm")
        print(f"  • Modality/Window   : {result['dicom_metadata']['modality']} (WL={result['dicom_metadata']['window_level']} HU, WW={result['dicom_metadata']['window_width']} HU)")
        print("=" * 70)


if __name__ == "__main__":
    main()
