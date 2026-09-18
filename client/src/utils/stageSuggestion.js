/**
 * Pure decision-support function to compute a non-binding "Suggested Reference Range" hint
 * from Classification, Confidence percentage, and Severity Tier.
 * 
 * CRITICAL SAFETY RULES:
 * 1. NEVER auto-selects or pre-fills doctor's clinical stage assessment.
 * 2. NEVER returns "Stage IV" — Stage IV requires confirmed distant metastasis (TNM).
 * 3. Clearly labeled as a non-binding reference hint for clinical decision-support only.
 * 
 * @param {string} classification - e.g. "Benign", "Malignant"
 * @param {number} confidencePct - e.g. 91.4 or 62.3 (0 to 100)
 * @param {string} severityTier - "Small" | "Moderate" | "Large" | "None"
 * @returns {Object} Structured suggestion object
 */
export function getSuggestedStageRange(classification = "", confidencePct = 0, severityTier = "Moderate") {
  const conf = Number(confidencePct) || 0;
  const rawClass = String(classification || "").toLowerCase();
  const isBenign = rawClass.includes("benign") || rawClass.includes("normal") || rawClass.includes("lower");
  
  const normSeverity = String(severityTier || "Moderate").toLowerCase();
  const isSmall = normSeverity.includes("small") || normSeverity.includes("none");
  const isLarge = normSeverity.includes("large");
  const isModerate = !isSmall && !isLarge;

  const severityLabel = isSmall ? "Small" : isLarge ? "Large" : "Moderate";

  // Confidence thresholds: High >= 85%, Moderate 60-85%, Low < 60%
  const isHighConf = conf >= 85;
  const isLowConf = conf < 60;
  const isModerateConf = !isHighConf && !isLowConf;

  // -------------------------------------------------------------
  // BENIGN CLASSIFICATION MATRIX
  // -------------------------------------------------------------
  if (isBenign) {
    if (isHighConf) {
      if (isSmall) {
        return {
          suggestedRange: "Not Detected / Monitoring",
          noteFlag: "none",
          explanation: "High confidence benign result with small lesion extent; consistent with routine monitoring.",
          severityLabel,
          confidenceTier: "High",
          isReferenceOnly: true
        };
      } else {
        // Moderate or Large
        return {
          suggestedRange: "Not Detected — recommend follow-up imaging",
          noteFlag: "size-mismatch",
          explanation: "Benign classification with moderate/large localized region; recommend follow-up imaging to rule out occult lesion.",
          severityLabel,
          confidenceTier: "High",
          isReferenceOnly: true
        };
      }
    } else if (isLowConf) {
      if (isLarge) {
        return {
          suggestedRange: "Conflicting signals — do not accept as benign without workup",
          noteFlag: "high-priority-review",
          explanation: "Conflicting signals: low confidence benign classification with large region; do not accept as benign without full diagnostic workup.",
          severityLabel,
          confidenceTier: "Low",
          isReferenceOnly: true
        };
      } else {
        // Small or Moderate
        return {
          suggestedRange: "Borderline — clinical correlation advised",
          noteFlag: "low-confidence",
          explanation: "Low model confidence in benign classification; clinical correlation and repeat evaluation advised.",
          severityLabel,
          confidenceTier: "Low",
          isReferenceOnly: true
        };
      }
    } else {
      // Moderate Confidence (60% to 85%)
      return {
        suggestedRange: "Likely Benign — clinical correlation advised",
        noteFlag: "moderate-confidence",
        explanation: "Moderate model confidence; routine monitoring and clinical confirmation recommended.",
        severityLabel,
        confidenceTier: "Moderate",
        isReferenceOnly: true
      };
    }
  }

  // -------------------------------------------------------------
  // MALIGNANT CLASSIFICATION MATRIX
  // -------------------------------------------------------------
  if (isHighConf) {
    if (isSmall) {
      return {
        suggestedRange: "Stage I (reference only)",
        noteFlag: "none",
        explanation: "High confidence malignant finding with localized small lesion pattern.",
        severityLabel,
        confidenceTier: "High",
        isReferenceOnly: true
      };
    } else if (isModerate) {
      return {
        suggestedRange: "Stage II (reference only)",
        noteFlag: "none",
        explanation: "High confidence malignant finding with moderate lesion extent.",
        severityLabel,
        confidenceTier: "High",
        isReferenceOnly: true
      };
    } else {
      // Large - NEVER return Stage IV
      return {
        suggestedRange: "Stage III (reference only)",
        noteFlag: "stage-IV-excluded",
        explanation: "Extensive localized lesion pattern. Note: Stage IV requires confirmed distant metastasis and is excluded from imaging heuristics.",
        severityLabel,
        confidenceTier: "High",
        isReferenceOnly: true
      };
    }
  } else if (isModerateConf) {
    return {
      suggestedRange: "Likely malignant — rely on imaging/biopsy for extent",
      noteFlag: "moderate-confidence",
      explanation: "Moderate confidence prediction; definitive clinical stage requires diagnostic imaging and histology.",
      severityLabel,
      confidenceTier: "Moderate",
      isReferenceOnly: true
    };
  } else {
    // Low Confidence (< 60%)
    return {
      suggestedRange: "Flag for review — insufficient confidence to suggest a stage",
      noteFlag: "low-confidence",
      explanation: "Low model confidence; insufficient certainty to suggest a reference stage. Comprehensive doctor review required.",
      severityLabel,
      confidenceTier: "Low",
      isReferenceOnly: true
    };
  }
}
