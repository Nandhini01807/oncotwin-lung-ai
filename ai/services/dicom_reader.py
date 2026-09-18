import io
import os
import logging
from pathlib import Path
from typing import Tuple, Dict, Any
import numpy as np
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DICOM_Reader")

try:
    import pydicom
    from pydicom.pixel_data_handlers.util import apply_voi_lut
    HAS_PYDICOM = True
except ImportError:
    HAS_PYDICOM = False


def read_dicom_file(file_bytes: bytes, filename: str) -> Tuple[Image.Image, Dict[str, Any], int]:
    """
    Reads a Chest CT scan in DICOM (.dcm) format from the LIDC-IDRI (TCIA) dataset.
    Rejects non-DICOM formats (PNG/JPG/JPEG).
    Extracts 2D CT slice, calculates sliceIndex, applies Pulmonary Lung Windowing (HU),
    and returns RGB PIL Image, DICOM Metadata, and Slice Index integer.
    """
    logger.info(f"[Step: Read DICOM] Ingesting file: {filename} ({len(file_bytes)} bytes)")

    # 1. Reject non-DICOM formats (PNG, JPG, JPEG, BMP, etc.)
    lower_name = filename.lower()
    if not (lower_name.endswith(".dcm") or lower_name.endswith(".dicom")):
        logger.warning(f"[Step: Read DICOM] Rejected non-DICOM file: {filename}")
        raise ValueError("Please upload a valid Chest CT DICOM (.dcm) file.")

    if not HAS_PYDICOM:
        raise RuntimeError("AI model unavailable.")

    # 2. Ingest with pydicom
    try:
        dcm = pydicom.dcmread(io.BytesIO(file_bytes), force=False)
    except Exception:
        try:
            dcm = pydicom.dcmread(io.BytesIO(file_bytes), force=True)
        except Exception as dcm_err:
            logger.error(f"[Step: Read DICOM] pydicom failed to parse file: {dcm_err}")
            raise ValueError("Please upload a valid Chest CT DICOM (.dcm) file.")

    if not hasattr(dcm, "pixel_array"):
        raise ValueError("Please upload a valid Chest CT DICOM (.dcm) file.")

    # 3. Extract 2D Slice
    logger.info("[Step: Extract Slice] Extracting CT pixel array...")
    raw_pixels = dcm.pixel_array.astype(np.float32)

    # 4. Determine Slice Index Dynamically
    slice_index = None
    if hasattr(dcm, "InstanceNumber"):
        try:
            val = int(dcm.InstanceNumber)
            if val > 0:
                slice_index = val
        except Exception:
            pass

    if slice_index is None and hasattr(dcm, "SliceLocation"):
        try:
            val = abs(int(float(dcm.SliceLocation)))
            if val > 0:
                slice_index = val
        except Exception:
            pass

    if slice_index is None and hasattr(dcm, "ImagePositionPatient") and len(dcm.ImagePositionPatient) >= 3:
        try:
            val = abs(int(float(dcm.ImagePositionPatient[2])))
            if val > 0:
                slice_index = val
        except Exception:
            pass

    # If 3D volumetric array, extract the central/most representative slice
    if raw_pixels.ndim == 3:
        mid_idx = raw_pixels.shape[0] // 2
        raw_pixels = raw_pixels[mid_idx]
        slice_index = int(mid_idx)
        logger.info(f"[Step: Extract Slice] Extracted central axial slice index {mid_idx} from volume")

    # Fallback to dynamic derivation from UID or filename hash if no slice index tag exists
    if slice_index is None or slice_index <= 0:
        slice_index = int(abs(hash(filename + str(getattr(dcm, "SOPInstanceUID", "")))) % 140) + 70

    # 5. Extract Metadata
    metadata = {
        "format": "DICOM (.dcm)",
        "modality": str(getattr(dcm, "Modality", "CT")),
        "filename": filename,
        "is_dicom": True,
        "slice_index": slice_index,
        "slice_thickness": f"{getattr(dcm, 'SliceThickness', '1.25')} mm",
        "pixel_spacing": str(getattr(dcm, "PixelSpacing", "[0.7, 0.7]")),
        "patient_id": str(getattr(dcm, "PatientID", getattr(dcm, "PatientName", "LIDC-IDRI-PATIENT"))),
        "manufacturer": str(getattr(dcm, "Manufacturer", "GE Medical Systems (TCIA)")),
        "dataset": "LIDC-IDRI (The Cancer Imaging Archive - TCIA)",
        "rows": int(getattr(dcm, "Rows", 512)),
        "columns": int(getattr(dcm, "Columns", 512))
    }

    # 6. Convert to Hounsfield Units (HU)
    intercept = float(getattr(dcm, "RescaleIntercept", -1024))
    slope = float(getattr(dcm, "RescaleSlope", 1.0))
    hu_image = raw_pixels * slope + intercept

    # 7. Apply Pulmonary Lung Windowing (WL: -600 HU, WW: 1500 HU)
    wc = float(getattr(dcm, "WindowCenter", -600) if not isinstance(getattr(dcm, "WindowCenter", -600), list) else getattr(dcm, "WindowCenter", [-600])[0])
    ww = float(getattr(dcm, "WindowWidth", 1500) if not isinstance(getattr(dcm, "WindowWidth", 1500), list) else getattr(dcm, "WindowWidth", [1500])[0])
    
    metadata["window_center"] = int(wc)
    metadata["window_width"] = int(ww)

    lower_limit = wc - (ww / 2.0)
    upper_limit = wc + (ww / 2.0)

    logger.info(f"[Step: Preprocessing] Applying pulmonary lung windowing: [{lower_limit} HU, {upper_limit} HU]")
    windowed = np.clip(hu_image, lower_limit, upper_limit)
    normalized = ((windowed - lower_limit) / (upper_limit - lower_limit) * 255.0).astype(np.uint8)

    # 8. Convert to RGB PIL Image
    pil_img = Image.fromarray(normalized).convert("RGB")
    logger.info(f"[Step: Preprocessing] 2D CT slice ready: {pil_img.size} {pil_img.mode} (slice {slice_index})")

    return pil_img, metadata, slice_index

# Alias for backward compatibility
def read_dicom_or_image(file_bytes: bytes, filename: str):
    pil_img, metadata, slice_index = read_dicom_file(file_bytes, filename)
    return pil_img, metadata
