const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./models/user");
const Patient = require("./models/patient");
const Doctor = require("./models/Doctor");
const MedicalReport = require("./models/medicalReport");
const ScanAnalysis = require("./models/ScanAnalysis");
const Appointment = require("./models/Appointment");
const Treatment = require("./models/treatment");
const Progress = require("./models/progress");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/oncotwin";

async function seedData() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully.");

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash("password123", salt);

    // ====================================================
    // 1. CREATE / UPDATE DOCTORS
    // ====================================================
    console.log("Creating/updating doctors...");

    const doctorData = [
      {
        name: "Dr. Priya Raman",
        email: "priya.raman@oncotwin.org",
        specialization: "Thoracic Oncology",
        qualification: "MD, DM (Medical Oncology), FCCP",
        hospital: "Apollo Cancer Centre",
        phone: "+91 98401 11222",
        licenseNumber: "TMC-ONC-88210",
        experience: 14
      },
      {
        name: "Dr. Arjun Menon",
        email: "arjun.menon@oncotwin.org",
        specialization: "Surgical Oncology",
        qualification: "MS, MCh (Surgical Oncology), FACS",
        hospital: "MIOT International",
        phone: "+91 98402 33445",
        licenseNumber: "TMC-SUR-99412",
        experience: 16
      },
      {
        name: "Dr. Kavitha Iyer",
        email: "kavitha.iyer@oncotwin.org",
        specialization: "Radiation Oncology",
        qualification: "MD, DNB (Radiation Oncology)",
        hospital: "Cancer Institute Adyar",
        phone: "+91 98403 55667",
        licenseNumber: "TMC-RAD-77123",
        experience: 12
      }
    ];

    const doctorDocs = [];

    for (const d of doctorData) {
      let user = await User.findOne({ email: d.email });
      if (!user) {
        user = await User.create({
          name: d.name,
          email: d.email,
          password: defaultPassword,
          role: "doctor"
        });
      } else {
        user.name = d.name;
        user.role = "doctor";
        await user.save();
      }

      let doctor = await Doctor.findOne({ user: user._id });
      if (!doctor) {
        doctor = await Doctor.create({
          user: user._id,
          name: d.name,
          specialization: d.specialization,
          qualification: d.qualification,
          hospital: d.hospital,
          phone: d.phone,
          licenseNumber: d.licenseNumber,
          experience: d.experience
        });
      } else {
        doctor.name = d.name;
        doctor.specialization = d.specialization;
        doctor.qualification = d.qualification;
        doctor.hospital = d.hospital;
        doctor.phone = d.phone;
        doctor.licenseNumber = d.licenseNumber;
        doctor.experience = d.experience;
        await doctor.save();
      }
      doctorDocs.push(doctor);
    }

    const primaryDoctor = doctorDocs[0]; // Dr. Priya Raman
    console.log(`Doctors created. Primary oncologist: ${primaryDoctor.name} at ${primaryDoctor.hospital}`);

    // ====================================================
    // 2. CREATE / UPDATE PATIENT (Krishna PT20260045)
    // ====================================================
    console.log("Creating/updating patient Krishna (PT20260045)...");

    const patientEmail = "krishna.patient@oncotwin.org";
    let patientUser = await User.findOne({ email: patientEmail });
    if (!patientUser) {
      patientUser = await User.create({
        name: "Krishna",
        email: patientEmail,
        password: defaultPassword,
        role: "patient"
      });
    } else {
      patientUser.name = "Krishna";
      patientUser.role = "patient";
      await patientUser.save();
    }

    let patientDoc = await Patient.findOne({ user: patientUser._id });

    const patientPayload = {
      user: patientUser._id,
      patientIdString: "PT20260045",
      doctor: primaryDoctor._id,
      hospital: "Apollo Cancer Centre",
      age: 54,
      gender: "Male",
      bloodGroup: "O+",
      phone: "+91 98400 11223",
      address: "No. 42, Anna Nagar West, Chennai, Tamil Nadu - 600040",
      diagnosisStatus: "Under Observation",
      treatmentStatus: "Follow-up",
      nextAppointmentDate: new Date("2026-09-12T10:30:00.000Z"),
      nextCtScanDate: new Date("2026-09-20T09:00:00.000Z"),
      lastVisitDate: new Date("2026-08-10T11:00:00.000Z"),
      cancerType: "Suspicious Pulmonary Nodule",
      cancerStage: "Stage I (T1b N0 M0)",
      diagnosisDate: new Date("2026-08-10"),
      stageSource: "Chest CT & Clinical Biopsy Evaluation",
      stageVerificationStatus: "Doctor Verified",
      stageVerifiedBy: primaryDoctor._id,
      stageVerifiedAt: new Date("2026-08-12"),
      stageNotes: "14mm solid nodule in Right Upper Lobe (Posterior Segment). EGFR mutation positive. Stage I localized.",
      doctorRemarks: "Patient is compliant with medication. Scheduled for surveillance low-dose CT follow-up.",
      medicalHistory: "Patient presented with dry cough for 3 weeks. Non-productive, no hemoptysis. Chest CT showed 14mm solid nodule in Right Upper Lobe. Under active surveillance.",
      smokingHistory: "Former smoker, 15 pack-years, quit 2019",
      emergencyContact: {
        name: "Lakshmi Krishna",
        relation: "Spouse",
        phone: "+91 98401 23456"
      },
      insurance: {
        provider: "Star Health Platinum Comprehensive",
        policyNumber: "SH-8829104-A",
        coverageLimit: "₹15,00,000",
        validTill: "31 Dec 2027"
      },
      allergies: ["Penicillin", "Sulfa drugs"],
      chronicConditions: ["Hypertension (controlled with Amlodipine 5mg)"],
      priorCancerHistory: false,
      symptoms: [
        {
          symptom: "Fatigue",
          severity: 3,
          loggedAt: new Date("2026-09-03T08:00:00.000Z"),
          notes: "Mild afternoon fatigue, resolving with rest"
        },
        {
          symptom: "Dry Cough",
          severity: 2,
          loggedAt: new Date("2026-09-02T19:00:00.000Z"),
          notes: "Occasional morning cough"
        }
      ],
      vitals: [
        { weight: 69.8, spo2: 97, heartRate: 78, bloodPressure: "125/82", recordedAt: new Date("2026-08-10T10:00:00.000Z") },
        { weight: 69.2, spo2: 98, heartRate: 75, bloodPressure: "122/80", recordedAt: new Date("2026-08-18T11:00:00.000Z") },
        { weight: 68.0, spo2: 96, heartRate: 80, bloodPressure: "124/84", recordedAt: new Date("2026-08-28T09:30:00.000Z") },
        { weight: 68.3, spo2: 98, heartRate: 74, bloodPressure: "120/80", recordedAt: new Date("2026-09-02T10:15:00.000Z") },
        { weight: 68.5, spo2: 98, heartRate: 72, bloodPressure: "120/80", recordedAt: new Date("2026-09-04T09:00:00.000Z") }
      ],
      medications: [
        {
          name: "Erlotinib",
          dosage: "150 mg",
          frequency: "Once daily",
          instructions: "Take on an empty stomach (1h before or 2h after meals)",
          prescribedBy: "Dr. Priya Raman",
          startDate: new Date("2026-08-15"),
          status: "Active"
        },
        {
          name: "Dexamethasone",
          dosage: "4 mg",
          frequency: "Twice daily as needed",
          instructions: "Take with meals to prevent gastric irritation",
          prescribedBy: "Dr. Priya Raman",
          startDate: new Date("2026-08-15"),
          status: "Active"
        }
      ]
    };

    if (!patientDoc) {
      patientDoc = await Patient.create(patientPayload);
    } else {
      Object.assign(patientDoc, patientPayload);
      await patientDoc.save();
    }

    console.log(`Patient Krishna initialized with ID ${patientDoc.patientIdString} (_id: ${patientDoc._id})`);

    // ====================================================
    // 3. SEED DOCTOR-APPROVED MEDICAL REPORTS
    // ====================================================
    console.log("Seeding doctor-approved medical reports...");

    await MedicalReport.deleteMany({ patient: patientDoc._id });

    const reportsData = [
      {
        reportIdString: "REP20260014",
        patient: patientDoc._id,
        reportName: "Chest_CT_Diagnostic_Evaluation_RUL.pdf",
        reportType: "Chest CT Scan",
        doctorName: "Dr. Priya Raman",
        hospital: "Apollo Cancer Centre",
        diagnosisSummary: "Suspicious pulmonary nodule identified in right upper lobe. Further biopsy recommended.",
        findings: "14mm solid non-calcified nodule with slight spiculation in RUL posterior segment. No mediastinal lymphadenopathy noted.",
        recommendation: "PET-CT and CT-guided core biopsy advised. Follow-up consultation in 2 weeks.",
        status: "Approved",
        reportDate: new Date("2026-09-10T10:00:00.000Z"),
        reviewed: true,
        reviewedBy: primaryDoctor._id,
        reviewedAt: new Date("2026-09-10T12:30:00.000Z")
      },
      {
        reportIdString: "REP20260012",
        patient: patientDoc._id,
        reportName: "Core_Biopsy_Histopathology_Report.pdf",
        reportType: "Biopsy Histology",
        doctorName: "Dr. Arjun Menon",
        hospital: "Apollo Cancer Centre",
        diagnosisSummary: "Histopathology confirms early-stage non-small cell adenocarcinoma. EGFR L858R mutation positive.",
        findings: "Core needle biopsy specimens reveal moderately differentiated adenocarcinoma. Tumor cells are TTF-1 positive and p40 negative.",
        recommendation: "EGFR-targeted TKI therapy recommended (Erlotinib 150mg daily). VATS resection planned.",
        status: "Approved",
        reportDate: new Date("2026-08-28T14:00:00.000Z"),
        reviewed: true,
        reviewedBy: primaryDoctor._id,
        reviewedAt: new Date("2026-08-28T16:00:00.000Z")
      },
      {
        reportIdString: "REP20260009",
        patient: patientDoc._id,
        reportName: "Circulating_Tumor_DNA_Baseline_Panel.pdf",
        reportType: "Blood Biomarkers",
        doctorName: "Dr. Priya Raman",
        hospital: "Apollo Cancer Centre",
        diagnosisSummary: "Liquid biopsy ctDNA baseline analysis completed. Carcinoembryonic Antigen (CEA) within normal limit.",
        findings: "CEA: 3.2 ng/mL (Normal: < 5.0 ng/mL). Complete blood count and hepatic/renal metabolic panel normal.",
        recommendation: "Routine metabolic monitoring during targeted therapy every 4 weeks.",
        status: "Approved",
        reportDate: new Date("2026-08-15T09:30:00.000Z"),
        reviewed: true,
        reviewedBy: primaryDoctor._id,
        reviewedAt: new Date("2026-08-15T11:00:00.000Z")
      }
    ];

    await MedicalReport.insertMany(reportsData);
    console.log(`Seeded ${reportsData.length} doctor-approved medical reports.`);

    // ====================================================
    // 4. SEED DOCTOR-APPROVED SCAN ANALYSIS (LIDC-IDRI)
    // ====================================================
    console.log("Seeding doctor-approved scan analysis...");

    await ScanAnalysis.deleteMany({ patient: patientDoc._id });

    const scanData = [
      {
        patient: patientDoc._id,
        patientId: patientDoc._id,
        doctor: primaryDoctor._id,
        doctorId: primaryDoctor._id,
        uploadedBy: primaryDoctor.user,
        patientName: "Krishna",
        originalFileName: "sample_01_high_risk_nodule.dcm",
        mimeType: "application/dicom",
        fileSize: 524288,
        scanType: "Chest CT",
        dicomMetadata: {
          modality: "CT",
          sliceThickness: "1.25 mm",
          pixelSpacing: "[0.7, 0.7]",
          windowCenter: -600,
          windowWidth: 1500,
          patientId: "LIDC-IDRI-PATIENT-01",
          manufacturer: "TCIA / LIDC-IDRI",
          format: "DICOM"
        },
        sliceIndex: 142,
        uploadedImage: "/uploads/scans/sample_slice.png",
        imagePath: "/uploads/scans/sample_slice.png",
        prediction: "Suspicious Malignant Pulmonary Nodule",
        classification: "Suspicious Malignant Pulmonary Nodule",
        primaryDiagnosis: "Suspicious Nodule",
        confidence: 88.5,
        riskLevel: "High",
        modelVersion: "DenseNet121_LIDC_v1",
        doctorDiagnosis: "Suspicious pulmonary nodule observed in right upper lobe.",
        doctorAssignedStage: "Stage I (T1b N0 M0)",
        clinicalStage: "Stage I (T1b N0 M0)",
        tnm: "T1b N0 M0",
        stage: "Stage I (T1b N0 M0)",
        treatmentPlan: "Targeted EGFR TKI (Erlotinib 150mg) + Active Clinical Surveillance",
        followUpPlan: "Surveillance Low-Dose CT in 3 months; repeat clinical evaluation on 12 September 2026.",
        doctorNotes: "Well-circumscribed 14mm solid nodule in Right Upper Lobe. Approved and communicated to patient.",
        isApproved: true,
        status: "Approved",
        verificationStatus: "Approved",
        reviewStatus: "Approved",
        reviewedAt: new Date("2026-09-10T12:00:00.000Z")
      }
    ];

    await ScanAnalysis.insertMany(scanData);
    console.log(`Seeded ${scanData.length} doctor-approved scan analysis.`);

    // ====================================================
    // 5. SEED APPOINTMENTS
    // ====================================================
    console.log("Seeding appointments...");

    await Appointment.deleteMany({ patient: patientDoc._id });

    const appointmentsData = [
      {
        appointmentIdString: "APT2026001",
        patient: patientDoc._id,
        doctor: primaryDoctor._id,
        department: "Thoracic Oncology",
        hospital: "Apollo Cancer Centre",
        requestedDate: new Date("2026-09-12T10:30:00.000Z"),
        timeString: "10:30 AM",
        status: "Confirmed",
        reason: "Routine follow-up & symptom review",
        doctorNotes: "Confirmed. Please bring recent medication log and any external bloodwork."
      },
      {
        appointmentIdString: "APT2026002",
        patient: patientDoc._id,
        doctor: primaryDoctor._id,
        department: "Thoracic Oncology",
        hospital: "Apollo Cancer Centre",
        requestedDate: new Date("2026-09-20T09:00:00.000Z"),
        timeString: "09:00 AM",
        status: "Confirmed",
        reason: "Surveillance CT scan consultation & image review",
        doctorNotes: "Scheduled directly following the 08:00 AM low-dose CT acquisition."
      },
      {
        appointmentIdString: "APT2026003",
        patient: patientDoc._id,
        doctor: doctorDocs[1]._id, // Dr. Arjun Menon
        department: "Surgical Oncology",
        hospital: "Apollo Cancer Centre",
        requestedDate: new Date("2026-08-28T14:00:00.000Z"),
        timeString: "02:00 PM",
        status: "Completed",
        reason: "Post-operative surgical wound review & pathology discussion",
        doctorNotes: "Surgical site well-healed. Clear margins confirmed. Transferred to medical oncology maintenance."
      }
    ];

    await Appointment.insertMany(appointmentsData);
    console.log(`Seeded ${appointmentsData.length} appointments.`);

    // ====================================================
    // 6. SEED TREATMENT ROADMAP (7 Stages)
    // ====================================================
    console.log("Seeding oncology treatment roadmap...");

    await Treatment.deleteMany({ patient: patientDoc._id });

    const treatmentsData = [
      {
        patient: patientDoc._id,
        doctor: primaryDoctor._id,
        doctorName: "Dr. Priya Raman",
        hospital: "Apollo Cancer Centre",
        stepKey: "Diagnosis",
        treatmentName: "Initial Pulmonary Diagnostic Evaluation",
        treatmentType: "Diagnostic Evaluation",
        status: "Completed",
        startDate: new Date("2026-08-10"),
        completedDate: new Date("2026-08-12"),
        notes: "High-resolution Chest CT identified a 14mm suspicious pulmonary nodule in the Right Upper Lobe. Patient diagnosed with suspicious nodule requiring histopathological correlation.",
        summary: "High-resolution Chest CT identified a 14mm suspicious pulmonary nodule in the Right Upper Lobe. Patient diagnosed with suspicious nodule requiring histopathological correlation."
      },
      {
        patient: patientDoc._id,
        doctor: doctorDocs[1]._id,
        doctorName: "Dr. Arjun Menon",
        hospital: "Apollo Cancer Centre",
        stepKey: "Biopsy",
        treatmentName: "CT-Guided Core Needle Biopsy",
        treatmentType: "Histopathology",
        status: "Completed",
        startDate: new Date("2026-08-18"),
        completedDate: new Date("2026-08-20"),
        notes: "Percutaneous CT-guided core biopsy performed on RUL nodule. Histopathology confirmed early-stage non-small cell adenocarcinoma (EGFR L858R mutation positive).",
        summary: "Percutaneous CT-guided core biopsy performed on RUL nodule. Histopathology confirmed early-stage non-small cell adenocarcinoma (EGFR L858R mutation positive)."
      },
      {
        patient: patientDoc._id,
        doctor: doctorDocs[1]._id,
        doctorName: "Dr. Arjun Menon",
        hospital: "Apollo Cancer Centre",
        stepKey: "Surgery",
        treatmentName: "VATS Minimally Invasive Lobectomy",
        treatmentType: "Surgical Resection",
        status: "Completed",
        startDate: new Date("2026-08-28"),
        completedDate: new Date("2026-08-29"),
        notes: "Video-assisted thoracoscopic surgery (VATS) right upper lobectomy with systematic mediastinal lymph node dissection. Clear surgical margins achieved (R0 resection).",
        summary: "Video-assisted thoracoscopic surgery (VATS) right upper lobectomy with systematic mediastinal lymph node dissection. Clear surgical margins achieved (R0 resection)."
      },
      {
        patient: patientDoc._id,
        doctor: primaryDoctor._id,
        doctorName: "Dr. Priya Raman",
        hospital: "Apollo Cancer Centre",
        stepKey: "Chemotherapy",
        treatmentName: "Targeted Adjuvant Therapy (Erlotinib)",
        treatmentType: "Oral Targeted Chemotherapy",
        status: "Active",
        startDate: new Date("2026-09-05"),
        recoveryRate: 85,
        survivalProbability: 92,
        notes: "Targeted EGFR TKI maintenance therapy with Erlotinib 150mg daily. Patient tolerating regimen with minimal grade 1 dermatological side effects.",
        summary: "Targeted EGFR TKI maintenance therapy with Erlotinib 150mg daily. Patient tolerating regimen with minimal grade 1 dermatological side effects."
      },
      {
        patient: patientDoc._id,
        doctor: doctorDocs[2]._id,
        doctorName: "Dr. Kavitha Iyer",
        hospital: "Cancer Institute Adyar",
        stepKey: "Radiotherapy",
        treatmentName: "Stereotactic Body Radiotherapy (SBRT)",
        treatmentType: "Precision Radiation",
        status: "Scheduled",
        startDate: new Date("2026-10-15"),
        notes: "Targeted SBRT planned for surgical margin sterilization. Pre-treatment 4D-CT simulation scheduled.",
        summary: "Targeted SBRT planned for surgical margin sterilization. Pre-treatment 4D-CT simulation scheduled."
      },
      {
        patient: patientDoc._id,
        doctor: primaryDoctor._id,
        doctorName: "Dr. Priya Raman",
        hospital: "Apollo Cancer Centre",
        stepKey: "Immunotherapy",
        treatmentName: "Immune Checkpoint Surveillance",
        treatmentType: "Immunotherapy Protocol",
        status: "Planned",
        startDate: new Date("2026-11-20"),
        notes: "Evaluation for adjuvant PD-L1 immunotherapy based on post-radiotherapy inflammatory markers and clinical tolerance.",
        summary: "Evaluation for adjuvant PD-L1 immunotherapy based on post-radiotherapy inflammatory markers and clinical tolerance."
      },
      {
        patient: patientDoc._id,
        doctor: primaryDoctor._id,
        doctorName: "Dr. Priya Raman",
        hospital: "Apollo Cancer Centre",
        stepKey: "Follow-up CT",
        treatmentName: "High-Resolution Surveillance Chest CT",
        treatmentType: "Radiology Follow-up",
        status: "Scheduled",
        startDate: new Date("2026-09-20"),
        notes: "Scheduled 3-month surveillance low-dose chest CT to assess lung parenchyma healing, mediastinum, and rule out recurrence.",
        summary: "Scheduled 3-month surveillance low-dose chest CT to assess lung parenchyma healing, mediastinum, and rule out recurrence."
      }
    ];

    await Treatment.insertMany(treatmentsData);
    console.log(`Seeded ${treatmentsData.length} treatment roadmap stages.`);

    console.log("\n==========================================");
    console.log("HOSPITAL DEMO DATA SEEDED SUCCESSFULLY!");
    console.log("==========================================");
    console.log("Patient Login: krishna.patient@oncotwin.org / password123");
    console.log("Doctor Login:  priya.raman@oncotwin.org    / password123");
    console.log("==========================================\n");

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error("Seeding Error:", err);
    process.exit(1);
  }
}

seedData();
