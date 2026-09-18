"""
Training Utilities, Clinical Metrics Calculation & Visualization Plotters
Project: OncoTwin – Explainable AI-Based Lung Cancer Detection and CDSS
Dataset: NSCLC-Radiomics (TCIA)
"""

import os
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # Non-interactive headless backend
import matplotlib.pyplot as plt
try:
    import seaborn as sns
except ImportError:
    sns = None
import torch
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    roc_curve,
    confusion_matrix,
    classification_report
)


# ==============================================================================
# 1. CLINICAL PERFORMANCE METRIC COMPUTATION
# ==============================================================================

def calculate_metrics(
    y_true: List[int] or np.ndarray,
    y_pred: List[int] or np.ndarray,
    y_probs: List[float] or np.ndarray
) -> Dict[str, Any]:
    """
    Computes rigorous clinical evaluation metrics for binary lung cancer classification:
      - Class 0: Benign
      - Class 1: Malignant

    Returns dictionary with:
      - accuracy, precision, sensitivity (recall), specificity, f1_score, roc_auc
      - confusion_matrix: [[TN, FP], [FN, TP]]
      - tp, tn, fp, fn
      - classification_report
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    y_probs = np.array(y_probs)

    # If y_probs is 2D (N, 2), extract probability for positive class (Class 1: Malignant)
    if y_probs.ndim == 2:
        y_prob_positive = y_probs[:, 1]
    else:
        y_prob_positive = y_probs

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    if cm.shape == (2, 2):
        tn, fp, fn, tp = cm.ravel()
    else:
        tn = int(cm[0, 0]) if cm.shape[0] > 0 else 0
        fp = 0
        fn = 0
        tp = int(cm[1, 1]) if cm.shape[0] > 1 else 0

    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    sens = float(recall_score(y_true, y_pred, zero_division=0))  # Sensitivity / Recall
    spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0      # Specificity
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    try:
        if len(np.unique(y_true)) > 1:
            auc = float(roc_auc_score(y_true, y_prob_positive))
        else:
            auc = 1.0
    except Exception:
        auc = 0.5

    report = classification_report(
        y_true,
        y_pred,
        target_names=["Benign (0)", "Malignant (1)"],
        output_dict=True,
        zero_division=0
    )

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "sensitivity": round(sens, 4),
        "recall": round(sens, 4),
        "specificity": round(spec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(auc, 4),
        "tp": int(tp),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "confusion_matrix": cm.tolist(),
        "classification_report": report
    }


# ==============================================================================
# 2. EARLY STOPPING HANDLER
# ==============================================================================

class EarlyStopping:
    """
    Early stops the training if validation loss doesn't improve after a given patience.
    Saves the best model checkpoint state.
    """
    def __init__(
        self,
        patience: int = 10,
        verbose: bool = True,
        delta: float = 1e-4,
        path: str = "best_model.pth",
        trace_func=print
    ):
        self.patience = patience
        self.verbose = verbose
        self.counter = 0
        self.best_score = None
        self.early_stop = False
        self.val_loss_min = np.inf
        self.delta = delta
        self.path = path
        self.trace_func = trace_func

    def __call__(self, val_loss: float, model: torch.nn.Module, epoch: int, metrics: Dict[str, Any] = None):
        score = -val_loss

        if self.best_score is None:
            self.best_score = score
            self.save_checkpoint(val_loss, model, epoch, metrics)
        elif score < self.best_score + self.delta:
            self.counter += 1
            if self.verbose:
                self.trace_func(f"  [EarlyStopping] Patience counter: {self.counter}/{self.patience} (Best Val Loss: {self.val_loss_min:.4f})")
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_score = score
            self.save_checkpoint(val_loss, model, epoch, metrics)
            self.counter = 0

    def save_checkpoint(self, val_loss: float, model: torch.nn.Module, epoch: int, metrics: Dict[str, Any] = None):
        """Saves model when validation loss decreases."""
        if self.verbose:
            self.trace_func(f"  [EarlyStopping] Validation loss decreased ({self.val_loss_min:.4f} --> {val_loss:.4f}). Saving best checkpoint to '{self.path}'...")
        
        checkpoint_dir = os.path.dirname(self.path)
        if checkpoint_dir and not os.path.exists(checkpoint_dir):
            os.makedirs(checkpoint_dir, exist_ok=True)

        torch.save({
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "val_loss": val_loss,
            "metrics": metrics or {}
        }, self.path)
        self.val_loss_min = val_loss


# ==============================================================================
# 3. PUBLICATION-QUALITY PLOTTING UTILITIES
# ==============================================================================

def setup_plot_style():
    """Configures clean medical journal styling for Matplotlib."""
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.size"] = 11
    plt.rcParams["axes.labelsize"] = 12
    plt.rcParams["axes.titlesize"] = 13
    plt.rcParams["legend.fontsize"] = 10
    plt.rcParams["figure.titlesize"] = 14


def plot_training_curves(
    history: Dict[str, List[float]],
    save_dir: str or Path
) -> Tuple[Path, Path]:
    """
    Plots and exports:
      1. accuracy_curve.png (Train Accuracy vs Val Accuracy across epochs)
      2. loss_curve.png (Train Loss vs Val Loss across epochs)
    """
    setup_plot_style()
    save_dir = Path(save_dir)
    save_dir.mkdir(parents=True, exist_ok=True)

    epochs = range(1, len(history["train_loss"]) + 1)

    # 1. Loss Curve
    fig, ax = plt.subplots(figsize=(8, 5), dpi=300)
    ax.plot(epochs, history["train_loss"], "o-", color="#1e3a8a", linewidth=2.2, label="Training Loss")
    ax.plot(epochs, history["val_loss"], "s--", color="#dc2626", linewidth=2.2, label="Validation Loss")
    ax.set_title("Cross-Entropy Loss vs. Epochs (NSCLC-Radiomics)", fontweight="bold", pad=12)
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Loss")
    ax.legend(frameon=True, loc="upper right")
    ax.grid(True, linestyle="--", alpha=0.6)
    plt.tight_layout()
    loss_path = save_dir / "loss_curve.png"
    plt.savefig(loss_path)
    plt.close(fig)

    # 2. Accuracy Curve
    fig, ax = plt.subplots(figsize=(8, 5), dpi=300)
    ax.plot(epochs, [a * 100 for a in history["train_acc"]], "o-", color="#059669", linewidth=2.2, label="Training Accuracy (%)")
    ax.plot(epochs, [a * 100 for a in history["val_acc"]], "s--", color="#7c3aed", linewidth=2.2, label="Validation Accuracy (%)")
    ax.set_title("Classification Accuracy vs. Epochs (DenseNet121)", fontweight="bold", pad=12)
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Accuracy (%)")
    ax.set_ylim([0, 105])
    ax.legend(frameon=True, loc="lower right")
    ax.grid(True, linestyle="--", alpha=0.6)
    plt.tight_layout()
    acc_path = save_dir / "accuracy_curve.png"
    plt.savefig(acc_path)
    plt.close(fig)

    return loss_path, acc_path


def plot_confusion_matrix(
    cm: np.ndarray or List[List[int]],
    save_path: str or Path,
    class_names: List[str] = ["Benign (0)", "Malignant (1)"]
) -> Path:
    """
    Plots and exports a clinical Confusion Matrix heatmap (confusion_matrix.png).
    """
    setup_plot_style()
    save_path = Path(save_path)
    save_path.parent.mkdir(parents=True, exist_ok=True)

    cm = np.array(cm)
    fig, ax = plt.subplots(figsize=(7, 6), dpi=300)
    
    if sns is not None:
        sns.heatmap(
            cm,
            annot=True,
            fmt="d",
            cmap="Blues",
            cbar=True,
            xticklabels=class_names,
            yticklabels=class_names,
            annot_kws={"size": 14, "weight": "bold"},
            ax=ax
        )
    else:
        im = ax.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
        fig.colorbar(im, ax=ax)
        tick_marks = np.arange(len(class_names))
        ax.set_xticks(tick_marks)
        ax.set_xticklabels(class_names)
        ax.set_yticks(tick_marks)
        ax.set_yticklabels(class_names)
        thresh = cm.max() / 2.0 if cm.max() > 0 else 0.5
        for i in range(cm.shape[0]):
            for j in range(cm.shape[1]):
                val = cm[i, j]
                ax.text(j, i, format(val, 'd'),
                        ha="center", va="center",
                        color="white" if val > thresh else "black",
                        fontweight="bold", fontsize=14)

    ax.set_title("Confusion Matrix – NSCLC-Radiomics Test Set", fontweight="bold", pad=14)
    ax.set_xlabel("Predicted Diagnosis", fontweight="bold", labelpad=10)
    ax.set_ylabel("Ground Truth Annotation", fontweight="bold", labelpad=10)
    
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close(fig)

    return save_path


def plot_roc_curve(
    y_true: List[int] or np.ndarray,
    y_probs: List[float] or np.ndarray,
    save_path: str or Path
) -> Tuple[Path, float]:
    """
    Plots and exports the Receiver Operating Characteristic (ROC) curve (roc_curve.png).
    """
    setup_plot_style()
    save_path = Path(save_path)
    save_path.parent.mkdir(parents=True, exist_ok=True)

    y_true = np.array(y_true)
    y_probs = np.array(y_probs)
    if y_probs.ndim == 2:
        y_prob_positive = y_probs[:, 1]
    else:
        y_prob_positive = y_probs

    fpr, tpr, _ = roc_curve(y_true, y_prob_positive)
    auc_score = float(roc_auc_score(y_true, y_prob_positive)) if len(np.unique(y_true)) > 1 else 1.0

    fig, ax = plt.subplots(figsize=(7, 6), dpi=300)
    ax.plot(fpr, tpr, color="#2563eb", linewidth=2.5, label=f"DenseNet121 (AUC = {auc_score:.4f})")
    ax.plot([0, 1], [0, 1], color="#9ca3af", linestyle="--", linewidth=1.8, label="Random Classifier (AUC = 0.5000)")
    
    ax.set_xlim([-0.02, 1.02])
    ax.set_ylim([-0.02, 1.05])
    ax.set_title("Receiver Operating Characteristic (ROC) Curve", fontweight="bold", pad=14)
    ax.set_xlabel("False Positive Rate (1 - Specificity)", fontweight="bold", labelpad=8)
    ax.set_ylabel("True Positive Rate (Sensitivity)", fontweight="bold", labelpad=8)
    ax.legend(frameon=True, loc="lower right")
    ax.grid(True, linestyle="--", alpha=0.6)

    plt.tight_layout()
    plt.savefig(save_path)
    plt.close(fig)

    return save_path, auc_score


def save_history_to_csv(history: Dict[str, List[Any]], csv_path: str or Path) -> Path:
    """Exports epoch-wise training history to CSV."""
    csv_path = Path(csv_path)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(history)
    df.to_csv(csv_path, index=False)
    return csv_path
