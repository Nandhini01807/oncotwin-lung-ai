import io
import base64
from typing import Tuple
import numpy as np
import torch
import torch.nn as nn
from PIL import Image

class DenseNetGradCAM:
    """
    Reusable Grad-CAM implementation for DenseNet121.
    Hooks into target layer (default: features.norm5) to compute gradient-weighted
    class activation maps for visual interpretability.
    """
    def __init__(self, model: nn.Module, target_layer: nn.Module = None):
        self.model = model
        self.target_layer = target_layer if target_layer is not None else model.features.norm5
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
        # ReLU to keep only features that have a positive influence on the target class
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

def apply_colormap_and_overlay(original_pil: Image.Image, cam_heatmap: np.ndarray, alpha: float = 0.45) -> Tuple[Image.Image, Image.Image]:
    """
    Resizes heatmap to original image dimensions, applies custom Jet-like colormap,
    and blends with the original image with alpha transparency.
    """
    orig_w, orig_h = original_pil.size
    heatmap_img = Image.fromarray(np.uint8(cam_heatmap * 255)).resize((orig_w, orig_h), resample=Image.Resampling.BILINEAR)
    heatmap_arr = np.array(heatmap_img) / 255.0

    # Custom Jet-like RGB colormap: Blue (cold) -> Cyan -> Yellow -> Red (hot/salient)
    r = np.clip(1.5 - np.abs(heatmap_arr * 4 - 3), 0, 1)
    g = np.clip(1.5 - np.abs(heatmap_arr * 4 - 2), 0, 1)
    b = np.clip(1.5 - np.abs(heatmap_arr * 4 - 1), 0, 1)
    colored_heatmap = (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)
    colored_heatmap_pil = Image.fromarray(colored_heatmap)

    orig_arr = np.array(original_pil)
    overlay_arr = (orig_arr * (1.0 - alpha) + colored_heatmap * alpha).astype(np.uint8)
    overlay_pil = Image.fromarray(overlay_arr)

    return colored_heatmap_pil, overlay_pil
