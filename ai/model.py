"""
DenseNet121 Model Architecture for Lung Cancer Detection (NSCLC-Radiomics)
Project: OncoTwin – Explainable AI-Based Lung Cancer Detection and CDSS
"""

from typing import Dict, Any, Tuple
import torch
import torch.nn as nn
from torchvision.models import densenet121, DenseNet121_Weights


class DenseNet121LungCancer(nn.Module):
    """
    DenseNet121 with Transfer Learning for Binary Lung Cancer Classification:
      Class 0: Benign
      Class 1: Malignant

    Architecture:
      - Feature Extractor: Pretrained DenseNet121 Backbone (up to features.norm5)
      - Global Average Pooling (AdaptiveAvgPool2d(1, 1))
      - Classifier Head:
          - Dropout(p=0.30)
          - Linear(1024 -> 256)
          - ReLU(inplace=True)
          - Dropout(p=0.20)
          - Linear(256 -> 2)
    """
    def __init__(self, num_classes: int = 2, pretrained: bool = True):
        super(DenseNet121LungCancer, self).__init__()

        # 1. Load Pretrained Backbone
        weights = DenseNet121_Weights.DEFAULT if pretrained else None
        base_model = densenet121(weights=weights)

        # 2. Extract Feature Backbone (including features.norm5)
        self.features = base_model.features
        num_features = base_model.classifier.in_features  # 1024

        # 3. Global Pooling
        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))

        # 4. Custom Clinical Oncology Classification Head
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.30),
            nn.Linear(num_features, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.20),
            nn.Linear(256, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward Pass:
          Input: (Batch, 3, 224, 224)
          Features: (Batch, 1024, 7, 7)
          GAP: (Batch, 1024)
          Logits: (Batch, 2)
        """
        features = self.features(x)
        out = nn.functional.relu(features, inplace=False)
        out = self.global_pool(out)
        out = torch.flatten(out, 1)
        logits = self.classifier(out)
        return logits

    def predict_proba(self, x: torch.Tensor, temperature: float = 1.45) -> torch.Tensor:
        """
        Computes calibrated Softmax posterior probabilities:
          P(y = k | x) = exp(z_k / T) / sum(exp(z_j / T))
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            scaled_logits = logits / temperature
            probs = torch.softmax(scaled_logits, dim=1)
        return probs

    def get_gradcam_target_layer(self) -> nn.Module:
        """
        Returns the optimal target layer for Grad-CAM saliency mapping:
        features.norm5 (the final BatchNorm layer before global pooling).
        """
        return self.features.norm5


def build_model(num_classes: int = 2, pretrained: bool = True) -> DenseNet121LungCancer:
    """Factory helper to instantiate DenseNet121 model."""
    return DenseNet121LungCancer(num_classes=num_classes, pretrained=pretrained)
