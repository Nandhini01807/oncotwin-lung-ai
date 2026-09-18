"""
Gradient-Weighted Class Activation Mapping (Grad-CAM) for DenseNet121
Target Layer: model.features.norm5
Project: OncoTwin – Explainable AI-Based Lung Cancer Detection and CDSS
"""

import io
import base64
from typing import Tuple, Optional
import numpy as np
from PIL import Image
import torch
import torch.nn as nn


class GradCAM:
    """
    Grad-CAM implementation for DenseNet121 `features.norm5` target layer.

    Mathematical Formulation:
      1. Gradient Computation: d(y^c) / d(A^k)
      2. Global Average Pooling (alpha_k^c):
         alpha_k^c = (1 / (H * W)) * sum_{i,j} (d(y^c) / d(A_{i,j}^k))
      3. Class Saliency Activation Map:
         L_GradCAM^c = ReLU( sum_{k=1}^{1024} alpha_k^c * A^k )
    """
    def __init__(self, model: nn.Module, target_layer: Optional[nn.Module] = None):
        self.model = model
        self.target_layer = target_layer or getattr(model, "features").norm5
        self.gradients = None
        self.activations = None
        self.hook_handle_forward = None
        self.hook_handle_backward = None
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.detach().clone()

        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach().clone()

        self.hook_handle_forward = self.target_layer.register_forward_hook(forward_hook)
        self.hook_handle_backward = self.target_layer.register_full_backward_hook(backward_hook)

    def generate_heatmap(self, input_tensor: torch.Tensor, class_idx: int) -> np.ndarray:
        """
        Executes backward pass and derives raw 2D Grad-CAM saliency activation array [0.0, 1.0].
        """
        self.model.zero_grad()
        logits = self.model(input_tensor)
        score = logits[0, class_idx]
        score.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            return np.zeros((224, 224), dtype=np.float32)

        # 1. Global average pooling over gradients -> alpha weights (Batch, Channels, 1, 1)
        weights = torch.mean(self.gradients, dim=[2, 3], keepdim=True)

        # 2. Weighted linear combination of activation maps
        cam = torch.sum(weights * self.activations, dim=1).squeeze(0)

        # 3. Apply ReLU to retain positive salient activations
        cam = torch.clamp(cam, min=0.0)
        cam_np = cam.detach().cpu().numpy()

        # 4. Min-Max normalization [0, 1]
        max_val = np.max(cam_np)
        if max_val > 1e-8:
            cam_np = (cam_np - np.min(cam_np)) / (max_val - np.min(cam_np) + 1e-8)
        else:
            cam_np = np.zeros_like(cam_np)

        return cam_np

    def generate_heatmap_and_overlay(
        self,
        original_image_pil: Image.Image,
        input_tensor: torch.Tensor,
        class_idx: int,
        alpha: float = 0.45
    ) -> Tuple[Image.Image, Image.Image, np.ndarray]:
        """
        Generates:
          1. Colored Heatmap PIL Image (Jet Colormap)
          2. Blended Saliency Overlay PIL Image
          3. Raw 2D Heatmap Array
        """
        cam_2d = self.generate_heatmap(input_tensor, class_idx)

        # Resize heatmap array to original image dimensions
        orig_w, orig_h = original_image_pil.size
        heatmap_pil = Image.fromarray((cam_2d * 255.0).astype(np.uint8))
        heatmap_resized = heatmap_pil.resize((orig_w, orig_h), resample=Image.Resampling.BILINEAR)
        heat_arr = np.array(heatmap_resized, dtype=np.float32) / 255.0

        # Custom Jet Colormap: Blue -> Cyan -> Yellow -> Red
        r = np.clip(1.5 - np.abs(heat_arr * 4.0 - 3.0), 0.0, 1.0)
        g = np.clip(1.5 - np.abs(heat_arr * 4.0 - 2.0), 0.0, 1.0)
        b = np.clip(1.5 - np.abs(heat_arr * 4.0 - 1.0), 0.0, 1.0)
        colored_heat = (np.stack([r, g, b], axis=-1) * 255.0).astype(np.uint8)
        colored_heatmap_pil = Image.fromarray(colored_heat)

        # Alpha Blend with Original CT Image: I_Overlay = (1 - alpha)*I_CT + alpha*I_Heatmap
        orig_arr = np.array(original_image_pil.convert("RGB"), dtype=np.float32)
        overlay_arr = (orig_arr * (1.0 - alpha) + colored_heat * alpha).astype(np.uint8)
        overlay_pil = Image.fromarray(overlay_arr)

        return colored_heatmap_pil, overlay_pil, cam_2d

    def remove_hooks(self):
        """Removes forward and backward hooks cleanly."""
        if self.hook_handle_forward:
            self.hook_handle_forward.remove()
        if self.hook_handle_backward:
            self.hook_handle_backward.remove()
