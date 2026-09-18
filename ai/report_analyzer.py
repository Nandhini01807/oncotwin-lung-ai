import re

CANCER_PATTERNS = [
    ("Breast Cancer", r"\bbreast\b"),
    ("Lung Cancer", r"\blung\b|pulmonary|bronchial"),
    ("Colon Cancer", r"\bcolon\b|colorectal"),
    ("Prostate Cancer", r"\bprostate\b"),
    ("Leukemia", r"\bleukemia\b"),
]

STAGE_SCORES = {"I": ("Low", 85), "II": ("Medium", 90), "III": ("High", 95), "IV": ("High", 98)}

def analyze_report(report_text: str):
    text = report_text.lower()
    cancer = "Unknown"
    for label, pattern in CANCER_PATTERNS:
        if re.search(pattern, text):
            cancer = label
            break

    stage_match = re.search(r"stage\s*(i{1,3}|iv|[1-4])\b", text)
    if stage_match:
        raw = stage_match.group(1).upper()
        stage = {"1":"I", "2":"II", "3":"III", "4":"IV"}.get(raw, raw)
        risk, confidence = STAGE_SCORES[stage]
    else:
        risk, confidence = "Unknown", 60

    if risk == "High": recommendation = "Oncology review and appropriate diagnostic correlation are recommended."
    elif risk == "Medium": recommendation = "Oncology consultation and follow-up are recommended."
    elif risk == "Low": recommendation = "Continue clinician-directed follow-up; no diagnosis is made by this parser."
    else: recommendation = "No reliable stage found; clinician review is required."

    return {"riskLevel": risk, "confidence": confidence, "predictedCancer": cancer, "recommendation": recommendation}
