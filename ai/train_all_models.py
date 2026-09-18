import os
import json
import time
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.models import densenet121, DenseNet121_Weights
from PIL import Image
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "archive" / "Multi Cancer" / "Multi Cancer"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# 1. BRAIN MRI CONFIGURATION
BRAIN_CONFIG = {
    "name": "Brain MRI",
    "filename": "brain_model.pth",
    "alt_filename": "DenseNet121_Brain.pth",
    "metrics_file": "brain_metrics.json",
    "classes": [
        {"dir": DATA_DIR / "Brain Cancer" / "brain_glioma", "key": "brain_glioma", "label": "Brain Glioma Tumor", "type": "Malignant"},
        {"dir": DATA_DIR / "Brain Cancer" / "brain_menin", "key": "brain_menin", "label": "Brain Meningioma Tumor", "type": "Malignant"},
        {"dir": DATA_DIR / "Brain Cancer" / "brain_tumor", "key": "brain_tumor", "label": "Pituitary Tumor", "type": "Malignant"}
    ]
}

# 2. CHEST X-RAY / LUNG CONFIGURATION
LUNG_CONFIG = {
    "name": "Chest X-Ray",
    "filename": "lung_model.pth",
    "alt_filename": "DenseNet121_Lung.pth",
    "metrics_file": "lung_metrics.json",
    "classes": [
        {"dir": DATA_DIR / "Lung and Colon Cancer" / "lung_bnt", "key": "lung_bnt", "label": "Benign (Normal Lung Tissue)", "type": "Benign"},
        {"dir": DATA_DIR / "Lung and Colon Cancer" / "lung_aca", "key": "lung_aca", "label": "Lung Adenocarcinoma", "type": "Malignant"},
        {"dir": DATA_DIR / "Lung and Colon Cancer" / "lung_scc", "key": "lung_scc", "label": "Lung Squamous Cell Carcinoma", "type": "Malignant"}
    ]
}

# 3. HISTOPATHOLOGY CONFIGURATION
HISTOPATHOLOGY_CONFIG = {
    "name": "Histopathology",
    "filename": "histopathology_model.pth",
    "alt_filename": "DenseNet121_Histopathology.pth",
    "metrics_file": "histopathology_metrics.json",
    "classes": [
        {"dir": DATA_DIR / "Breast Cancer" / "breast_benign", "key": "breast_benign", "label": "Benign Histopathology Tissue", "type": "Benign"},
        {"dir": DATA_DIR / "Breast Cancer" / "breast_malignant", "key": "breast_malignant", "label": "Malignant Carcinoma Cells", "type": "Malignant"},
        {"dir": DATA_DIR / "Cervical Cancer" / "cervix_dyk", "key": "cervix_dyk", "label": "Dyskeratotic Abnormal Cells", "type": "Malignant"}
    ]
}

class MedicalScanDataset(Dataset):
    def __init__(self, file_paths, labels, transform=None):
        self.file_paths = file_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.file_paths)

    def __getitem__(self, idx):
        path = self.file_paths[idx]
        image = Image.open(path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, self.labels[idx]

def train_single_model(config, samples_per_class=120, epochs=2):
    print("\n" + "=" * 60)
    print(f"Training DenseNet121 for: {config['name']}")
    print("=" * 60)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    all_paths = []
    all_labels = []

    for idx, cls_info in enumerate(config["classes"]):
        c_dir = cls_info["dir"]
        if not c_dir.exists():
            print(f"Warning: Directory {c_dir} not found. Skipping class.")
            continue
        images = sorted(list(c_dir.glob("*.jpeg")) + list(c_dir.glob("*.jpg")) + list(c_dir.glob("*.png")))
        selected = images[:samples_per_class]
        print(f"  Class {idx} [{cls_info['label']}]: Found {len(images)} images -> Selected {len(selected)}")
        for p in selected:
            all_paths.append(p)
            all_labels.append(idx)

    train_paths, test_paths, train_labels, test_labels = train_test_split(
        all_paths, all_labels, test_size=0.25, random_state=42, stratify=all_labels
    )

    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    train_dataset = MedicalScanDataset(train_paths, train_labels, transform=train_transform)
    test_dataset = MedicalScanDataset(test_paths, test_labels, transform=test_transform)

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)

    num_classes = len(config["classes"])
    model = densenet121(weights=DenseNet121_Weights.DEFAULT)

    for param in model.features.parameters():
        param.requires_grad = False

    num_features = model.classifier.in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(num_features, 256),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(256, num_classes)
    )
    model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=1e-3, weight_decay=1e-4)

    for ep in range(1, epochs + 1):
        model.train()
        running_loss, correct, total = 0.0, 0, 0
        for images, targets in train_loader:
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, preds = outputs.max(1)
            total += targets.size(0)
            correct += preds.eq(targets).sum().item()

        print(f"  Epoch {ep}/{epochs} - Loss: {running_loss/total:.4f} | Acc: {(correct/total)*100:.2f}%")

    # Evaluate on held-out test set
    model.eval()
    all_preds, all_targets = [], []
    with torch.no_grad():
        for images, targets in test_loader:
            images, targets = images.to(device), targets.to(device)
            outputs = model(images)
            _, preds = outputs.max(1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.cpu().numpy())

    acc = float(accuracy_score(all_targets, all_preds))
    precision, recall, f1, _ = precision_recall_fscore_support(all_targets, all_preds, average="weighted", zero_division=0)

    print(f"  Held-out Test Evaluation: Accuracy={acc*100:.2f}% | Precision={precision*100:.2f}% | Recall={recall*100:.2f}% | F1={f1*100:.2f}%")

    # Save weights under both standard filenames
    target_path = MODELS_DIR / config["filename"]
    alt_path = MODELS_DIR / config["alt_filename"]
    torch.save(model.state_dict(), target_path)
    torch.save(model.state_dict(), alt_path)
    print(f"  Saved weights to: {target_path} and {alt_path}")

    # Save metrics
    metrics_data = {
        "scanType": config["name"],
        "modelArchitecture": "DenseNet121 Transfer Learning CNN",
        "accuracy": round(acc * 100, 2),
        "precision": round(float(precision) * 100, 2),
        "recall": round(float(recall) * 100, 2),
        "f1Score": round(float(f1) * 100, 2),
        "classes": [c["label"] for c in config["classes"]],
        "trainingTimestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    }
    with open(MODELS_DIR / config["metrics_file"], "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)

def main():
    print("================================================================")
    print("OncoTwin Multi-Model Training Pipeline (Kaggle Multi Cancer)")
    print("================================================================")
    train_single_model(BRAIN_CONFIG, samples_per_class=120, epochs=2)
    train_single_model(LUNG_CONFIG, samples_per_class=120, epochs=2)
    train_single_model(HISTOPATHOLOGY_CONFIG, samples_per_class=120, epochs=2)
    print("\nAll 3 DenseNet121 models trained and saved successfully.")

if __name__ == "__main__":
    main()
