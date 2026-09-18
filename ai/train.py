"""
Production Training Pipeline for NSCLC-Radiomics Lung Cancer Detection
Project: OncoTwin – Explainable AI-Based Lung Cancer Detection and CDSS
Dataset: NSCLC-Radiomics (TCIA)
Architecture: DenseNet121 Transfer Learning
"""

import os
import sys
import json
import time
import argparse
import random
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR
try:
    from tqdm import tqdm
except ImportError:
    class tqdm:
        def __init__(self, iterable, *args, **kwargs):
            self.iterable = iterable
        def __iter__(self):
            return iter(self.iterable)
        def set_postfix(self, *args, **kwargs):
            pass
        def update(self, *args, **kwargs):
            pass

from dataset import get_dataloaders, dicom_to_hounsfield_windowed, get_val_test_transforms
from model import build_model, DenseNet121LungCancer
from gradcam import GradCAM
from train_utils import (
    calculate_metrics,
    EarlyStopping,
    plot_training_curves,
    plot_confusion_matrix,
    plot_roc_curve,
    save_history_to_csv
)


def set_seed(seed: int = 42):
    """Sets random seeds across all libraries for full deterministic reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


def train_one_epoch(
    model: nn.Module,
    loader: torch.utils.data.DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    device: torch.device
) -> Dict[str, float]:
    """Runs one complete training epoch."""
    model.train()
    running_loss = 0.0
    all_preds = []
    all_targets = []
    all_probs = []

    pbar = tqdm(loader, desc="  Training", leave=False)
    for images, targets, _ in pbar:
        images = images.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        optimizer.zero_grad()
        logits = model(images)
        loss = criterion(logits, targets)
        loss.backward()
        
        # Gradient clipping to prevent exploding gradients in dense connections
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        probs = torch.softmax(logits, dim=1).detach().cpu().numpy()
        preds = np.argmax(probs, axis=1)

        all_preds.extend(preds)
        all_targets.extend(targets.cpu().numpy())
        all_probs.extend(probs)

        pbar.set_postfix({"loss": f"{loss.item():.4f}"})

    epoch_loss = running_loss / len(loader.dataset)
    metrics = calculate_metrics(all_targets, all_preds, np.array(all_probs))
    metrics["loss"] = epoch_loss
    return metrics


def evaluate(
    model: nn.Module,
    loader: torch.utils.data.DataLoader,
    criterion: nn.Module,
    device: torch.device,
    desc: str = "Validation"
) -> Dict[str, Any]:
    """Evaluates model performance on validation or test set."""
    model.eval()
    running_loss = 0.0
    all_preds = []
    all_targets = []
    all_probs = []

    pbar = tqdm(loader, desc=f"  {desc}", leave=False)
    with torch.no_grad():
        for images, targets, _ in pbar:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)

            logits = model(images)
            loss = criterion(logits, targets)

            running_loss += loss.item() * images.size(0)
            probs = torch.softmax(logits, dim=1).cpu().numpy()
            preds = np.argmax(probs, axis=1)

            all_preds.extend(preds)
            all_targets.extend(targets.cpu().numpy())
            all_probs.extend(probs)

    epoch_loss = running_loss / len(loader.dataset)
    metrics = calculate_metrics(all_targets, all_preds, np.array(all_probs))
    metrics["loss"] = epoch_loss
    metrics["y_true"] = all_targets
    metrics["y_pred"] = all_preds
    metrics["y_probs"] = all_probs
    return metrics


def generate_sample_gradcam(
    model: nn.Module,
    sample_dcm_path: Path or str,
    output_path: Path or str,
    device: torch.device
) -> bool:
    """Generates and saves a sample Grad-CAM explanation for visualization."""
    try:
        if not os.path.exists(sample_dcm_path):
            return False

        orig_pil, meta = dicom_to_hounsfield_windowed(sample_dcm_path)
        transform = get_val_test_transforms()
        input_tensor = transform(orig_pil).unsqueeze(0).to(device)

        gradcam = GradCAM(model, target_layer=model.features.norm5)
        model.eval()
        logits = model(input_tensor)
        predicted_class = int(torch.argmax(logits, dim=1).item())

        _, overlay_pil, _ = gradcam.generate_heatmap_and_overlay(
            original_image_pil=orig_pil,
            input_tensor=input_tensor,
            class_idx=predicted_class,
            alpha=0.45
        )

        overlay_pil.save(output_path)
        gradcam.remove_hooks()
        print(f"  [Grad-CAM] Successfully saved sample visualization to '{output_path}'")
        return True
    except Exception as e:
        print(f"  [Grad-CAM Warning] Could not generate sample Grad-CAM: {e}")
        return False


def run_training(args):
    """Main training execution workflow."""
    print("=" * 80)
    print("  ONCOTWIN: EXPLAINABLE AI LUNG CANCER DETECTION TRAINING PIPELINE")
    print("  Dataset: NSCLC-Radiomics (TCIA) | Backbone: DenseNet121 (Transfer Learning)")
    print("=" * 80)

    set_seed(args.seed)
    device = torch.device(args.device if torch.cuda.is_available() and "cuda" in args.device else "cpu")
    print(f"[*] Compute Target: {device} ({torch.cuda.get_device_name(0) if device.type == 'cuda' else 'CPU'})")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load Data
    print(f"[*] Scanning DICOM scans in directory: {args.data_dir}")
    train_loader, val_loader, test_loader, counts = get_dataloaders(
        data_dir=args.data_dir,
        batch_size=args.batch_size,
        num_workers=args.num_workers,
        split_ratios=(0.70, 0.15, 0.15),
        random_seed=args.seed
    )
    print(f"[*] Dataset Split: Total={counts['total']} | Train={counts['train']} | Val={counts['val']} | Test={counts['test']}")
    print(f"    Class Balance: Malignant (Class 1)={counts['malignant']} | Benign (Class 0)={counts['benign']}")

    # 2. Build Model
    print("[*] Initializing DenseNet121 with Transfer Learning...")
    model = build_model(num_classes=2, pretrained=True).to(device)

    # 3. Criterion, Optimizer & Scheduler
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    scheduler = CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)

    # 4. Early Stopping
    best_model_path = output_dir / "best_model.pth"
    early_stopping = EarlyStopping(
        patience=args.patience,
        verbose=True,
        delta=1e-4,
        path=str(best_model_path)
    )

    history: Dict[str, List[float]] = {
        "epoch": [],
        "train_loss": [],
        "train_acc": [],
        "train_f1": [],
        "val_loss": [],
        "val_acc": [],
        "val_f1": [],
        "val_roc_auc": [],
        "lr": []
    }

    start_time = time.time()
    print(f"\n[*] Starting Model Training ({args.epochs} Epochs, Early Stopping Patience={args.patience})...")
    print("-" * 80)

    for epoch in range(1, args.epochs + 1):
        epoch_start = time.time()
        current_lr = optimizer.param_groups[0]["lr"]

        # Train
        train_res = train_one_epoch(model, train_loader, criterion, optimizer, device)

        # Validation
        val_res = evaluate(model, val_loader, criterion, device, desc="Validation")

        # Scheduler step
        scheduler.step()

        # Update History
        history["epoch"].append(epoch)
        history["train_loss"].append(train_res["loss"])
        history["train_acc"].append(train_res["accuracy"])
        history["train_f1"].append(train_res["f1_score"])
        history["val_loss"].append(val_res["loss"])
        history["val_acc"].append(val_res["accuracy"])
        history["val_f1"].append(val_res["f1_score"])
        history["val_roc_auc"].append(val_res["roc_auc"])
        history["lr"].append(current_lr)

        epoch_duration = time.time() - epoch_start

        print(
            f"Epoch [{epoch:02d}/{args.epochs:02d}] ({epoch_duration:.1f}s) | "
            f"Train Loss: {train_res['loss']:.4f}, Acc: {train_res['accuracy']*100:.1f}%, F1: {train_res['f1_score']:.3f} | "
            f"Val Loss: {val_res['loss']:.4f}, Acc: {val_res['accuracy']*100:.1f}%, F1: {val_res['f1_score']:.3f}, AUC: {val_res['roc_auc']:.3f} | "
            f"LR: {current_lr:.2e}"
        )

        # Early Stopping Check
        early_stopping(val_res["loss"], model, epoch, val_res)
        if early_stopping.early_stop:
            print(f"\n[!] Early Stopping triggered at Epoch {epoch} due to plateau in validation loss.")
            break

    total_time = time.time() - start_time
    print("-" * 80)
    print(f"[*] Training finished in {total_time / 60:.2f} minutes.")

    # 5. Save History CSV & Plot Curves
    csv_path = output_dir / "training_history.csv"
    save_history_to_csv(history, csv_path)
    print(f"[*] Saved training log to '{csv_path}'")

    loss_img, acc_img = plot_training_curves(history, output_dir)
    print(f"[*] Saved loss curve to '{loss_img}' and accuracy curve to '{acc_img}'")

    # 6. Final Evaluation on Held-Out Test Set
    print("\n" + "=" * 80)
    print("  FINAL EVALUATION ON INDEPENDENT TEST SET (15% Held-Out)")
    print("=" * 80)

    if os.path.exists(best_model_path):
        print(f"[*] Loading best checkpoint from '{best_model_path}'...")
        try:
            checkpoint = torch.load(best_model_path, map_location=device, weights_only=False)
        except Exception:
            checkpoint = torch.load(best_model_path, map_location=device)
        model.load_state_dict(checkpoint["model_state_dict"])
    
    test_res = evaluate(model, test_loader, criterion, device, desc="Testing")

    print("\n  [TEST RESULTS SUMMARY]")
    print(f"  • Overall Accuracy   : {test_res['accuracy'] * 100:.2f}%")
    print(f"  • Sensitivity (Recall): {test_res['sensitivity'] * 100:.2f}% (Malignancy Detection Rate)")
    print(f"  • Specificity        : {test_res['specificity'] * 100:.2f}% (Benign Correct Rejection Rate)")
    print(f"  • Precision          : {test_res['precision'] * 100:.2f}%")
    print(f"  • F1-Score           : {test_res['f1_score']:.4f}")
    print(f"  • ROC-AUC Score      : {test_res['roc_auc']:.4f}")
    print(f"  • Confusion Matrix   : TP={test_res['tp']}, TN={test_res['tn']}, FP={test_res['fp']}, FN={test_res['fn']}")

    # 7. Generate Evaluation Plots
    cm_path = output_dir / "confusion_matrix.png"
    plot_confusion_matrix(test_res["confusion_matrix"], cm_path)
    print(f"[*] Saved Confusion Matrix heatmap to '{cm_path}'")

    roc_path = output_dir / "roc_curve.png"
    plot_roc_curve(test_res["y_true"], np.array(test_res["y_probs"]), roc_path)
    print(f"[*] Saved ROC Curve plot to '{roc_path}'")

    # Save test metrics JSON
    metrics_summary = {
        "project": "OncoTwin – Explainable AI-Based Lung Cancer Detection and CDSS",
        "dataset": "NSCLC-Radiomics (TCIA)",
        "model_architecture": "DenseNet121",
        "target_layer_gradcam": "features.norm5",
        "test_metrics": {
            "accuracy": test_res["accuracy"],
            "sensitivity": test_res["sensitivity"],
            "specificity": test_res["specificity"],
            "precision": test_res["precision"],
            "f1_score": test_res["f1_score"],
            "roc_auc": test_res["roc_auc"],
            "tp": test_res["tp"],
            "tn": test_res["tn"],
            "fp": test_res["fp"],
            "fn": test_res["fn"]
        }
    }
    with open(output_dir / "test_metrics.json", "w") as f:
        json.dump(metrics_summary, f, indent=2)

    # 8. Sample Grad-CAM Visualization
    sample_scans = list(Path(args.data_dir).rglob("*.dcm"))
    if sample_scans:
        gradcam_out_path = output_dir / "gradcam_output.png"
        generate_sample_gradcam(model, sample_scans[0], gradcam_out_path, device)

    print("\n" + "=" * 80)
    print("  TRAINING & VALIDATION PIPELINE COMPLETED SUCCESSFULLY!")
    print(f"  All artifacts saved to: '{output_dir.resolve()}'")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description="OncoTwin – NSCLC-Radiomics PyTorch DenseNet121 Training Pipeline"
    )
    parser.add_argument("--data_dir", type=str, default="../sample_scans", help="Path to DICOM directory")
    parser.add_argument("--output_dir", type=str, default="./models", help="Directory to save checkpoints and plots")
    parser.add_argument("--epochs", type=int, default=50, help="Maximum training epochs")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Initial learning rate")
    parser.add_argument("--weight_decay", type=float, default=1e-4, help="L2 Weight decay")
    parser.add_argument("--patience", type=int, default=10, help="Early stopping patience")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--num_workers", type=int, default=0, help="PyTorch DataLoader workers")
    parser.add_argument("--device", type=str, default="cuda", help="Target compute device ('cuda' or 'cpu')")

    args = parser.parse_args()
    run_training(args)


if __name__ == "__main__":
    main()
