import('./src/utils/stageSuggestion.js').then(({ getSuggestedStageRange }) => {
  const testCases = [
    { cls: "Benign", conf: 90, sev: "Small", expRange: "Not Detected / Monitoring", expFlag: "none" },
    { cls: "Benign", conf: 90, sev: "Moderate", expRange: "Not Detected — recommend follow-up imaging", expFlag: "size-mismatch" },
    { cls: "Benign", conf: 90, sev: "Large", expRange: "Not Detected — recommend follow-up imaging", expFlag: "size-mismatch" },
    { cls: "Benign", conf: 50, sev: "Small", expRange: "Borderline — clinical correlation advised", expFlag: "low-confidence" },
    { cls: "Benign", conf: 50, sev: "Moderate", expRange: "Borderline — clinical correlation advised", expFlag: "low-confidence" },
    { cls: "Benign", conf: 50, sev: "Large", expRange: "Conflicting signals — do not accept as benign without workup", expFlag: "high-priority-review" },
    { cls: "Malignant", conf: 90, sev: "Small", expRange: "Stage I (reference only)", expFlag: "none" },
    { cls: "Malignant", conf: 90, sev: "Moderate", expRange: "Stage II (reference only)", expFlag: "none" },
    { cls: "Malignant", conf: 90, sev: "Large", expRange: "Stage III (reference only)", expFlag: "stage-IV-excluded" },
    { cls: "Malignant", conf: 75, sev: "Small", expRange: "Likely malignant — rely on imaging/biopsy for extent", expFlag: "moderate-confidence" },
    { cls: "Malignant", conf: 75, sev: "Large", expRange: "Likely malignant — rely on imaging/biopsy for extent", expFlag: "moderate-confidence" },
    { cls: "Malignant", conf: 45, sev: "Moderate", expRange: "Flag for review — insufficient confidence to suggest a stage", expFlag: "low-confidence" }
  ];

  console.log("=== VERIFYING SUGGESTED STAGE MATRIX ===");
  let passed = 0;
  testCases.forEach((tc, i) => {
    const res = getSuggestedStageRange(tc.cls, tc.conf, tc.sev);
    const rangeOk = res.suggestedRange === tc.expRange;
    const flagOk = res.noteFlag === tc.expFlag;
    const stageIVNotIncluded = !res.suggestedRange.includes("Stage IV");

    if (rangeOk && flagOk && stageIVNotIncluded) {
      console.log(`[PASS] Case ${i+1}: ${tc.cls} (${tc.conf}%, ${tc.sev}) -> "${res.suggestedRange}" [Flag: ${res.noteFlag}]`);
      passed++;
    } else {
      console.error(`[FAIL] Case ${i+1}: expected "${tc.expRange}" [Flag: ${tc.expFlag}], got "${res.suggestedRange}" [Flag: ${res.noteFlag}]`);
    }
  });

  console.log(`\nResults: ${passed}/${testCases.length} test cases passed.`);
  process.exit(passed === testCases.length ? 0 : 1);
});
