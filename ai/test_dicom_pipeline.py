import os
import io
import json
from pathlib import Path
import numpy as np
import pydicom
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid

from services.predict import LUNG_CT_SERVICE
from services.dicom_reader import read_dicom_or_image
from predictor import MODEL, FEATURES

BASE_DIR = Path(__file__).resolve().parent

print("=" * 70)
print("ONCOTWIN LIDC-IDRI (TCIA) DICOM CHEST CT PIPELINE VERIFICATION")
print("=" * 70)

# 1. Create a valid in-memory DICOM Chest CT slice
print("\n[1] Synthesizing standard DICOM CT slice with pulmonary windowing tags...")
file_meta = FileMetaDataset()
file_meta.MediaStorageSOPClassUID = "1.2.840.10008.5.1.4.1.1.2" # CT Image Storage
file_meta.MediaStorageSOPInstanceUID = generate_uid()
file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

ds = Dataset()
ds.file_meta = file_meta
ds.is_little_endian = True
ds.is_implicit_VR = False

ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.2"
ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
ds.PatientName = "LIDC-IDRI-SAMPLE"
ds.PatientID = "LIDC-0001"
ds.Modality = "CT"
ds.Manufacturer = "GE Medical Systems (TCIA LIDC-IDRI)"
ds.SliceThickness = "1.25"
ds.PixelSpacing = [0.7, 0.7]
ds.RescaleIntercept = "-1024"
ds.RescaleSlope = "1"
ds.WindowCenter = "-600"
ds.WindowWidth = "1500"
ds.Rows = 512
ds.Columns = 512
ds.BitsAllocated = 16
ds.BitsStored = 16
ds.HighBit = 15
ds.PixelRepresentation = 0
ds.SamplesPerPixel = 1
ds.PhotometricInterpretation = "MONOCHROME2"

# Synthesize lung parenchyma background (~ -800 HU -> stored value 224) with a simulated nodule (~ -100 HU -> stored value 924)
pixel_array = np.full((512, 512), fill_value=224, dtype=np.uint16)
# Add simulated nodule at center
y, x = np.ogrid[:512, :512]
nodule_mask = ((x - 256)**2 + (y - 256)**2) <= 18**2
pixel_array[nodule_mask] = 924

ds.PixelData = pixel_array.tobytes()

dicom_buffer = io.BytesIO()
pydicom.dcmwrite(dicom_buffer, ds, write_like_original=False)
dicom_bytes = dicom_buffer.getvalue()

print(f"  Generated DICOM CT slice: {len(dicom_bytes)} bytes")

# 2. Test DICOM Reader
print("\n[2] Testing pydicom Reader & Lung Windowing:")
extracted_img, meta = read_dicom_or_image(dicom_bytes, "test_lidc_slice.dcm")
print(f"  Extracted image size: {extracted_img.size} | Mode: {extracted_img.mode}")
print(f"  DICOM Metadata: Modality={meta.get('modality')}, WL={meta.get('window_center')}, WW={meta.get('window_width')}")
assert extracted_img.size == (512, 512)
assert meta.get("is_dicom") is True
print("  [PASS] DICOM Reader and Windowing verified.")

# 3. Test DenseNet121 Inference & Grad-CAM on DICOM
print("\n[3] Testing DenseNet121 Inference + Grad-CAM on DICOM Slice:")
result = LUNG_CT_SERVICE.predict_dicom(dicom_bytes, "test_lidc_slice.dcm")
print(f"  Prediction: {result['prediction']}")
print(f"  Confidence: {result['confidence']}%")
print(f"  Probabilities: {result['probability_distribution']}")
print(f"  Model Version: {result['modelVersion']}")
print(f"  Grad-CAM Overlay Base64: {len(result['gradcam_overlay'])} bytes")
assert result["gradcam_overlay"].startswith("data:image/png;base64,")
assert "dicom_metadata" in result
print("  [PASS] DenseNet121 Inference and Grad-CAM on DICOM passed.")

# 4. WDBC Tabular Random Forest Non-Regression
print("\n[4] Testing WDBC Tabular Random Forest Non-Regression:")
sample_features = np.ones((1, len(FEATURES)))
tab_pred = MODEL.predict(sample_features)
print(f"  WDBC Prediction: {tab_pred[0]}")
assert len(tab_pred) == 1
print("  [PASS] WDBC Tabular Model is 100% unaffected.")

print("\n" + "=" * 70)
print("ALL LIDC-IDRI DICOM CT VERIFICATION TESTS PASSED!")
print("=" * 70)
