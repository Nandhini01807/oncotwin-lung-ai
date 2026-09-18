"""
OncoTwin LIDC-IDRI DICOM Sample Generator
Generates realistic Chest CT DICOM (.dcm) files representing all clinical condition test scenarios.
"""
import os
import numpy as np
import pydicom
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, SecondaryCaptureImageStorage, generate_uid

def create_dicom_file(
    output_path: str,
    patient_id: str,
    patient_name: str,
    study_desc: str,
    condition_type: str,
    slice_idx: int = 142
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Base background: Air (-1000 HU)
    hu_grid = np.full((512, 512), -1000.0, dtype=np.float32)
    
    # 1. Body Thorax Outline (Oval, HU approx +30 for soft tissue)
    Y, X = np.ogrid[:512, :512]
    body_mask = ((X - 256) / 210) ** 2 + ((Y - 256) / 180) ** 2 <= 1.0
    hu_grid[body_mask] = 35.0  # Thoracic wall soft tissue
    
    # 2. Chest Wall Bone Ribs (HU approx +650)
    rib_ring = (((X - 256) / 200) ** 2 + ((Y - 256) / 170) ** 2 <= 1.0) & \
               (((X - 256) / 192) ** 2 + ((Y - 256) / 162) ** 2 >= 1.0)
    hu_grid[rib_ring] = 650.0
    
    # Vertebral Body (Center bottom, HU +700)
    spine = ((X - 256) ** 2 + (Y - 390) ** 2 <= 28 ** 2)
    hu_grid[spine] = 720.0
    
    # 3. Lung Parenchyma Cavities (Left and Right lungs, HU approx -820)
    right_lung = ((X - 170) / 68) ** 2 + ((Y - 250) / 115) ** 2 <= 1.0
    left_lung = ((X - 342) / 68) ** 2 + ((Y - 250) / 115) ** 2 <= 1.0
    
    # Mediastinum exclusion (center chest soft tissue)
    mediastinum = (np.abs(X - 256) < 45) & (Y > 160) & (Y < 380)
    
    lung_mask = (right_lung | left_lung) & ~mediastinum
    # Add natural parenchymal attenuation noise (-850 to -780 HU)
    noise = np.random.normal(0, 15, (512, 512)).astype(np.float32)
    hu_grid[lung_mask] = -820.0 + noise[lung_mask]
    
    # Main Bronchi and Trachea (HU -980)
    trachea = ((X - 256) ** 2 + (Y - 230) ** 2 <= 10 ** 2)
    hu_grid[trachea] = -980.0
    
    # Fine Vascular Markings (HU -400 to -100)
    for bx, by, angle, length in [(170, 250, 0.4, 40), (170, 250, -0.6, 50), 
                                  (342, 250, -0.4, 40), (342, 250, 0.6, 50),
                                  (180, 200, 0.2, 30), (330, 200, -0.2, 30)]:
        for t in np.linspace(0, length, 120):
            vx = int(bx + t * np.cos(angle) + np.random.normal(0, 1.2))
            vy = int(by + t * np.sin(angle) + np.random.normal(0, 1.2))
            if 0 <= vx < 512 and 0 <= vy < 512 and lung_mask[vy, vx]:
                hu_grid[vy - 1:vy + 2, vx - 1:vx + 2] = -250.0
    
    # 4. Inject Specific Condition Nodule / Pattern
    if condition_type == "suspicious_spiculated":
        # High Risk: 24mm Spiculated Nodule in Right Upper Lung (X=155, Y=210)
        nx, ny, rad = 155, 210, 18
        nodule_core = (X - nx) ** 2 + (Y - ny) ** 2 <= rad ** 2
        hu_grid[nodule_core] = np.random.uniform(10, 50, size=hu_grid[nodule_core].shape)
        
        # Spiculations (irregular radiating spikes)
        for ang in np.linspace(0, 2 * np.pi, 18, endpoint=False):
            spic_len = np.random.uniform(12, 22)
            for st in np.linspace(rad, rad + spic_len, 30):
                sx = int(nx + st * np.cos(ang) + np.random.normal(0, 0.8))
                sy = int(ny + st * np.sin(ang) + np.random.normal(0, 0.8))
                if 0 <= sx < 512 and 0 <= sy < 512 and lung_mask[sy, sx]:
                    hu_grid[sy, sx] = 20.0
                    
    elif condition_type == "suspicious_subsolid":
        # Moderate Risk: 12mm Part-Solid / Ground Glass Nodule in Left Lung (X=350, Y=220)
        nx, ny, rad = 350, 220, 13
        ggn_halo = (X - nx) ** 2 + (Y - ny) ** 2 <= (rad + 6) ** 2
        hu_grid[ggn_halo & lung_mask] = -380.0 + np.random.normal(0, 25, size=hu_grid[ggn_halo & lung_mask].shape)
        solid_core = (X - nx) ** 2 + (Y - ny) ** 2 <= 5 ** 2
        hu_grid[solid_core] = 25.0
        
    elif condition_type == "benign_granuloma":
        # Low Risk Benign: 6mm Dense calcification in Right Base (X=185, Y=310)
        nx, ny, rad = 185, 310, 6
        calc_nodule = (X - nx) ** 2 + (Y - ny) ** 2 <= rad ** 2
        hu_grid[calc_nodule] = 580.0  # High calcium HU (benign hallmark)
        
    elif condition_type == "apical_scar":
        # Low Risk Benign: Apical pleural thickening (X=360, Y=160)
        scar = ((X - 360) / 25) ** 2 + ((Y - 160) / 6) ** 2 <= 1.0
        hu_grid[scar & lung_mask] = -120.0
    
    # 5. Convert HU to DICOM Stored Stored Pixels: Stored = (HU - RescaleIntercept) / RescaleSlope
    rescale_intercept = -1024.0
    rescale_slope = 1.0
    stored_pixels = (hu_grid - rescale_intercept) / rescale_slope
    stored_pixels = np.clip(stored_pixels, 0, 4095).astype(np.uint16)
    
    # 6. Populate DICOM Metadata
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = generate_uid()
    
    ds = Dataset()
    ds.file_meta = file_meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    
    # Patient & Study attributes
    ds.PatientName = patient_name
    ds.PatientID = patient_id
    ds.PatientBirthDate = "19720514"
    ds.PatientSex = "M" if "John" in patient_name or "Male" in study_desc else "F"
    ds.StudyDescription = study_desc
    ds.SeriesDescription = f"Chest CT Pulmonary Window (LIDC-IDRI Slice #{slice_idx})"
    ds.Modality = "CT"
    ds.Manufacturer = "GE Medical Systems"
    ds.InstitutionName = "OncoTwin Clinical Oncology Center"
    
    # Image Geometry & Pulmonary Windowing Tags
    ds.Rows = 512
    ds.Columns = 512
    ds.PixelSpacing = [0.703125, 0.703125]
    ds.SliceThickness = "1.25"
    ds.InstanceNumber = slice_idx
    ds.WindowCenter = -600
    ds.WindowWidth = 1500
    ds.RescaleIntercept = str(rescale_intercept)
    ds.RescaleSlope = str(rescale_slope)
    ds.RescaleType = "HU"
    
    # Pixel Representation
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0
    ds.PixelData = stored_pixels.tobytes()
    
    # Save DICOM
    ds.save_as(output_path, enforce_file_format=True)
    size_kb = os.path.getsize(output_path) / 1024
    print(f"[SUCCESS] Created {output_path} ({size_kb:.1f} KB) - {condition_type.upper()}")
    return output_path

def generate_all_sample_scans(target_dir: str):
    os.makedirs(target_dir, exist_ok=True)
    
    # Exact required file names:
    # sample_01_high_risk_nodule.dcm
    # sample_02_moderate_risk_nodule.dcm
    # sample_03_clear_lung.dcm
    # sample_04_calcified_granuloma.dcm
    # sample_05_apical_scarring.dcm
    # sample_06_invalid_format.png
    samples = [
        {
            "filename": "sample_01_high_risk_nodule.dcm",
            "patient_id": "LIDC-TCIA-0081",
            "patient_name": "Doe^John",
            "study_desc": "High Risk Suspicious Pulmonary Nodule (24mm Spiculated Lobe Mass)",
            "condition_type": "suspicious_spiculated",
            "slice_idx": 142
        },
        {
            "filename": "sample_02_moderate_risk_nodule.dcm",
            "patient_id": "LIDC-TCIA-0142",
            "patient_name": "Smith^Robert",
            "study_desc": "Moderate Risk Part-Solid / Ground-Glass Nodule (12mm GGN)",
            "condition_type": "suspicious_subsolid",
            "slice_idx": 138
        },
        {
            "filename": "sample_03_clear_lung.dcm",
            "patient_id": "LIDC-TCIA-0205",
            "patient_name": "Taylor^Sarah",
            "study_desc": "Normal Healthy Chest CT (Clear Lung Parenchyma, No Nodules)",
            "condition_type": "clear_normal",
            "slice_idx": 145
        },
        {
            "filename": "sample_04_calcified_granuloma.dcm",
            "patient_id": "LIDC-TCIA-0319",
            "patient_name": "Miller^David",
            "study_desc": "Benign Calcified Pulmonary Granuloma (6mm Dense Core)",
            "condition_type": "benign_granuloma",
            "slice_idx": 128
        },
        {
            "filename": "sample_05_apical_scarring.dcm",
            "patient_id": "LIDC-TCIA-0412",
            "patient_name": "Johnson^Emily",
            "study_desc": "Benign Apical Pleural Thickening / Scarring (Non-Nodular)",
            "condition_type": "apical_scar",
            "slice_idx": 150
        }
    ]
    
    created_files = []
    for s in samples:
        out_path = os.path.join(target_dir, s["filename"])
        create_dicom_file(
            output_path=out_path,
            patient_id=s["patient_id"],
            patient_name=s["patient_name"],
            study_desc=s["study_desc"],
            condition_type=s["condition_type"],
            slice_idx=s["slice_idx"]
        )
        created_files.append(out_path)
        
    # sample_06_invalid_format.png
    from PIL import Image
    non_dcm_path = os.path.join(target_dir, "sample_06_invalid_format.png")
    img = Image.new("RGB", (256, 256), color=(40, 60, 80))
    img.save(non_dcm_path)
    print(f"[SUCCESS] Created {non_dcm_path} - INVALID FORMAT REJECTION TEST")
    created_files.append(non_dcm_path)
    
    return created_files

if __name__ == "__main__":
    import sys
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_scans"))
    generate_all_sample_scans(base_dir)
    print(f"\nAll sample inputs successfully generated in: {base_dir}")
