import io
import asyncio
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
print("TESTING FASTAPI ROUTE REGISTRATION & INFERENCE FUNCTIONS")
print("=" * 70)

# 1. Check all registered route paths
registered_paths = [r.path for r in app.routes if hasattr(r, 'path')]
print("\n[1] Verifying all registered POST route paths in FastAPI:")
for p in registered_paths:
    print(f"  Route: {p}")

required_paths = [
    "/predict",
    "/api/predict",
    "/analyze",
    "/api/analyze",
    "/api/scan-analysis/analyze",
    "/api/ai/image-assessment",
    "/analyze/image",
    "/predict/image"
]

for req_p in required_paths:
    assert req_p in registered_paths, f"Missing route {req_p} in FastAPI app!"
print("  [PASS] All 8 required prediction endpoints are registered in FastAPI.")

# 2. Synthesize valid DICOM CT slice
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
ds.PatientName = "LIDC-PATIENT"
ds.Modality = "CT"
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

pixel_array = np.full((512, 512), fill_value=224, dtype=np.uint16)
ds.PixelData = pixel_array.tobytes()

dicom_buf = io.BytesIO()
pydicom.dcmwrite(dicom_buf, ds, write_like_original=False)
dicom_bytes = dicom_buf.getvalue()

# 3. Test predict_chest_ct async endpoint directly
async def run_tests():
    print("\n[2] Testing predict_chest_ct endpoint function with valid DICOM:")
    upload_file = StarletteUploadFile(file=io.BytesIO(dicom_bytes), filename="chest_ct.dcm")
    response = await predict_chest_ct(upload_file)
    # JSONResponse content
    import json
    data = json.loads(response.body.decode("utf-8"))
    print(f"  Prediction: {data['prediction']}")
    print(f"  Confidence: {data['confidence']}%")
    print(f"  GradCAM Heatmap: {data['heatmap']}")
    assert data["prediction"] in ["Suspicious Lung Nodule Detected", "No Suspicious Nodule Detected"]
    assert "confidence" in data
    assert "gradcam_overlay" in data
    print("  [PASS] DICOM inference executed with 200 OK result.")

    print("\n[3] Testing Non-DICOM (PNG) rejection:")
    png_file = StarletteUploadFile(file=io.BytesIO(b"fake_png"), filename="scan.png")
    try:
        await predict_chest_ct(png_file)
        raise AssertionError("Should have raised HTTPException 400 for PNG file!")
    except HTTPException as h_err:
        print(f"  Properly caught HTTPException: status={h_err.status_code}, detail='{h_err.detail}'")
        assert h_err.status_code == 400
        assert "valid DICOM" in h_err.detail
        print("  [PASS] Non-DICOM file was properly rejected with 400 Bad Request.")

asyncio.run(run_tests())

print("\n" + "=" * 70)
print("ALL FASTAPI ROUTE & INFERENCE TESTS PASSED!")
print("=" * 70)
