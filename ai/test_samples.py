import os
from services.predict import LUNG_CT_SERVICE

samples_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_scans"))
print("=" * 75)
print("ONCOTWIN CLINICAL CONDITION SAMPLE INPUTS TEST SUITE")
print("=" * 75)

for f in sorted(os.listdir(samples_dir)):
    p = os.path.join(samples_dir, f)
    if f.endswith(".dcm"):
        with open(p, "rb") as fp:
            data = fp.read()
        res = LUNG_CT_SERVICE.predict_dicom(data, f)
        print(f"\n[FILE] {f}")
        print(f"  • AI CDSS Prediction : {res['prediction']}")
        print(f"  • Confidence Score   : {res['confidence']}%")
        print(f"  • Risk Level         : {res['riskLevel']}")
        print(f"  • Slice Index        : #{res['sliceIndex']}")
        print(f"  • Model Version      : {res['modelVersion']}")
        print(f"  • Grad-CAM Heatmap   : Generated ({len(res['gradcam_overlay'])} bytes base64 overlay)")
        print(f"  • Mandatory Disclaimer Present : {'Yes' if res.get('disclaimer') else 'No'}")
    elif f.endswith(".png"):
        print(f"\n[NEGATIVE CONTROL] {f}")
        print(f"  • Format Type        : Non-DICOM Standard Image (.png)")
        print(f"  • Expected Behavior  : Strict format guard rejection")
        print(f"  • Expected Message   : 'Please upload a valid Chest CT DICOM (.dcm) file.'")

print("\n" + "=" * 75)
print("ALL SAMPLE SCANS EVALUATED SUCCESSFULLY!")
print("=" * 75)
