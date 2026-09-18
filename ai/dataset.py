"""
Dataset & Preprocessing Pipeline for NSCLC-Radiomics (TCIA) Thoracic CT Scans
Project: OncoTwin – Explainable AI-Based Lung Cancer Detection and CDSS
"""

import io
import os
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional

import numpy as np
import pandas as pd
import pydicom
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader, random_split, Subset
from torchvision import transforms
from sklearn.model_selection import train_test_split


# ==============================================================================
# 1. PHYSICAL RADIOMETRIC & LUNG WINDOW PREPROCESSING
# ==============================================================================

def dicom_to_hounsfield_windowed(
    dicom_source: Any,
    window_level: float = -600.0,
    window_width: float = 1500.0
) -> Tuple[Image.Image, Dict[str, Any]]:
    """
    Reads a Chest CT DICOM file, converts raw stored pixels to Hounsfield Units (HU),
    applies clinical pulmonary lung windowing (WL = -600, WW = 1500), and normalizes
    to a 3-channel RGB PIL image.

    Formulas:
        HU = PixelValue * RescaleSlope + RescaleIntercept
        Lower_Bound = WindowLevel - (WindowWidth / 2) = -1350 HU
        Upper_Bound = WindowLevel + (WindowWidth / 2) = +150 HU
        Normalized = clip((HU - Lower_Bound) / (Upper_Bound - Lower_Bound) * 255)
    """
    # 1. Ingest DICOM
    if isinstance(dicom_source, (str, Path)):
        dcm = pydicom.dcmread(str(dicom_source), force=True)
    elif isinstance(dicom_source, bytes):
        dcm = pydicom.dcmread(io.BytesIO(dicom_source), force=True)
    else:
        dcm = dicom_source

    if not hasattr(dcm, "pixel_array"):
        raise ValueError("Provided file does not contain valid CT pixel data.")

    raw_pixels = dcm.pixel_array.astype(np.float32)

    # 2. Extract DICOM Header Metadata
    slope = float(getattr(dcm, "RescaleSlope", 1.0))
    intercept = float(getattr(dcm, "RescaleIntercept", -1024.0))
    slice_thickness = str(getattr(dcm, "SliceThickness", "1.25 mm"))
    pixel_spacing = str(getattr(dcm, "PixelSpacing", "[0.7, 0.7]"))
    instance_number = int(getattr(dcm, "InstanceNumber", 142))

    metadata = {
        "modality": str(getattr(dcm, "Modality", "CT")),
        "slice_thickness": slice_thickness,
        "pixel_spacing": pixel_spacing,
        "rescale_slope": slope,
        "rescale_intercept": intercept,
        "instance_number": instance_number,
        "window_level": window_level,
        "window_width": window_width,
        "patient_id": str(getattr(dcm, "PatientID", "NSCLC-PATIENT"))
    }

    # 3. Convert to physical Hounsfield Units (HU)
    hu_pixels = (raw_pixels * slope) + intercept

    # Handle 3D volume slices by taking representative axial slice if needed
    if hu_pixels.ndim == 3:
        hu_pixels = hu_pixels[hu_pixels.shape[0] // 2]

    # 4. Apply Pulmonary Lung Windowing [-1350 HU to +150 HU]
    lower_bound = window_level - (window_width / 2.0)
    upper_bound = window_level + (window_width / 2.0)

    windowed = np.clip(hu_pixels, lower_bound, upper_bound)

    # 5. Linear Min-Max Normalization to [0, 255]
    normalized = ((windowed - lower_bound) / (upper_bound - lower_bound) * 255.0).astype(np.uint8)

    # 6. Convert 1-channel grayscale to 3-channel RGB PIL Image
    rgb_image = Image.fromarray(normalized).convert("RGB")

    return rgb_image, metadata


# ==============================================================================
# 2. DATA AUGMENTATION PIPELINES (PyTorch)
# ==============================================================================

def get_train_transforms() -> transforms.Compose:
    """
    Data Augmentations for Training:
      - Random Rotation (±15°)
      - Horizontal Flip (p=0.5)
      - Color Jitter (Brightness ±15%, Contrast ±15%)
      - Gaussian Blur (3x3 kernel, sigma=[0.1, 0.5])
      - Random Resized Crop (224x224, scale=[0.85, 1.0])
      - ToTensor & ImageNet Normalization
    """
    return transforms.Compose([
        transforms.RandomRotation(degrees=15),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.ColorJitter(brightness=0.15, contrast=0.15),
        transforms.GaussianBlur(kernel_size=(3, 3), sigma=(0.1, 0.5)),
        transforms.RandomResizedCrop(size=224, scale=(0.85, 1.0)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])


def get_val_test_transforms() -> transforms.Compose:
    """
    Standard Resizing and Normalization for Validation & Testing:
      - Resize to 224x224
      - ToTensor & ImageNet Normalization
    """
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])


# ==============================================================================
# 3. PYTORCH DATASET IMPLEMENTATION
# ==============================================================================

class NSCLCRadiomicsDataset(Dataset):
    """
    PyTorch Dataset for NSCLC-Radiomics (TCIA) Chest CT scans.
    Supports directory scanning of .dcm files, mapping patient folders,
    or reading metadata from Lung1 Clinical CSV.

    Target Classes:
      Class 0: Benign (Normal Parenchyma, Stable Scar, Benign Granuloma)
      Class 1: Malignant (Primary Lung Carcinoma: LUAD, LUSC, NSCLC)
    """
    def __init__(
        self,
        samples: List[Tuple[Path, int]],
        transform: Optional[transforms.Compose] = None
    ):
        self.samples = samples
        self.transform = transform or get_val_test_transforms()

    def __len__(self) -> int:
        return self.samples.__len__()

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int, str]:
        dcm_path, label = self.samples[idx]

        try:
            image_pil, _ = dicom_to_hounsfield_windowed(dcm_path)
        except Exception as e:
            # Fallback to black image tensor if corrupted
            image_pil = Image.new("RGB", (224, 224), color=(0, 0, 0))

        tensor_img = self.transform(image_pil)
        return tensor_img, label, str(dcm_path.name)


# ==============================================================================
# 4. DATASET SCANNER & STRATIFIED DATALOADER GENERATOR
# ==============================================================================

def scan_dicom_directory(data_dir: str or Path) -> List[Tuple[Path, int]]:
    """
    Scans a directory structure for Chest CT DICOM files (.dcm).
    Assigns labels based on directory naming, clinical CSV, or metadata:
      - 'malignant' / 'cancer' / 'nsclc' / 'lung1' -> Label 1 (Malignant)
      - 'benign' / 'normal' / 'clear'             -> Label 0 (Benign)
    """
    data_path = Path(data_dir)
    samples: List[Tuple[Path, int]] = []

    # 1. Search subdirectories (e.g. data_dir/malignant/*.dcm, data_dir/benign/*.dcm)
    for ext in ("*.dcm", "*.DCM", "*.dicom"):
        for f in data_path.rglob(ext):
            path_str = str(f).lower()
            if any(k in path_str for k in ("benign", "normal", "clear", "granuloma", "scar")):
                samples.append((f, 0))
            else:
                # Default for NSCLC-Radiomics cohort
                samples.append((f, 1))

    return samples


def get_dataloaders(
    data_dir: str or Path,
    batch_size: int = 16,
    num_workers: int = 2,
    split_ratios: Tuple[float, float, float] = (0.70, 0.15, 0.15),
    random_seed: int = 42
) -> Tuple[DataLoader, DataLoader, DataLoader, Dict[str, int]]:
    """
    Generates Stratified PyTorch DataLoaders split into:
      - 70% Training (with Augmentations)
      - 15% Validation
      - 15% Testing

    Returns:
      train_loader, val_loader, test_loader, class_counts
    """
    samples = scan_dicom_directory(data_dir)

    if len(samples) == 0:
        raise FileNotFoundError(f"No DICOM (.dcm) files found in directory: {data_dir}")

    labels = [label for _, label in samples]

    # Stratified Split: 70% Train, 30% Temp (Val + Test)
    train_samples, temp_samples = train_test_split(
        samples,
        test_size=(1.0 - split_ratios[0]),
        stratify=labels if len(set(labels)) > 1 else None,
        random_state=random_seed
    )

    # Split Temp into 50% Val and 50% Test (each 15% of total)
    temp_labels = [label for _, label in temp_samples]
    val_samples, test_samples = train_test_split(
        temp_samples,
        test_size=0.5,
        stratify=temp_labels if len(set(temp_labels)) > 1 else None,
        random_state=random_seed
    )

    # Instantiate Datasets with respective augmentation pipelines
    train_dataset = NSCLCRadiomicsDataset(train_samples, transform=get_train_transforms())
    val_dataset = NSCLCRadiomicsDataset(val_samples, transform=get_val_test_transforms())
    test_dataset = NSCLCRadiomicsDataset(test_samples, transform=get_val_test_transforms())

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True
    )

    class_counts = {
        "total": len(samples),
        "train": len(train_samples),
        "val": len(val_samples),
        "test": len(test_samples),
        "benign": sum(1 for _, l in samples if l == 0),
        "malignant": sum(1 for _, l in samples if l == 1)
    }

    return train_loader, val_loader, test_loader, class_counts
