from pathlib import Path
import joblib
import numpy as np

BASE = Path(__file__).resolve().parent
MODEL = joblib.load(BASE / "models" / "model.pkl")
FEATURES = joblib.load(BASE / "models" / "features.pkl")

def predict_lung_cancer(features):
    data = np.array([features], dtype=float)
    prediction = int(MODEL.predict(data)[0])
    probabilities = MODEL.predict_proba(data)[0]
    risk = round(float(probabilities[1]) * 100, 2)
    confidence = round(float(max(probabilities)) * 100, 2)
    return {
        "risk": risk,
        "confidence": confidence,
        "predictedCancer": "Lung Cancer" if prediction else "Lower Lung Cancer Risk",
        "recommendation": "Clinical evaluation is recommended; this is a decision-support estimate, not a diagnosis."
    }
