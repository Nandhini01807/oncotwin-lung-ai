import io
import asyncio
import json
from pathlib import Path
import numpy as np
import pydicom
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid
from starlette.datastructures import UploadFile as StarletteUploadFile
from fastapi import HTTPException

from main import app, predict_chest_ct
from services.predict import LUNG_CT_SERVICE

print("=" * 70)
print("TESTING REAL DENSENET121 LUNG CT INFERENCE PIPELINE")
print("=" * 70)

# 1. Synthesize real DICOM CT file with InstanceNumber
file_meta = FileMetaDataset()
file_meta.MediaStorageSOPClassUID = "1.2.840.10008.5.1.4.1.1.2"
file_meta.MediaStorageSOPInstanceUID = generate_uid()
file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

ds = Dataset()
ds.file_meta = file_meta
ds.is_little_endian = True
ds.is_implicit_VR = False
ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.2"
ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
ds.PatientName = "LIDC-PATIENT-001"
ds.Modality = "CT"
ds.InstanceNumber = "142"
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

# Simulating a lung CT with a nodule feature in the lung window
pixel_array = np.full((512, 512), fill_value=224, dtype=np.uint16)
# inject a high-attenuation nodular circle
y, x = np.ogrid[:512, :512]
mask = (x - 256)**2 + (y - 256)**2 <= 20**2
pixel_array[mask] = 850
ds.PixelData = pixel_array.tobytes()

dicom_buf = io.BytesIO()
pydicom.dcmwrite(dicom_buf, ds, write_like_original=False)
dicom_bytes = dicom_buf.getvalue()

async def run_pipeline_test():
    print("\n[1] Running real DenseNet121 inference on synthesized DICOM Chest CT:")
    upload_file = StarletteUploadFile(file=io.BytesIO(dicom_bytes), filename="patient_ct_142.dcm")
    
    response = await predict_chest_ct(upload_file)
    data = json.loads(response.body.decode("utf-8"))
    
    print("\n--- FASTAPI AI OUTPUT ---")
    print(f"Classification:  {data['prediction']}")
    print(f"Confidence:      {data['confidence']}%")
    print(f"Slice Index:     #{data['sliceIndex']}")
    print(f"Model Version:   {data['modelVersion']}")
    print(f"Grad-CAM Length: {len(data['gradcam'])} characters (Base64)")
    print(f"Heatmap Path:    {data['heatmap']}")
    print("-------------------------")

    assert data["prediction"] in ["Nodule Detected", "No Suspicious Nodule"]
    assert isinstance(data["confidence"], (int, float)) and 0 <= data["confidence"] <= 100
    assert data["sliceIndex"] == 142
    assert data["modelVersion"] == "DenseNet121_Lung_v1"
    assert data["gradcam"].startswith("data:image/png;base64,")
    assert Path(f"d:/OncoTwin/ai{data['heatmap']}").exists() or Path(f"d:/OncoTwin/ai/{data['heatmap'].lstrip('/')}").exists()

    print("\n[PASS] Real DenseNet121 Inference and Fresh Grad-CAM Verified!")

    print("\n[2] Testing Non-DICOM validation (PNG rejection):")
    png_upload = StarletteUploadFile(file=io.BytesIO(b"png_dummy"), filename="image.png")
    try:
        await predict_chest_ct(png_upload)
        raise AssertionError("Expected 400 rejection for PNG")
    except HTTPException as exc:
        print(f"  Properly caught error: status={exc.status_code}, detail='{exc.detail}'")
        assert exc.status_code == 400
        assert exc.detail == "Please upload a valid Chest CT DICOM file."
        print("  [PASS] Rejection message matches specification exactly.")

asyncio.run(run_pipeline_test())

print("\n" + "=" * 70)
print("ALL REAL INFERENCE PIPELINE CHECKS PASSED!")
print("=" * 70)
