import { storage } from "./storage";

export async function seedDatabase() {
  const existingUsers = await storage.getAllUsers();
  if (existingUsers.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database...");

  // Users
  const np1 = await storage.createUser({ username: "sarah.np", password: "password", fullName: "Sarah Johnson, NP", role: "np", email: "sarah@easyhealth.com", active: true });
  const np2 = await storage.createUser({ username: "michael.np", password: "password", fullName: "Michael Chen, NP", role: "np", email: "michael@easyhealth.com", active: true });
  const sup = await storage.createUser({ username: "dr.williams", password: "password", fullName: "Dr. Lisa Williams", role: "supervisor", email: "lisa@easyhealth.com", active: true });
  const coord = await storage.createUser({ username: "emma.coord", password: "password", fullName: "Emma Davis", role: "care_coordinator", email: "emma@easyhealth.com", active: true });
  const admin = await storage.createUser({ username: "admin", password: "password", fullName: "System Admin", role: "admin", email: "admin@easyhealth.com", active: true });
  await storage.createUser({ username: "compliance", password: "password", fullName: "Robert Taylor", role: "compliance", email: "robert@easyhealth.com", active: true });

  // Members
  const member1 = await storage.createMember({
    memberId: "MEM-001",
    firstName: "Dorothy",
    lastName: "Martinez",
    dob: "1945-03-15",
    gender: "Female",
    phone: "(555) 234-5678",
    email: "dorothy.m@email.com",
    address: "123 Oak Lane",
    city: "Springfield",
    state: "IL",
    zip: "62701",
    insurancePlan: "MA-PLAN-001",
    planPackId: "MA-PLAN-001",
    planPackVersion: "1.0",
    pcp: "Dr. James Wilson",
    conditions: ["Type 2 Diabetes", "Hypertension", "Osteoarthritis"],
    medications: ["Metformin 500mg", "Lisinopril 10mg", "Acetaminophen PRN"],
    allergies: ["Penicillin", "Sulfa drugs"],
    riskFlags: ["Fall risk", "Polypharmacy"],
  });

  const member2 = await storage.createMember({
    memberId: "MEM-002",
    firstName: "Harold",
    lastName: "Washington",
    dob: "1938-11-22",
    gender: "Male",
    phone: "(555) 345-6789",
    email: "harold.w@email.com",
    address: "456 Maple Drive",
    city: "Springfield",
    state: "IL",
    zip: "62702",
    insurancePlan: "MA-PLAN-001",
    planPackId: "MA-PLAN-001",
    planPackVersion: "1.0",
    pcp: "Dr. Maria Garcia",
    conditions: ["COPD", "Congestive Heart Failure", "Depression"],
    medications: ["Albuterol inhaler", "Furosemide 40mg", "Sertraline 50mg", "Lisinopril 20mg"],
    allergies: ["Aspirin"],
    riskFlags: ["Oxygen dependent", "Social isolation"],
  });

  const member3 = await storage.createMember({
    memberId: "MEM-003",
    firstName: "Margaret",
    lastName: "Thompson",
    dob: "1952-07-08",
    gender: "Female",
    phone: "(555) 456-7890",
    address: "789 Elm Street",
    city: "Springfield",
    state: "IL",
    zip: "62703",
    insurancePlan: "ACA-PLAN-001",
    planPackId: "ACA-PLAN-001",
    planPackVersion: "1.0",
    pcp: "Dr. David Lee",
    conditions: ["Breast cancer (remission)", "Hypothyroidism", "Anxiety"],
    medications: ["Levothyroxine 75mcg", "Buspirone 10mg"],
    allergies: [],
    riskFlags: ["Cancer screening due"],
  });

  // Assessment Definitions
  const phq2 = await storage.createAssessmentDefinition({
    instrumentId: "PHQ-2",
    name: "Patient Health Questionnaire-2",
    version: "1.0",
    category: "Mental Health Screening",
    description: "Brief depression screening tool. Score >= 3 triggers PHQ-9.",
    questions: [
      {
        id: "q1",
        text: "Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?",
        options: [
          { value: "0", label: "Not at all", score: 0 },
          { value: "1", label: "Several days", score: 1 },
          { value: "2", label: "More than half the days", score: 2 },
          { value: "3", label: "Nearly every day", score: 3 },
        ],
      },
      {
        id: "q2",
        text: "Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?",
        options: [
          { value: "0", label: "Not at all", score: 0 },
          { value: "1", label: "Several days", score: 1 },
          { value: "2", label: "More than half the days", score: 2 },
          { value: "3", label: "Nearly every day", score: 3 },
        ],
      },
    ],
    scoringRules: { method: "sum", maxScore: 6 },
    interpretationBands: [
      { min: 0, max: 2, label: "Negative screen", severity: "none" },
      { min: 3, max: 6, label: "Positive screen - administer PHQ-9", severity: "moderate" },
    ],
    branchingRules: {
      followUpAssessments: [
        { instrumentId: "PHQ-9", condition: { scoreThreshold: 3, operator: ">=" }, label: "PHQ-9 Full Depression Assessment" },
      ],
    },
    active: true,
  });

  const phq9 = await storage.createAssessmentDefinition({
    instrumentId: "PHQ-9",
    name: "Patient Health Questionnaire-9",
    version: "1.0",
    category: "Mental Health Assessment",
    description: "Comprehensive depression severity assessment.",
    questions: [
      { id: "q1", text: "Little interest or pleasure in doing things", options: [
        { value: "0", label: "Not at all", score: 0 }, { value: "1", label: "Several days", score: 1 },
        { value: "2", label: "More than half the days", score: 2 }, { value: "3", label: "Nearly every day", score: 3 },
      ]},
      { id: "q2", text: "Feeling down, depressed, or hopeless", options: [
        { value: "0", label: "Not at all", score: 0 }, { value: "1", label: "Several days", score: 1 },
        { value: "2", label: "More than half the days", score: 2 }, { value: "3", label: "Nearly every day", score: 3 },
      ]},
      { id: "q3", text: "Trouble falling or staying asleep, or sleeping too much", options: [
        { value: "0", label: "Not at all", score: 0 }, { value: "1", label: "Several days", score: 1 },
        { value: "2", label: "More than half the days", score: 2 }, { value: "3", label: "Nearly every day", score: 3 },
      ]},
      { id: "q4", text: "Feeling tired or having little energy", options: [
        { value: "0", label: "Not at all", score: 0 }, { value: "1", label: "Several days", score: 1 },
        { value: "2", label: "More than half the days", score: 2 }, { value: "3", label: "Nearly every day", score: 3 },
      ]},
      { id: "q5", text: "Poor appetite or overeating", options: [
        { value: "0", label: "Not at all", score: 0 }, { value: "1", label: "Several days", score: 1 },
        { value: "2", label: "More than half the days", score: 2 }, { value: "3", label: "Nearly every day", score: 3 },
      ]},
      { id: "q6", text: "Feeling bad about yourself - or that you are a failure or have let yourself or your family down", options: [
        { value: "0", label: "Not at all", score: 0 }, { value: "1", label: "Several days", score: 1 },
        { value: "2", label: "More than half the days", score: 2 }, { value: "3", label: "Nearly every day", score: 3 },
      ]},
      { id: "q7", text: "Trouble concentrating on things, such as reading the newspaper or watching television", options: [
        { value: "0", label: "Not at all", score: 0 }, { value: "1", label: "Several days", score: 1 },
        { value: "2", label: "More than half the days", score: 2 }, { value: "3", label: "Nearly every day", score: 3 },
      ]},
      { id: "q8", text: "Moving or speaking so slowly that other people could have noticed? Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual", options: [
        { value: "0", label: "Not at all", score: 0 }, { value: "1", label: "Several days", score: 1 },
        { value: "2", label: "More than half the days", score: 2 }, { value: "3", label: "Nearly every day", score: 3 },
      ]},
      { id: "q9", text: "Thoughts that you would be better off dead or of hurting yourself in some way", options: [
        { value: "0", label: "Not at all", score: 0 }, { value: "1", label: "Several days", score: 1 },
        { value: "2", label: "More than half the days", score: 2 }, { value: "3", label: "Nearly every day", score: 3 },
      ]},
    ],
    scoringRules: { method: "sum", maxScore: 27 },
    interpretationBands: [
      { min: 0, max: 4, label: "Minimal depression", severity: "none" },
      { min: 5, max: 9, label: "Mild depression", severity: "mild" },
      { min: 10, max: 14, label: "Moderate depression", severity: "moderate" },
      { min: 15, max: 19, label: "Moderately severe depression", severity: "moderately_severe" },
      { min: 20, max: 27, label: "Severe depression", severity: "severe" },
    ],
    active: true,
  });

  await storage.createAssessmentDefinition({
    instrumentId: "PRAPARE",
    name: "PRAPARE Social Determinants Screening",
    version: "1.0",
    category: "Social Determinants of Health",
    description: "Protocol for Responding to and Assessing Patients' Assets, Risks, and Experiences.",
    questions: [
      { id: "q1", text: "Are you Hispanic or Latino?", options: [
        { value: "yes", label: "Yes", score: 0 }, { value: "no", label: "No", score: 0 },
        { value: "decline", label: "I choose not to answer", score: 0 },
      ]},
      { id: "q2", text: "What is the highest level of school that you have finished?", options: [
        { value: "none", label: "Less than high school", score: 1 },
        { value: "hs", label: "High school diploma or GED", score: 0 },
        { value: "college", label: "Some college or more", score: 0 },
      ]},
      { id: "q3", text: "What is your current work situation?", options: [
        { value: "employed", label: "Employed full-time or part-time", score: 0 },
        { value: "unemployed", label: "Unemployed / looking for work", score: 1 },
        { value: "retired", label: "Retired", score: 0 },
        { value: "otherwise", label: "Otherwise not employed", score: 1 },
      ]},
      { id: "q4", text: "What is your housing situation today?", options: [
        { value: "own", label: "I have a steady place to live", score: 0 },
        { value: "concern", label: "I have a place but concerned about losing it", score: 1 },
        { value: "none", label: "I do not have a steady place to live", score: 2 },
      ]},
      { id: "q5", text: "In the past year, have you or your family members been unable to get any of the following when needed? (Food)", options: [
        { value: "no", label: "No", score: 0 }, { value: "yes", label: "Yes", score: 1 },
      ]},
      { id: "q6", text: "Do you have trouble paying for transportation to work, medical appointments, or other activities?", options: [
        { value: "no", label: "No", score: 0 }, { value: "yes", label: "Yes", score: 1 },
      ]},
      { id: "q7", text: "How often do you see or talk to people that you care about and feel close to?", options: [
        { value: "often", label: "5 or more times a week", score: 0 },
        { value: "sometimes", label: "3 to 5 times a week", score: 0 },
        { value: "rarely", label: "1 to 2 times a week", score: 1 },
        { value: "never", label: "Less than once a week", score: 2 },
      ]},
      { id: "q8", text: "Has lack of transportation kept you from medical appointments, meetings, work, or getting things needed for daily living?", options: [
        { value: "no", label: "No", score: 0 }, { value: "yes", label: "Yes", score: 1 },
      ]},
    ],
    scoringRules: { method: "sum", maxScore: 10 },
    interpretationBands: [
      { min: 0, max: 2, label: "Low social risk", severity: "none" },
      { min: 3, max: 5, label: "Moderate social risk", severity: "moderate" },
      { min: 6, max: 10, label: "High social risk", severity: "severe" },
    ],
    branchingRules: {
      conditionalQuestions: [
        { questionId: "q5", condition: { answer: "yes" }, prompt: "Food insecurity identified - assess for nutrition assistance programs (SNAP, food bank)", taskTitle: "Food Resource Referral", taskType: "referral", priority: "high" },
        { questionId: "q4", condition: { answer: "concern" }, prompt: "Housing instability - assess for housing support resources", taskTitle: "Housing Support Referral", taskType: "referral", priority: "high" },
        { questionId: "q4", condition: { answer: "none" }, prompt: "Homelessness identified - immediate housing referral needed", taskTitle: "Immediate Housing Referral", taskType: "referral", priority: "urgent" },
      ],
      followUpAssessments: [],
    },
    active: true,
  });

  await storage.createAssessmentDefinition({
    instrumentId: "AWV",
    name: "Annual Wellness Visit Health Risk Assessment",
    version: "1.0",
    category: "Preventive Health",
    description: "Standard Annual Wellness Visit health risk assessment and review.",
    questions: [
      { id: "q1", text: "In the past 12 months, have you had a flu shot?", options: [
        { value: "yes", label: "Yes", score: 0 }, { value: "no", label: "No", score: 1 },
      ]},
      { id: "q2", text: "In the past 12 months, have you fallen or felt unsteady on your feet?", options: [
        { value: "no", label: "No", score: 0 }, { value: "yes", label: "Yes", score: 1 },
      ]},
      { id: "q3", text: "Do you currently smoke or use tobacco?", options: [
        { value: "no", label: "No", score: 0 }, { value: "yes", label: "Yes", score: 1 },
      ]},
      { id: "q4", text: "On average, how many alcoholic drinks do you consume per week?", options: [
        { value: "0", label: "0", score: 0 }, { value: "1-7", label: "1-7", score: 0 },
        { value: "8-14", label: "8-14", score: 1 }, { value: "15+", label: "15+", score: 2 },
      ]},
      { id: "q5", text: "Do you feel safe in your current living situation?", options: [
        { value: "yes", label: "Yes", score: 0 }, { value: "no", label: "No", score: 2 },
      ]},
      { id: "q6", text: "Are you able to manage your daily activities (bathing, dressing, eating) independently?", options: [
        { value: "yes", label: "Yes, fully independent", score: 0 },
        { value: "some_help", label: "I need some help", score: 1 },
        { value: "significant_help", label: "I need significant help", score: 2 },
      ]},
    ],
    scoringRules: { method: "sum", maxScore: 9 },
    interpretationBands: [
      { min: 0, max: 1, label: "Low risk", severity: "none" },
      { min: 2, max: 4, label: "Moderate risk", severity: "moderate" },
      { min: 5, max: 9, label: "High risk - requires intervention", severity: "severe" },
    ],
    branchingRules: {
      conditionalQuestions: [],
      followUpAssessments: [],
      conditionScreening: [
        {
          conditionKeyword: "Diabetes",
          screenings: [
            { title: "Diabetic Foot Exam Referral", description: "Annual diabetic foot examination recommended based on diabetes diagnosis", taskType: "screening", priority: "medium" },
            { title: "Diabetic Eye Exam Referral", description: "Annual dilated eye examination recommended based on diabetes diagnosis", taskType: "screening", priority: "medium" },
          ],
        },
        {
          conditionKeyword: "Heart Failure",
          screenings: [
            { title: "Lipid Panel Screening", description: "Lipid panel recommended based on cardiac condition", taskType: "screening", priority: "medium" },
          ],
        },
        {
          conditionKeyword: "Hypertension",
          screenings: [
            { title: "Lipid Panel Screening", description: "Lipid panel recommended for cardiovascular risk assessment", taskType: "screening", priority: "medium" },
          ],
        },
      ],
    },
    active: true,
  });

  // Measure Definitions
  await storage.createMeasureDefinition({
    measureId: "BCS",
    name: "Breast Cancer Screening",
    version: "1.0",
    category: "Cancer Screening",
    description: "Women 40-74 who had a mammogram within a 27-month lookback window (Oct 1 two years prior through Dec 31 of the measurement year). Result is NOT required for HEDIS compliance — only documentation that screening was performed and when.",
    requiredEvidenceType: "Documentation that mammogram was performed and date of service. Result/finding is not required.",
    allowedCaptureMethods: ["in_home_visit", "external_record", "hie_retrieval", "member_reported"],
    evaluationType: "evidence_based",
    dataSource: "external_record",
    clinicalCriteria: {
      screeningTypes: ["Screening Mammogram", "Diagnostic Mammogram", "Digital Mammogram", "3D Tomosynthesis (DBT)"],
      lookbackMonths: 27,
      resultRequired: false,
      ageRange: "40-74",
      hedisNote: "Any mammogram type qualifies. Year-only date is acceptable if exact date unknown.",
    },
    hcpcsCodes: ["G0202", "77067"],
    cptCodes: ["77065", "77066", "77067"],
    icdCodes: ["Z12.31"],
    active: true,
  });

  await storage.createMeasureDefinition({
    measureId: "COL",
    name: "Colorectal Cancer Screening",
    version: "1.0",
    category: "Cancer Screening",
    description: "Adults 45-75 who received appropriate colorectal cancer screening. For colonoscopy, documentation of procedure and date is sufficient when recorded in medical history. Result/finding is recommended but not always required.",
    requiredEvidenceType: "Documentation that screening was performed and date. Result recommended for colonoscopy if not in medical history section.",
    allowedCaptureMethods: ["in_home_visit", "external_record", "hie_retrieval", "member_reported"],
    evaluationType: "evidence_based",
    dataSource: "external_record",
    clinicalCriteria: {
      screeningTypes: [
        { type: "Colonoscopy", lookbackYears: 10 },
        { type: "Flexible Sigmoidoscopy", lookbackYears: 5 },
        { type: "CT Colonography", lookbackYears: 5 },
        { type: "FIT (Fecal Immunochemical Test)", lookbackYears: 1 },
        { type: "gFOBT (Guaiac Fecal Occult Blood)", lookbackYears: 1 },
        { type: "Stool DNA with FIT (Cologuard)", lookbackYears: 3 },
      ],
      resultRequired: false,
      ageRange: "45-75",
      hedisNote: "For colonoscopy in medical history, result is not required. Year-only date is acceptable. Member-reported screening is valid.",
    },
    hcpcsCodes: ["G0105", "G0121"],
    cptCodes: ["45378", "45380", "45381", "45384", "45385"],
    icdCodes: ["Z12.11"],
    active: true,
  });

  await storage.createMeasureDefinition({
    measureId: "CDC-A1C",
    name: "Diabetes: HbA1c Testing",
    version: "1.0",
    category: "Chronic Disease Management",
    description: "Diabetic patients who had HbA1c testing in the measurement year. Auto-evaluates from lab results when HbA1c test data is available.",
    requiredEvidenceType: "Lab result showing HbA1c test",
    allowedCaptureMethods: ["in_home_visit", "external_record", "hie_retrieval"],
    evaluationType: "clinical_data",
    dataSource: "labs",
    clinicalCriteria: {
      labTest: "HbA1c",
      controlledThreshold: 9.0,
      goodControlThreshold: 7.0,
      description: "HbA1c <7% = good control, 7-9% = moderate, >9% = poor control",
    },
    cptCodes: ["83036"],
    cptIICodes: ["3044F", "3045F", "3046F"],
    icdCodes: ["Z13.1", "E11.65"],
    active: true,
  });

  await storage.createMeasureDefinition({
    measureId: "CBP",
    name: "Controlling High Blood Pressure",
    version: "1.0",
    category: "Chronic Disease Management",
    description: "Patients 18-85 with hypertension whose BP was adequately controlled (<140/90). Auto-evaluates from vitals when blood pressure is recorded.",
    requiredEvidenceType: "Blood pressure reading from vitals",
    allowedCaptureMethods: ["in_home_visit"],
    evaluationType: "clinical_data",
    dataSource: "vitals",
    clinicalCriteria: {
      systolicMax: 140,
      diastolicMax: 90,
      requiresBothReadings: true,
      description: "Controlled = systolic <140 AND diastolic <90 mmHg",
    },
    cptCodes: ["99473"],
    cptIICodes: ["3074F", "3075F"],
    hcpcsCodes: ["G8476", "G8477"],
    icdCodes: ["I10", "Z13.6"],
    active: true,
  });

  await storage.createMeasureDefinition({
    measureId: "FMC",
    name: "Follow-Up After Emergency Visit",
    version: "1.0",
    category: "Care Coordination",
    description: "Follow-up within 30 days after an emergency department visit.",
    requiredEvidenceType: "Follow-up visit documentation or contact record",
    allowedCaptureMethods: ["in_home_visit", "external_record", "member_reported"],
    evaluationType: "evidence_based",
    dataSource: "external_record",
    cptCodes: ["99214"],
    active: true,
  });

  // Plan Packs
  await storage.createPlanPack({
    planId: "MA-PLAN-001",
    planName: "Medicare Advantage Standard",
    programId: "MA-STD",
    visitType: "annual_wellness",
    requiredAssessments: ["PHQ-2", "PRAPARE", "AWV"],
    requiredMeasures: ["CBP", "CDC-A1C", "COL"],
    identityVerificationRequired: false,
    noppRequired: true,
    version: "1.0",
    active: true,
    description: "Standard Medicare Advantage annual wellness visit package with comprehensive screenings and HEDIS measures",
    moduleEnables: { vitals: true, assessments: true, medications: true, measures: true, voiceCapture: true, careplan: true, timeline: true },
    featureFlags: { requireMedReconciliation: true, autoCodeGeneration: true, cdsAlerts: true },
  });

  await storage.createPlanPack({
    planId: "ACA-PLAN-001",
    planName: "ACA Comprehensive",
    programId: "ACA-COMP",
    visitType: "annual_wellness",
    requiredAssessments: ["PHQ-2", "PRAPARE", "AWV"],
    requiredMeasures: ["BCS", "COL", "CBP"],
    identityVerificationRequired: false,
    noppRequired: true,
    version: "1.0",
    active: true,
    description: "ACA plan comprehensive visit package with preventive screenings and social determinants assessment",
    moduleEnables: { vitals: true, assessments: true, medications: true, measures: true, voiceCapture: true, careplan: true, timeline: true },
    featureFlags: { requireMedReconciliation: true, autoCodeGeneration: true, cdsAlerts: true },
  });

  // Reason Codes
  const reasonCodeData: { category: string; codes: string[] }[] = [
    { category: "unable_to_assess", codes: [
      "Patient cognitively impaired - unable to participate",
      "Patient too fatigued to continue",
      "Language barrier - no interpreter available",
      "Patient left before completion",
      "Assessment not clinically appropriate",
      "Equipment malfunction or unavailable",
      "Time constraints - visit exceeded schedule",
      "Patient in acute distress",
    ]},
    { category: "patient_declined", codes: [
      "Patient verbally declined",
      "Patient declined - privacy concerns",
      "Patient declined - previously completed elsewhere",
      "Patient declined - religious/cultural reasons",
      "Patient declined - no reason given",
      "Caregiver declined on patient's behalf",
    ]},
    { category: "deferred", codes: [
      "Deferred to next visit",
      "Deferred pending specialist consultation",
      "Deferred - awaiting lab results",
      "Deferred - patient scheduling conflict",
      "Deferred to telehealth follow-up",
    ]},
    { category: "clinical_contraindication", codes: [
      "Contraindicated due to current medications",
      "Contraindicated due to acute illness",
      "Screening not indicated per clinical guidelines",
      "Age/gender not applicable for this measure",
      "Patient has exclusion diagnosis",
    ]},
    { category: "equipment_unavailable", codes: [
      "BP cuff not available or malfunctioning",
      "Pulse oximeter unavailable",
      "Scale unavailable or inaccurate",
      "Thermometer unavailable",
      "Assessment forms not available",
    ]},
    { category: "environmental", codes: [
      "Unsafe environment - unable to proceed",
      "Insufficient lighting for examination",
      "No private space available",
      "Excessive noise - screening unreliable",
      "Other household members interfering",
    ]},
    { category: "cognitive_barrier", codes: [
      "Advanced dementia - unable to self-report",
      "Acute confusion or delirium",
      "Severe intellectual disability",
      "Sedation - unable to participate",
      "Aphasia - unable to communicate responses",
    ]},
    { category: "consent_exception", codes: [
      "Patient refused to acknowledge",
      "Patient incapacitated",
      "Language barrier - interpreter unavailable",
      "Previously delivered and on file",
      "Emergency visit - deferred",
      "Legal guardian unavailable",
    ]},
  ];

  for (const group of reasonCodeData) {
    for (let i = 0; i < group.codes.length; i++) {
      const label = group.codes[i];
      const code = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      await storage.createReasonCode({
        category: group.category,
        code,
        label,
        active: true,
        sortOrder: (i + 1) * 10,
      });
    }
  }

  // Diagnosis Validation Rules (60 rules)
  const diagnosisRulesData = [
    // Cardiovascular (10)
    { icdCode: "I10", icdDescription: "Essential Hypertension", category: "Cardiovascular", requiredEvidence: [
      { type: "vitals", field: "systolic", description: "Systolic blood pressure reading documented" },
      { type: "vitals", field: "diastolic", description: "Diastolic blood pressure reading documented" },
      { type: "medication", description: "Antihypertensive medications documented in reconciliation" },
    ]},
    { icdCode: "I25.10", icdDescription: "Atherosclerotic Heart Disease", category: "Cardiovascular", requiredEvidence: [
      { type: "medication", description: "Cardiac medications documented in reconciliation" },
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "I48.91", icdDescription: "Atrial Fibrillation, Unspecified", category: "Cardiovascular", requiredEvidence: [
      { type: "vitals", field: "heartRate", description: "Heart rate documented" },
      { type: "medication", description: "Anticoagulant or rate control medications documented" },
    ]},
    { icdCode: "I50.9", icdDescription: "Heart Failure, Unspecified", category: "Cardiovascular", requiredEvidence: [
      { type: "vitals", field: "heartRate", description: "Heart rate documented" },
      { type: "vitals", field: "oxygenSaturation", description: "Oxygen saturation documented" },
      { type: "medication", description: "Heart failure medications documented" },
    ]},
    { icdCode: "I63.9", icdDescription: "Cerebral Infarction, Unspecified", category: "Cardiovascular", requiredEvidence: [
      { type: "medication", description: "Stroke prevention medications documented" },
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "I73.9", icdDescription: "Peripheral Vascular Disease, Unspecified", category: "Cardiovascular", requiredEvidence: [
      { type: "vitals", field: "systolic", description: "Blood pressure reading documented" },
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "I11.9", icdDescription: "Hypertensive Heart Disease without Heart Failure", category: "Cardiovascular", requiredEvidence: [
      { type: "vitals", field: "systolic", description: "Systolic blood pressure reading documented" },
      { type: "vitals", field: "diastolic", description: "Diastolic blood pressure reading documented" },
    ]},
    { icdCode: "I42.9", icdDescription: "Cardiomyopathy, Unspecified", category: "Cardiovascular", requiredEvidence: [
      { type: "vitals", field: "heartRate", description: "Heart rate documented" },
      { type: "medication", description: "Cardiac medications documented" },
    ]},
    { icdCode: "I25.2", icdDescription: "Old Myocardial Infarction", category: "Cardiovascular", requiredEvidence: [
      { type: "medication", description: "Post-MI medications documented" },
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "I69.30", icdDescription: "Sequelae of Cerebral Infarction, Unspecified", category: "Cardiovascular", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
      { type: "medication", description: "Post-stroke medications documented" },
    ]},
    // Endocrine (8)
    { icdCode: "E11.9", icdDescription: "Type 2 Diabetes Mellitus without Complications", category: "Endocrine", requiredEvidence: [
      { type: "lab", testName: "HbA1c", description: "HbA1c lab result available" },
      { type: "medication", description: "Diabetes medications documented in reconciliation" },
      { type: "vitals", field: "bmi", description: "BMI documented" },
    ]},
    { icdCode: "E11.65", icdDescription: "Type 2 DM with Hyperglycemia", category: "Endocrine", requiredEvidence: [
      { type: "lab", testName: "HbA1c", description: "HbA1c lab result available" },
      { type: "medication", description: "Diabetes medications documented" },
    ]},
    { icdCode: "E11.40", icdDescription: "Type 2 DM with Diabetic Neuropathy", category: "Endocrine", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
      { type: "medication", description: "Neuropathy or diabetes medications documented" },
    ]},
    { icdCode: "E11.22", icdDescription: "Type 2 DM with Diabetic CKD", category: "Endocrine", requiredEvidence: [
      { type: "lab", testName: "Creatinine", description: "Creatinine lab result available" },
      { type: "medication", description: "Diabetes and renal medications documented" },
    ]},
    { icdCode: "E78.5", icdDescription: "Hyperlipidemia, Unspecified", category: "Endocrine", requiredEvidence: [
      { type: "lab", testName: "Lipid Panel", description: "Lipid panel lab result available" },
      { type: "medication", description: "Lipid-lowering medications documented" },
    ]},
    { icdCode: "E03.9", icdDescription: "Hypothyroidism, Unspecified", category: "Endocrine", requiredEvidence: [
      { type: "lab", testName: "TSH", description: "TSH lab result available" },
      { type: "medication", description: "Thyroid medications documented" },
    ]},
    { icdCode: "E66.01", icdDescription: "Morbid Obesity due to Excess Calories", category: "Endocrine", requiredEvidence: [
      { type: "vitals", field: "bmi", description: "BMI documented" },
      { type: "vitals", field: "weight", description: "Weight documented" },
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "E55.9", icdDescription: "Vitamin D Deficiency, Unspecified", category: "Endocrine", requiredEvidence: [
      { type: "lab", testName: "Vitamin D", description: "Vitamin D lab result available" },
      { type: "medication", description: "Vitamin D supplementation documented" },
    ]},
    // Mental Health (8)
    { icdCode: "F32.1", icdDescription: "Major Depressive Disorder, Single Episode, Moderate", category: "Mental Health", requiredEvidence: [
      { type: "assessment", instrumentId: "PHQ-2", description: "PHQ-2 depression screening completed" },
      { type: "assessment", instrumentId: "PHQ-9", description: "PHQ-9 depression assessment completed" },
      { type: "medication", description: "Antidepressant medications documented" },
    ]},
    { icdCode: "F33.0", icdDescription: "Recurrent Depressive Disorder, Current Episode Mild", category: "Mental Health", requiredEvidence: [
      { type: "assessment", instrumentId: "PHQ-2", description: "PHQ-2 depression screening completed" },
      { type: "medication", description: "Antidepressant medications documented" },
    ]},
    { icdCode: "F41.1", icdDescription: "Generalized Anxiety Disorder", category: "Mental Health", requiredEvidence: [
      { type: "assessment", instrumentId: "PHQ-2", description: "PHQ-2 depression screening completed" },
      { type: "medication", description: "Anxiolytic medications documented" },
    ]},
    { icdCode: "F10.20", icdDescription: "Alcohol Dependence, Uncomplicated", category: "Mental Health", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "F17.210", icdDescription: "Nicotine Dependence, Cigarettes, Uncomplicated", category: "Mental Health", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "F31.9", icdDescription: "Bipolar Disorder, Unspecified", category: "Mental Health", requiredEvidence: [
      { type: "assessment", instrumentId: "PHQ-2", description: "PHQ-2 depression screening completed" },
      { type: "medication", description: "Mood stabilizer medications documented" },
    ]},
    { icdCode: "F43.10", icdDescription: "Post-Traumatic Stress Disorder, Unspecified", category: "Mental Health", requiredEvidence: [
      { type: "assessment", instrumentId: "PHQ-2", description: "PHQ-2 depression screening completed" },
      { type: "medication", description: "PTSD-related medications documented" },
    ]},
    { icdCode: "F90.9", icdDescription: "ADHD, Unspecified Type", category: "Mental Health", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
      { type: "medication", description: "ADHD medications documented" },
    ]},
    // Respiratory (6)
    { icdCode: "J44.1", icdDescription: "COPD with Acute Exacerbation", category: "Respiratory", requiredEvidence: [
      { type: "vitals", field: "oxygenSaturation", description: "Oxygen saturation documented" },
      { type: "vitals", field: "respiratoryRate", description: "Respiratory rate documented" },
      { type: "medication", description: "COPD medications documented" },
    ]},
    { icdCode: "J45.20", icdDescription: "Mild Intermittent Asthma, Uncomplicated", category: "Respiratory", requiredEvidence: [
      { type: "vitals", field: "oxygenSaturation", description: "Oxygen saturation documented" },
      { type: "medication", description: "Asthma medications documented" },
    ]},
    { icdCode: "J18.9", icdDescription: "Pneumonia, Unspecified Organism", category: "Respiratory", requiredEvidence: [
      { type: "vitals", field: "temperature", description: "Temperature documented" },
      { type: "vitals", field: "respiratoryRate", description: "Respiratory rate documented" },
      { type: "vitals", field: "oxygenSaturation", description: "Oxygen saturation documented" },
    ]},
    { icdCode: "J06.9", icdDescription: "Acute Upper Respiratory Infection, Unspecified", category: "Respiratory", requiredEvidence: [
      { type: "vitals", field: "temperature", description: "Temperature documented" },
    ]},
    { icdCode: "J96.10", icdDescription: "Chronic Respiratory Failure, Unspecified", category: "Respiratory", requiredEvidence: [
      { type: "vitals", field: "oxygenSaturation", description: "Oxygen saturation documented" },
      { type: "medication", description: "Respiratory support medications documented" },
    ]},
    { icdCode: "G47.33", icdDescription: "Obstructive Sleep Apnea", category: "Respiratory", requiredEvidence: [
      { type: "vitals", field: "bmi", description: "BMI documented" },
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    // Musculoskeletal (5)
    { icdCode: "M54.5", icdDescription: "Low Back Pain", category: "Musculoskeletal", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
      { type: "medication", description: "Pain management medications documented" },
    ]},
    { icdCode: "M17.11", icdDescription: "Primary Osteoarthritis, Right Knee", category: "Musculoskeletal", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
      { type: "medication", description: "Osteoarthritis medications documented" },
    ]},
    { icdCode: "M79.3", icdDescription: "Panniculitis, Unspecified", category: "Musculoskeletal", requiredEvidence: [
      { type: "vitals", field: "bmi", description: "BMI documented" },
    ]},
    { icdCode: "M81.0", icdDescription: "Age-related Osteoporosis without Fracture", category: "Musculoskeletal", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
      { type: "medication", description: "Osteoporosis medications documented" },
    ]},
    { icdCode: "M62.81", icdDescription: "Muscle Weakness (Sarcopenia)", category: "Musculoskeletal", requiredEvidence: [
      { type: "vitals", field: "weight", description: "Weight documented" },
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    // Renal (4)
    { icdCode: "N18.3", icdDescription: "Chronic Kidney Disease, Stage 3", category: "Renal", requiredEvidence: [
      { type: "lab", testName: "Creatinine", description: "Creatinine lab result available" },
      { type: "lab", testName: "GFR", description: "GFR lab result available" },
      { type: "medication", description: "Renal medications documented" },
    ]},
    { icdCode: "N18.4", icdDescription: "Chronic Kidney Disease, Stage 4", category: "Renal", requiredEvidence: [
      { type: "lab", testName: "Creatinine", description: "Creatinine lab result available" },
      { type: "lab", testName: "GFR", description: "GFR lab result available" },
      { type: "medication", description: "Renal medications documented" },
    ]},
    { icdCode: "N39.0", icdDescription: "Urinary Tract Infection, Site Not Specified", category: "Renal", requiredEvidence: [
      { type: "vitals", field: "temperature", description: "Temperature documented" },
    ]},
    { icdCode: "N40.0", icdDescription: "Benign Prostatic Hyperplasia without Obstruction", category: "Renal", requiredEvidence: [
      { type: "medication", description: "BPH medications documented" },
    ]},
    // GI (4)
    { icdCode: "K21.0", icdDescription: "GERD with Esophagitis", category: "GI", requiredEvidence: [
      { type: "medication", description: "GERD medications documented" },
    ]},
    { icdCode: "K76.0", icdDescription: "Fatty Liver Disease, Not Elsewhere Classified", category: "GI", requiredEvidence: [
      { type: "lab", testName: "Liver Function", description: "Liver function lab result available" },
      { type: "vitals", field: "bmi", description: "BMI documented" },
    ]},
    { icdCode: "K50.90", icdDescription: "Crohn's Disease, Unspecified, without Complications", category: "GI", requiredEvidence: [
      { type: "medication", description: "Crohn's disease medications documented" },
      { type: "lab", testName: "CRP", description: "Inflammatory marker lab result available" },
    ]},
    { icdCode: "K58.9", icdDescription: "Irritable Bowel Syndrome without Diarrhea", category: "GI", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    // Neurological (5)
    { icdCode: "G30.9", icdDescription: "Alzheimer's Disease, Unspecified", category: "Neurological", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
      { type: "medication", description: "Alzheimer's medications documented" },
    ]},
    { icdCode: "G20", icdDescription: "Parkinson's Disease", category: "Neurological", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
      { type: "medication", description: "Parkinson's medications documented" },
    ]},
    { icdCode: "G40.909", icdDescription: "Epilepsy, Unspecified, Not Intractable", category: "Neurological", requiredEvidence: [
      { type: "medication", description: "Antiepileptic medications documented" },
    ]},
    { icdCode: "G43.909", icdDescription: "Migraine, Unspecified, Not Intractable", category: "Neurological", requiredEvidence: [
      { type: "medication", description: "Migraine medications documented" },
    ]},
    { icdCode: "G89.29", icdDescription: "Other Chronic Pain", category: "Neurological", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
      { type: "medication", description: "Pain management medications documented" },
      { type: "vitals", field: "painLevel", description: "Pain level documented" },
    ]},
    // Social/Other (5)
    { icdCode: "Z87.891", icdDescription: "Personal History of Nicotine Dependence", category: "Social/Other", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "Z79.4", icdDescription: "Long-term (Current) Use of Insulin", category: "Social/Other", requiredEvidence: [
      { type: "medication", description: "Insulin or long-term drug therapy documented" },
    ]},
    { icdCode: "Z96.1", icdDescription: "Presence of Intraocular Lens", category: "Social/Other", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "Z91.19", icdDescription: "Patient's Noncompliance with Other Medical Treatment", category: "Social/Other", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
      { type: "medication", description: "Medication reconciliation completed" },
    ]},
    { icdCode: "Z71.3", icdDescription: "Dietary Counseling and Surveillance", category: "Social/Other", requiredEvidence: [
      { type: "vitals", field: "bmi", description: "BMI documented" },
      { type: "assessment", instrumentId: "PRAPARE", description: "PRAPARE social determinants screening completed" },
    ]},
    // Cancer Screening Related (5)
    { icdCode: "Z12.31", icdDescription: "Encounter for Screening Mammogram", category: "Cancer Screening", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "Z12.11", icdDescription: "Encounter for Screening for Malignant Neoplasm of Colon", category: "Cancer Screening", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "Z80.3", icdDescription: "Family History of Malignant Neoplasm of Breast", category: "Cancer Screening", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
    { icdCode: "Z85.3", icdDescription: "Personal History of Malignant Neoplasm of Breast", category: "Cancer Screening", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
      { type: "medication", description: "Cancer follow-up medications documented" },
    ]},
    { icdCode: "Z85.038", icdDescription: "Personal History of Other Malignant Neoplasm of Large Intestine", category: "Cancer Screening", requiredEvidence: [
      { type: "assessment", instrumentId: "AWV", description: "Annual Wellness Visit assessment completed" },
    ]},
  ];

  for (const rule of diagnosisRulesData) {
    await storage.createDiagnosisRule({
      icdCode: rule.icdCode,
      icdDescription: rule.icdDescription,
      category: rule.category,
      requiredEvidence: rule.requiredEvidence,
      active: true,
    });
  }

  // Visits
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const nextWeekPlusOne = new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0];

  const visit1 = await storage.createVisit({
    memberId: member1.id,
    npUserId: np1.id,
    status: "scheduled",
    scheduledDate: today,
    scheduledTime: "09:00 AM",
    visitType: "annual_wellness",
    planId: "MA-PLAN-001",
    travelNotes: "Single story home, park on street",
    safetyNotes: "Large friendly dog",
  });

  const visit2 = await storage.createVisit({
    memberId: member2.id,
    npUserId: np1.id,
    status: "scheduled",
    scheduledDate: today,
    scheduledTime: "11:30 AM",
    visitType: "annual_wellness",
    planId: "MA-PLAN-001",
    travelNotes: "Apartment building, 2nd floor, elevator available",
    safetyNotes: "Oxygen equipment in use",
  });

  const visit3 = await storage.createVisit({
    memberId: member3.id,
    npUserId: np2.id,
    status: "scheduled",
    scheduledDate: tomorrow,
    scheduledTime: "10:00 AM",
    visitType: "annual_wellness",
    planId: "ACA-PLAN-001",
  });

  // Create required checklists for visits based on plan packs
  const maPlanPack = await storage.getPlanPack("MA-PLAN-001");
  const acaPlanPack = await storage.getPlanPack("ACA-PLAN-001");

  // Visit 1 checklist (MA plan)
  if (maPlanPack) {
    for (const assessmentId of (maPlanPack.requiredAssessments || [])) {
      const def = await storage.getAssessmentDefinition(assessmentId);
      await storage.createChecklistItem({
        visitId: visit1.id,
        itemType: "assessment",
        itemId: assessmentId,
        itemName: def?.name || assessmentId,
        status: "not_started",
      });
    }
    for (const measureId of (maPlanPack.requiredMeasures || [])) {
      const def = await storage.getMeasureDefinition(measureId);
      await storage.createChecklistItem({
        visitId: visit1.id,
        itemType: "measure",
        itemId: measureId,
        itemName: def?.name || measureId,
        status: "not_started",
      });
    }
  }

  // Visit 2 checklist (MA plan)
  if (maPlanPack) {
    for (const assessmentId of (maPlanPack.requiredAssessments || [])) {
      const def = await storage.getAssessmentDefinition(assessmentId);
      await storage.createChecklistItem({
        visitId: visit2.id,
        itemType: "assessment",
        itemId: assessmentId,
        itemName: def?.name || assessmentId,
        status: "not_started",
      });
    }
    for (const measureId of (maPlanPack.requiredMeasures || [])) {
      const def = await storage.getMeasureDefinition(measureId);
      await storage.createChecklistItem({
        visitId: visit2.id,
        itemType: "measure",
        itemId: measureId,
        itemName: def?.name || measureId,
        status: "not_started",
      });
    }
  }

  // Visit 3 checklist (ACA plan)
  if (acaPlanPack) {
    for (const assessmentId of (acaPlanPack.requiredAssessments || [])) {
      const def = await storage.getAssessmentDefinition(assessmentId);
      await storage.createChecklistItem({
        visitId: visit3.id,
        itemType: "assessment",
        itemId: assessmentId,
        itemName: def?.name || assessmentId,
        status: "not_started",
      });
    }
    for (const measureId of (acaPlanPack.requiredMeasures || [])) {
      const def = await storage.getMeasureDefinition(measureId);
      await storage.createChecklistItem({
        visitId: visit3.id,
        itemType: "measure",
        itemId: measureId,
        itemName: def?.name || measureId,
        status: "not_started",
      });
    }
  }

  // Plan targets
  await storage.createPlanTarget({ memberId: member1.id, targetType: "care_gap", description: "HbA1c not tested in 6 months", priority: "high", source: "claims" });
  await storage.createPlanTarget({ memberId: member1.id, targetType: "suspecting", description: "Suspected neuropathy - needs eval", priority: "medium", source: "clinical" });
  await storage.createPlanTarget({ memberId: member2.id, targetType: "care_gap", description: "Colorectal screening overdue", priority: "high", source: "claims" });
  await storage.createPlanTarget({ memberId: member2.id, targetType: "care_gap", description: "Depression follow-up needed", priority: "high", source: "clinical" });
  await storage.createPlanTarget({ memberId: member3.id, targetType: "care_gap", description: "Mammogram not on file for past 2 years", priority: "high", source: "claims" });
  await storage.createPlanTarget({ memberId: member3.id, targetType: "suspecting", description: "Anxiety management review", priority: "medium", source: "clinical" });

  // Sample care plan tasks
  await storage.createTask({
    visitId: visit1.id,
    memberId: member1.id,
    taskType: "lab_order",
    title: "Order HbA1c lab test",
    description: "Schedule HbA1c testing for diabetes management follow-up",
    priority: "high",
    status: "pending",
    dueDate: nextWeek,
  });

  await storage.createTask({
    visitId: visit1.id,
    memberId: member1.id,
    taskType: "referral",
    title: "Refer to podiatrist",
    description: "Referral for diabetic foot exam due to suspected neuropathy",
    priority: "medium",
    status: "pending",
    dueDate: nextWeek,
  });

  // Clinical decision rules
  await storage.createClinicalRule({
    ruleId: "PHQ2_TO_PHQ9",
    name: "PHQ-2 Positive Screen Escalation",
    category: "assessment_escalation",
    triggerSource: "assessment",
    triggerCondition: { instrumentId: "PHQ-2", scoreThreshold: 3, operator: ">=" },
    recommendedAction: "Administer PHQ-9 full depression assessment",
    recommendedItemType: "assessment",
    recommendedItemId: "PHQ-9",
    priority: "high",
    severity: "warning",
    documentationPrompt: "Document PHQ-2 score and rationale for PHQ-9 escalation",
    description: "PHQ-2 score >= 3 indicates positive depression screen requiring full PHQ-9 assessment",
    active: true,
  });

  await storage.createClinicalRule({
    ruleId: "BP_HYPERTENSION_SCREEN",
    name: "Elevated Blood Pressure Alert",
    category: "vitals_alert",
    triggerSource: "vitals",
    triggerCondition: { field: "systolic", threshold: 140, operator: ">=", orCondition: { field: "diastolic", threshold: 90, operator: ">=" } },
    recommendedAction: "Evaluate for hypertension management - consider CBP measure if not already on checklist",
    recommendedItemType: "measure",
    recommendedItemId: "CBP",
    priority: "high",
    severity: "critical",
    documentationPrompt: "Document BP readings, current antihypertensives, and management plan",
    description: "Systolic >= 140 or Diastolic >= 90 indicates hypertension requiring follow-up",
    active: true,
  });

  await storage.createClinicalRule({
    ruleId: "BMI_OBESITY_SCREEN",
    name: "Elevated BMI Alert",
    category: "vitals_alert",
    triggerSource: "vitals",
    triggerCondition: { field: "bmi", threshold: 30, operator: ">=" },
    recommendedAction: "Screen for diabetes risk and consider HbA1c testing",
    recommendedItemType: "measure",
    recommendedItemId: "CDC-A1C",
    priority: "medium",
    severity: "warning",
    documentationPrompt: "Document BMI, dietary assessment, and weight management discussion",
    description: "BMI >= 30 indicates obesity and elevated diabetes risk",
    active: true,
  });

  await storage.createClinicalRule({
    ruleId: "LOW_O2_ALERT",
    name: "Low Oxygen Saturation Alert",
    category: "vitals_alert",
    triggerSource: "vitals",
    triggerCondition: { field: "oxygenSaturation", threshold: 92, operator: "<=" },
    recommendedAction: "Assess respiratory status and consider pulmonary referral",
    priority: "urgent",
    severity: "emergency",
    documentationPrompt: "Document O2 level, respiratory assessment, and immediate interventions taken",
    description: "O2 saturation <= 92% requires immediate respiratory assessment",
    active: true,
  });

  await storage.createClinicalRule({
    ruleId: "HIGH_PAIN_ALERT",
    name: "High Pain Level Alert",
    category: "vitals_alert",
    triggerSource: "vitals",
    triggerCondition: { field: "painLevel", threshold: 7, operator: ">=" },
    recommendedAction: "Perform detailed pain assessment and consider pain management referral",
    priority: "high",
    severity: "critical",
    documentationPrompt: "Document pain location, quality, duration, and pain management plan",
    description: "Pain level >= 7 requires additional pain evaluation",
    active: true,
  });

  await storage.createClinicalRule({
    ruleId: "PRAPARE_HIGH_RISK",
    name: "High Social Risk Referral",
    category: "assessment_escalation",
    triggerSource: "assessment",
    triggerCondition: { instrumentId: "PRAPARE", scoreThreshold: 6, operator: ">=" },
    recommendedAction: "Refer to social services for social determinants of health support",
    priority: "high",
    severity: "warning",
    documentationPrompt: "Document identified social risks and referral resources provided",
    description: "PRAPARE score >= 6 indicates high social risk requiring social services referral",
    active: true,
  });

  await storage.createClinicalRule({
    ruleId: "TACHYCARDIA_ALERT",
    name: "Tachycardia Alert",
    category: "vitals_alert",
    triggerSource: "vitals",
    triggerCondition: { field: "heartRate", threshold: 100, operator: ">=" },
    recommendedAction: "Evaluate for underlying causes of elevated heart rate",
    priority: "medium",
    severity: "warning",
    documentationPrompt: "Document heart rate, rhythm assessment, and contributing factors",
    description: "Heart rate >= 100 bpm indicates tachycardia requiring evaluation",
    active: true,
  });

  await storage.createClinicalRule({
    ruleId: "BRADYCARDIA_ALERT",
    name: "Bradycardia Alert",
    category: "vitals_alert",
    triggerSource: "vitals",
    triggerCondition: { field: "heartRate", threshold: 50, operator: "<=" },
    recommendedAction: "Evaluate for underlying causes of low heart rate, review medications",
    priority: "medium",
    severity: "warning",
    documentationPrompt: "Document heart rate, medication review, and symptom assessment",
    description: "Heart rate <= 50 bpm indicates bradycardia requiring evaluation",
    active: true,
  });

  // Vitals History - 2 years of quarterly readings (8 per member)
  // Dorothy Martinez - Type 2 Diabetes, Hypertension, Osteoarthritis
  await storage.createVitalsHistory({ memberId: member1.id, measureDate: "2024-02-10", systolic: 152, diastolic: 94, heartRate: 76, oxygenSaturation: 97, weight: 172.0, bmi: 28.8, temperature: 98.4, respiratoryRate: 16, source: "practice" });
  await storage.createVitalsHistory({ memberId: member1.id, measureDate: "2024-05-15", systolic: 148, diastolic: 92, heartRate: 74, oxygenSaturation: 96, weight: 171.0, bmi: 28.6, temperature: 98.6, respiratoryRate: 16, source: "hie" });
  await storage.createVitalsHistory({ memberId: member1.id, measureDate: "2024-08-20", systolic: 155, diastolic: 95, heartRate: 78, oxygenSaturation: 97, weight: 173.0, bmi: 29.0, temperature: 98.2, respiratoryRate: 17, source: "practice" });
  await storage.createVitalsHistory({ memberId: member1.id, measureDate: "2024-11-12", systolic: 145, diastolic: 90, heartRate: 72, oxygenSaturation: 98, weight: 170.0, bmi: 28.5, temperature: 98.5, respiratoryRate: 16, source: "hie" });
  await storage.createVitalsHistory({ memberId: member1.id, measureDate: "2025-02-18", systolic: 142, diastolic: 88, heartRate: 75, oxygenSaturation: 97, weight: 169.5, bmi: 28.4, temperature: 98.4, respiratoryRate: 16, source: "practice" });
  await storage.createVitalsHistory({ memberId: member1.id, measureDate: "2025-05-22", systolic: 150, diastolic: 93, heartRate: 77, oxygenSaturation: 96, weight: 171.5, bmi: 28.7, temperature: 98.6, respiratoryRate: 17, source: "hie" });
  await storage.createVitalsHistory({ memberId: member1.id, measureDate: "2025-08-14", systolic: 147, diastolic: 91, heartRate: 73, oxygenSaturation: 97, weight: 170.0, bmi: 28.5, temperature: 98.3, respiratoryRate: 16, source: "practice" });
  await storage.createVitalsHistory({ memberId: member1.id, measureDate: "2025-11-19", systolic: 140, diastolic: 87, heartRate: 74, oxygenSaturation: 98, weight: 168.0, bmi: 28.1, temperature: 98.5, respiratoryRate: 16, source: "practice" });

  // Harold Washington - COPD, CHF, Depression
  await storage.createVitalsHistory({ memberId: member2.id, measureDate: "2024-02-08", systolic: 140, diastolic: 88, heartRate: 88, oxygenSaturation: 92, weight: 202.0, bmi: 29.0, temperature: 98.4, respiratoryRate: 20, source: "practice" });
  await storage.createVitalsHistory({ memberId: member2.id, measureDate: "2024-05-10", systolic: 138, diastolic: 85, heartRate: 90, oxygenSaturation: 91, weight: 200.0, bmi: 28.7, temperature: 98.6, respiratoryRate: 21, source: "hie" });
  await storage.createVitalsHistory({ memberId: member2.id, measureDate: "2024-08-15", systolic: 145, diastolic: 90, heartRate: 92, oxygenSaturation: 90, weight: 204.0, bmi: 29.3, temperature: 98.2, respiratoryRate: 22, source: "practice" });
  await storage.createVitalsHistory({ memberId: member2.id, measureDate: "2024-11-20", systolic: 135, diastolic: 84, heartRate: 86, oxygenSaturation: 93, weight: 198.0, bmi: 28.4, temperature: 98.5, respiratoryRate: 20, source: "hie" });
  await storage.createVitalsHistory({ memberId: member2.id, measureDate: "2025-02-12", systolic: 142, diastolic: 87, heartRate: 89, oxygenSaturation: 91, weight: 201.0, bmi: 28.9, temperature: 98.3, respiratoryRate: 21, source: "practice" });
  await storage.createVitalsHistory({ memberId: member2.id, measureDate: "2025-05-18", systolic: 130, diastolic: 82, heartRate: 85, oxygenSaturation: 94, weight: 197.0, bmi: 28.3, temperature: 98.6, respiratoryRate: 19, source: "hie" });
  await storage.createVitalsHistory({ memberId: member2.id, measureDate: "2025-08-22", systolic: 137, diastolic: 86, heartRate: 91, oxygenSaturation: 92, weight: 199.0, bmi: 28.6, temperature: 98.4, respiratoryRate: 20, source: "practice" });
  await storage.createVitalsHistory({ memberId: member2.id, measureDate: "2025-11-15", systolic: 133, diastolic: 83, heartRate: 87, oxygenSaturation: 93, weight: 198.5, bmi: 28.5, temperature: 98.5, respiratoryRate: 20, source: "practice" });

  // Margaret Thompson - Breast cancer (remission), Hypothyroidism, Anxiety
  await storage.createVitalsHistory({ memberId: member3.id, measureDate: "2024-02-14", systolic: 124, diastolic: 78, heartRate: 72, oxygenSaturation: 98, weight: 146.0, bmi: 24.3, temperature: 98.4, respiratoryRate: 15, source: "practice" });
  await storage.createVitalsHistory({ memberId: member3.id, measureDate: "2024-05-20", systolic: 128, diastolic: 80, heartRate: 70, oxygenSaturation: 99, weight: 145.0, bmi: 24.2, temperature: 98.6, respiratoryRate: 16, source: "hie" });
  await storage.createVitalsHistory({ memberId: member3.id, measureDate: "2024-08-12", systolic: 122, diastolic: 76, heartRate: 74, oxygenSaturation: 98, weight: 144.5, bmi: 24.1, temperature: 98.3, respiratoryRate: 15, source: "practice" });
  await storage.createVitalsHistory({ memberId: member3.id, measureDate: "2024-11-18", systolic: 130, diastolic: 82, heartRate: 71, oxygenSaturation: 97, weight: 146.0, bmi: 24.3, temperature: 98.5, respiratoryRate: 16, source: "hie" });
  await storage.createVitalsHistory({ memberId: member3.id, measureDate: "2025-02-20", systolic: 126, diastolic: 79, heartRate: 73, oxygenSaturation: 98, weight: 145.5, bmi: 24.2, temperature: 98.4, respiratoryRate: 15, source: "practice" });
  await storage.createVitalsHistory({ memberId: member3.id, measureDate: "2025-05-15", systolic: 120, diastolic: 75, heartRate: 69, oxygenSaturation: 99, weight: 144.0, bmi: 24.0, temperature: 98.6, respiratoryRate: 16, source: "hie" });
  await storage.createVitalsHistory({ memberId: member3.id, measureDate: "2025-08-18", systolic: 125, diastolic: 77, heartRate: 72, oxygenSaturation: 98, weight: 145.0, bmi: 24.2, temperature: 98.3, respiratoryRate: 15, source: "practice" });
  await storage.createVitalsHistory({ memberId: member3.id, measureDate: "2025-11-22", systolic: 123, diastolic: 78, heartRate: 71, oxygenSaturation: 99, weight: 145.5, bmi: 24.2, temperature: 98.5, respiratoryRate: 16, source: "practice" });

  // Lab Results - 2 years of quarterly condition-appropriate labs
  // Dorothy Martinez labs - diabetes, metabolic, lipid, renal
  await storage.createLabResult({ memberId: member1.id, testName: "Hemoglobin A1c", testCode: "4548-4", value: 8.1, unit: "%", referenceMin: 4.0, referenceMax: 5.6, status: "high", source: "practice", collectedDate: "2024-02-10", resultDate: "2024-02-12", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Fasting Glucose", testCode: "1558-6", value: 162, unit: "mg/dL", referenceMin: 70, referenceMax: 100, status: "high", source: "practice", collectedDate: "2024-02-10", resultDate: "2024-02-12", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Total Cholesterol", testCode: "2093-3", value: 218, unit: "mg/dL", referenceMin: 0, referenceMax: 200, status: "high", source: "practice", collectedDate: "2024-02-10", resultDate: "2024-02-12", orderingProvider: "Dr. James Wilson", category: "lipid" });
  await storage.createLabResult({ memberId: member1.id, testName: "LDL Cholesterol", testCode: "2089-1", value: 138, unit: "mg/dL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2024-02-10", resultDate: "2024-02-12", orderingProvider: "Dr. James Wilson", category: "lipid" });
  await storage.createLabResult({ memberId: member1.id, testName: "HDL Cholesterol", testCode: "2085-9", value: 42, unit: "mg/dL", referenceMin: 40, referenceMax: 60, status: "normal", source: "practice", collectedDate: "2024-02-10", resultDate: "2024-02-12", orderingProvider: "Dr. James Wilson", category: "lipid" });
  await storage.createLabResult({ memberId: member1.id, testName: "Triglycerides", testCode: "2571-8", value: 190, unit: "mg/dL", referenceMin: 0, referenceMax: 150, status: "high", source: "practice", collectedDate: "2024-02-10", resultDate: "2024-02-12", orderingProvider: "Dr. James Wilson", category: "lipid" });
  await storage.createLabResult({ memberId: member1.id, testName: "Creatinine", testCode: "2160-0", value: 1.1, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.2, status: "normal", source: "practice", collectedDate: "2024-02-10", resultDate: "2024-02-12", orderingProvider: "Dr. James Wilson", category: "renal" });
  await storage.createLabResult({ memberId: member1.id, testName: "BUN", testCode: "3094-0", value: 18, unit: "mg/dL", referenceMin: 7, referenceMax: 20, status: "normal", source: "practice", collectedDate: "2024-02-10", resultDate: "2024-02-12", orderingProvider: "Dr. James Wilson", category: "metabolic" });
  await storage.createLabResult({ memberId: member1.id, testName: "eGFR", testCode: "33914-3", value: 72, unit: "mL/min/1.73m2", referenceMin: 60, referenceMax: 120, status: "normal", source: "practice", collectedDate: "2024-02-10", resultDate: "2024-02-12", orderingProvider: "Dr. James Wilson", category: "renal" });

  await storage.createLabResult({ memberId: member1.id, testName: "Hemoglobin A1c", testCode: "4548-4", value: 7.8, unit: "%", referenceMin: 4.0, referenceMax: 5.6, status: "high", source: "hie", collectedDate: "2024-05-15", resultDate: "2024-05-17", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Fasting Glucose", testCode: "1558-6", value: 148, unit: "mg/dL", referenceMin: 70, referenceMax: 100, status: "high", source: "hie", collectedDate: "2024-05-15", resultDate: "2024-05-17", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Sodium", testCode: "2951-2", value: 140, unit: "mEq/L", referenceMin: 136, referenceMax: 145, status: "normal", source: "hie", collectedDate: "2024-05-15", resultDate: "2024-05-17", orderingProvider: "Dr. James Wilson", category: "metabolic" });
  await storage.createLabResult({ memberId: member1.id, testName: "Potassium", testCode: "2823-3", value: 4.2, unit: "mEq/L", referenceMin: 3.5, referenceMax: 5.0, status: "normal", source: "hie", collectedDate: "2024-05-15", resultDate: "2024-05-17", orderingProvider: "Dr. James Wilson", category: "metabolic" });

  await storage.createLabResult({ memberId: member1.id, testName: "Hemoglobin A1c", testCode: "4548-4", value: 7.4, unit: "%", referenceMin: 4.0, referenceMax: 5.6, status: "high", source: "practice", collectedDate: "2024-08-20", resultDate: "2024-08-22", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Fasting Glucose", testCode: "1558-6", value: 140, unit: "mg/dL", referenceMin: 70, referenceMax: 100, status: "high", source: "practice", collectedDate: "2024-08-20", resultDate: "2024-08-22", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Total Cholesterol", testCode: "2093-3", value: 210, unit: "mg/dL", referenceMin: 0, referenceMax: 200, status: "high", source: "practice", collectedDate: "2024-08-20", resultDate: "2024-08-22", orderingProvider: "Dr. James Wilson", category: "lipid" });
  await storage.createLabResult({ memberId: member1.id, testName: "LDL Cholesterol", testCode: "2089-1", value: 128, unit: "mg/dL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2024-08-20", resultDate: "2024-08-22", orderingProvider: "Dr. James Wilson", category: "lipid" });
  await storage.createLabResult({ memberId: member1.id, testName: "eGFR", testCode: "33914-3", value: 68, unit: "mL/min/1.73m2", referenceMin: 60, referenceMax: 120, status: "normal", source: "practice", collectedDate: "2024-08-20", resultDate: "2024-08-22", orderingProvider: "Dr. James Wilson", category: "renal" });

  await storage.createLabResult({ memberId: member1.id, testName: "Hemoglobin A1c", testCode: "4548-4", value: 7.2, unit: "%", referenceMin: 4.0, referenceMax: 5.6, status: "high", source: "hie", collectedDate: "2024-11-12", resultDate: "2024-11-14", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Fasting Glucose", testCode: "1558-6", value: 135, unit: "mg/dL", referenceMin: 70, referenceMax: 100, status: "high", source: "hie", collectedDate: "2024-11-12", resultDate: "2024-11-14", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Creatinine", testCode: "2160-0", value: 1.0, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.2, status: "normal", source: "hie", collectedDate: "2024-11-12", resultDate: "2024-11-14", orderingProvider: "Dr. James Wilson", category: "renal" });

  await storage.createLabResult({ memberId: member1.id, testName: "Hemoglobin A1c", testCode: "4548-4", value: 7.0, unit: "%", referenceMin: 4.0, referenceMax: 5.6, status: "high", source: "practice", collectedDate: "2025-02-18", resultDate: "2025-02-20", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Fasting Glucose", testCode: "1558-6", value: 130, unit: "mg/dL", referenceMin: 70, referenceMax: 100, status: "high", source: "practice", collectedDate: "2025-02-18", resultDate: "2025-02-20", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Total Cholesterol", testCode: "2093-3", value: 205, unit: "mg/dL", referenceMin: 0, referenceMax: 200, status: "high", source: "practice", collectedDate: "2025-02-18", resultDate: "2025-02-20", orderingProvider: "Dr. James Wilson", category: "lipid" });
  await storage.createLabResult({ memberId: member1.id, testName: "LDL Cholesterol", testCode: "2089-1", value: 120, unit: "mg/dL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2025-02-18", resultDate: "2025-02-20", orderingProvider: "Dr. James Wilson", category: "lipid" });
  await storage.createLabResult({ memberId: member1.id, testName: "HDL Cholesterol", testCode: "2085-9", value: 45, unit: "mg/dL", referenceMin: 40, referenceMax: 60, status: "normal", source: "practice", collectedDate: "2025-02-18", resultDate: "2025-02-20", orderingProvider: "Dr. James Wilson", category: "lipid" });
  await storage.createLabResult({ memberId: member1.id, testName: "Triglycerides", testCode: "2571-8", value: 175, unit: "mg/dL", referenceMin: 0, referenceMax: 150, status: "high", source: "practice", collectedDate: "2025-02-18", resultDate: "2025-02-20", orderingProvider: "Dr. James Wilson", category: "lipid" });
  await storage.createLabResult({ memberId: member1.id, testName: "eGFR", testCode: "33914-3", value: 70, unit: "mL/min/1.73m2", referenceMin: 60, referenceMax: 120, status: "normal", source: "practice", collectedDate: "2025-02-18", resultDate: "2025-02-20", orderingProvider: "Dr. James Wilson", category: "renal" });

  await storage.createLabResult({ memberId: member1.id, testName: "Hemoglobin A1c", testCode: "4548-4", value: 6.8, unit: "%", referenceMin: 4.0, referenceMax: 5.6, status: "high", source: "hie", collectedDate: "2025-05-22", resultDate: "2025-05-24", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Fasting Glucose", testCode: "1558-6", value: 125, unit: "mg/dL", referenceMin: 70, referenceMax: 100, status: "high", source: "hie", collectedDate: "2025-05-22", resultDate: "2025-05-24", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "BUN", testCode: "3094-0", value: 16, unit: "mg/dL", referenceMin: 7, referenceMax: 20, status: "normal", source: "hie", collectedDate: "2025-05-22", resultDate: "2025-05-24", orderingProvider: "Dr. James Wilson", category: "metabolic" });

  await storage.createLabResult({ memberId: member1.id, testName: "Hemoglobin A1c", testCode: "4548-4", value: 6.9, unit: "%", referenceMin: 4.0, referenceMax: 5.6, status: "high", source: "practice", collectedDate: "2025-08-14", resultDate: "2025-08-16", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Fasting Glucose", testCode: "1558-6", value: 128, unit: "mg/dL", referenceMin: 70, referenceMax: 100, status: "high", source: "practice", collectedDate: "2025-08-14", resultDate: "2025-08-16", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Total Cholesterol", testCode: "2093-3", value: 198, unit: "mg/dL", referenceMin: 0, referenceMax: 200, status: "normal", source: "practice", collectedDate: "2025-08-14", resultDate: "2025-08-16", orderingProvider: "Dr. James Wilson", category: "lipid" });
  await storage.createLabResult({ memberId: member1.id, testName: "LDL Cholesterol", testCode: "2089-1", value: 112, unit: "mg/dL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2025-08-14", resultDate: "2025-08-16", orderingProvider: "Dr. James Wilson", category: "lipid" });

  await storage.createLabResult({ memberId: member1.id, testName: "Hemoglobin A1c", testCode: "4548-4", value: 6.5, unit: "%", referenceMin: 4.0, referenceMax: 5.6, status: "high", source: "practice", collectedDate: "2025-11-19", resultDate: "2025-11-21", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Fasting Glucose", testCode: "1558-6", value: 118, unit: "mg/dL", referenceMin: 70, referenceMax: 100, status: "high", source: "practice", collectedDate: "2025-11-19", resultDate: "2025-11-21", orderingProvider: "Dr. James Wilson", category: "diabetes" });
  await storage.createLabResult({ memberId: member1.id, testName: "Creatinine", testCode: "2160-0", value: 1.0, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.2, status: "normal", source: "practice", collectedDate: "2025-11-19", resultDate: "2025-11-21", orderingProvider: "Dr. James Wilson", category: "renal" });
  await storage.createLabResult({ memberId: member1.id, testName: "eGFR", testCode: "33914-3", value: 74, unit: "mL/min/1.73m2", referenceMin: 60, referenceMax: 120, status: "normal", source: "practice", collectedDate: "2025-11-19", resultDate: "2025-11-21", orderingProvider: "Dr. James Wilson", category: "renal" });
  await storage.createLabResult({ memberId: member1.id, testName: "Sodium", testCode: "2951-2", value: 141, unit: "mEq/L", referenceMin: 136, referenceMax: 145, status: "normal", source: "practice", collectedDate: "2025-11-19", resultDate: "2025-11-21", orderingProvider: "Dr. James Wilson", category: "metabolic" });
  await storage.createLabResult({ memberId: member1.id, testName: "Potassium", testCode: "2823-3", value: 4.4, unit: "mEq/L", referenceMin: 3.5, referenceMax: 5.0, status: "normal", source: "practice", collectedDate: "2025-11-19", resultDate: "2025-11-21", orderingProvider: "Dr. James Wilson", category: "metabolic" });

  // Harold Washington labs - cardiac, hematology, metabolic, lipid, thyroid
  await storage.createLabResult({ memberId: member2.id, testName: "BNP", testCode: "42637-9", value: 450, unit: "pg/mL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2024-02-08", resultDate: "2024-02-10", orderingProvider: "Dr. Maria Garcia", category: "cardiac" });
  await storage.createLabResult({ memberId: member2.id, testName: "Hemoglobin", testCode: "718-7", value: 13.2, unit: "g/dL", referenceMin: 13.5, referenceMax: 17.5, status: "low", source: "practice", collectedDate: "2024-02-08", resultDate: "2024-02-10", orderingProvider: "Dr. Maria Garcia", category: "hematology" });
  await storage.createLabResult({ memberId: member2.id, testName: "WBC", testCode: "6690-2", value: 7.8, unit: "K/uL", referenceMin: 4.5, referenceMax: 11.0, status: "normal", source: "practice", collectedDate: "2024-02-08", resultDate: "2024-02-10", orderingProvider: "Dr. Maria Garcia", category: "hematology" });
  await storage.createLabResult({ memberId: member2.id, testName: "Creatinine", testCode: "2160-0", value: 1.3, unit: "mg/dL", referenceMin: 0.7, referenceMax: 1.3, status: "normal", source: "practice", collectedDate: "2024-02-08", resultDate: "2024-02-10", orderingProvider: "Dr. Maria Garcia", category: "metabolic" });
  await storage.createLabResult({ memberId: member2.id, testName: "Total Cholesterol", testCode: "2093-3", value: 225, unit: "mg/dL", referenceMin: 0, referenceMax: 200, status: "high", source: "practice", collectedDate: "2024-02-08", resultDate: "2024-02-10", orderingProvider: "Dr. Maria Garcia", category: "lipid" });
  await storage.createLabResult({ memberId: member2.id, testName: "TSH", testCode: "3016-3", value: 2.8, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, status: "normal", source: "practice", collectedDate: "2024-02-08", resultDate: "2024-02-10", orderingProvider: "Dr. Maria Garcia", category: "thyroid" });

  await storage.createLabResult({ memberId: member2.id, testName: "BNP", testCode: "42637-9", value: 420, unit: "pg/mL", referenceMin: 0, referenceMax: 100, status: "high", source: "hie", collectedDate: "2024-05-10", resultDate: "2024-05-12", orderingProvider: "Dr. Maria Garcia", category: "cardiac" });
  await storage.createLabResult({ memberId: member2.id, testName: "Sodium", testCode: "2951-2", value: 138, unit: "mEq/L", referenceMin: 136, referenceMax: 145, status: "normal", source: "hie", collectedDate: "2024-05-10", resultDate: "2024-05-12", orderingProvider: "Dr. Maria Garcia", category: "metabolic" });
  await storage.createLabResult({ memberId: member2.id, testName: "Potassium", testCode: "2823-3", value: 4.5, unit: "mEq/L", referenceMin: 3.5, referenceMax: 5.0, status: "normal", source: "hie", collectedDate: "2024-05-10", resultDate: "2024-05-12", orderingProvider: "Dr. Maria Garcia", category: "metabolic" });

  await storage.createLabResult({ memberId: member2.id, testName: "BNP", testCode: "42637-9", value: 380, unit: "pg/mL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2024-08-15", resultDate: "2024-08-17", orderingProvider: "Dr. Maria Garcia", category: "cardiac" });
  await storage.createLabResult({ memberId: member2.id, testName: "Hemoglobin", testCode: "718-7", value: 13.5, unit: "g/dL", referenceMin: 13.5, referenceMax: 17.5, status: "normal", source: "practice", collectedDate: "2024-08-15", resultDate: "2024-08-17", orderingProvider: "Dr. Maria Garcia", category: "hematology" });
  await storage.createLabResult({ memberId: member2.id, testName: "LDL Cholesterol", testCode: "2089-1", value: 142, unit: "mg/dL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2024-08-15", resultDate: "2024-08-17", orderingProvider: "Dr. Maria Garcia", category: "lipid" });

  await storage.createLabResult({ memberId: member2.id, testName: "BNP", testCode: "42637-9", value: 340, unit: "pg/mL", referenceMin: 0, referenceMax: 100, status: "high", source: "hie", collectedDate: "2024-11-20", resultDate: "2024-11-22", orderingProvider: "Dr. Maria Garcia", category: "cardiac" });
  await storage.createLabResult({ memberId: member2.id, testName: "Creatinine", testCode: "2160-0", value: 1.2, unit: "mg/dL", referenceMin: 0.7, referenceMax: 1.3, status: "normal", source: "hie", collectedDate: "2024-11-20", resultDate: "2024-11-22", orderingProvider: "Dr. Maria Garcia", category: "metabolic" });
  await storage.createLabResult({ memberId: member2.id, testName: "TSH", testCode: "3016-3", value: 3.1, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, status: "normal", source: "hie", collectedDate: "2024-11-20", resultDate: "2024-11-22", orderingProvider: "Dr. Maria Garcia", category: "thyroid" });

  await storage.createLabResult({ memberId: member2.id, testName: "BNP", testCode: "42637-9", value: 310, unit: "pg/mL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2025-02-12", resultDate: "2025-02-14", orderingProvider: "Dr. Maria Garcia", category: "cardiac" });
  await storage.createLabResult({ memberId: member2.id, testName: "Hemoglobin", testCode: "718-7", value: 13.8, unit: "g/dL", referenceMin: 13.5, referenceMax: 17.5, status: "normal", source: "practice", collectedDate: "2025-02-12", resultDate: "2025-02-14", orderingProvider: "Dr. Maria Garcia", category: "hematology" });
  await storage.createLabResult({ memberId: member2.id, testName: "WBC", testCode: "6690-2", value: 8.1, unit: "K/uL", referenceMin: 4.5, referenceMax: 11.0, status: "normal", source: "practice", collectedDate: "2025-02-12", resultDate: "2025-02-14", orderingProvider: "Dr. Maria Garcia", category: "hematology" });
  await storage.createLabResult({ memberId: member2.id, testName: "Total Cholesterol", testCode: "2093-3", value: 212, unit: "mg/dL", referenceMin: 0, referenceMax: 200, status: "high", source: "practice", collectedDate: "2025-02-12", resultDate: "2025-02-14", orderingProvider: "Dr. Maria Garcia", category: "lipid" });
  await storage.createLabResult({ memberId: member2.id, testName: "LDL Cholesterol", testCode: "2089-1", value: 130, unit: "mg/dL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2025-02-12", resultDate: "2025-02-14", orderingProvider: "Dr. Maria Garcia", category: "lipid" });

  await storage.createLabResult({ memberId: member2.id, testName: "BNP", testCode: "42637-9", value: 290, unit: "pg/mL", referenceMin: 0, referenceMax: 100, status: "high", source: "hie", collectedDate: "2025-05-18", resultDate: "2025-05-20", orderingProvider: "Dr. Maria Garcia", category: "cardiac" });
  await storage.createLabResult({ memberId: member2.id, testName: "Sodium", testCode: "2951-2", value: 139, unit: "mEq/L", referenceMin: 136, referenceMax: 145, status: "normal", source: "hie", collectedDate: "2025-05-18", resultDate: "2025-05-20", orderingProvider: "Dr. Maria Garcia", category: "metabolic" });

  await storage.createLabResult({ memberId: member2.id, testName: "BNP", testCode: "42637-9", value: 275, unit: "pg/mL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2025-08-22", resultDate: "2025-08-24", orderingProvider: "Dr. Maria Garcia", category: "cardiac" });
  await storage.createLabResult({ memberId: member2.id, testName: "Hemoglobin", testCode: "718-7", value: 14.0, unit: "g/dL", referenceMin: 13.5, referenceMax: 17.5, status: "normal", source: "practice", collectedDate: "2025-08-22", resultDate: "2025-08-24", orderingProvider: "Dr. Maria Garcia", category: "hematology" });
  await storage.createLabResult({ memberId: member2.id, testName: "Creatinine", testCode: "2160-0", value: 1.1, unit: "mg/dL", referenceMin: 0.7, referenceMax: 1.3, status: "normal", source: "practice", collectedDate: "2025-08-22", resultDate: "2025-08-24", orderingProvider: "Dr. Maria Garcia", category: "metabolic" });

  await storage.createLabResult({ memberId: member2.id, testName: "BNP", testCode: "42637-9", value: 260, unit: "pg/mL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2025-11-15", resultDate: "2025-11-17", orderingProvider: "Dr. Maria Garcia", category: "cardiac" });
  await storage.createLabResult({ memberId: member2.id, testName: "Total Cholesterol", testCode: "2093-3", value: 200, unit: "mg/dL", referenceMin: 0, referenceMax: 200, status: "normal", source: "practice", collectedDate: "2025-11-15", resultDate: "2025-11-17", orderingProvider: "Dr. Maria Garcia", category: "lipid" });
  await storage.createLabResult({ memberId: member2.id, testName: "TSH", testCode: "3016-3", value: 2.5, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, status: "normal", source: "practice", collectedDate: "2025-11-15", resultDate: "2025-11-17", orderingProvider: "Dr. Maria Garcia", category: "thyroid" });

  // Margaret Thompson labs - thyroid, hematology, metabolic, lipid, cancer marker
  await storage.createLabResult({ memberId: member3.id, testName: "TSH", testCode: "3016-3", value: 4.8, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, status: "high", source: "practice", collectedDate: "2024-02-14", resultDate: "2024-02-16", orderingProvider: "Dr. David Lee", category: "thyroid" });
  await storage.createLabResult({ memberId: member3.id, testName: "Hemoglobin", testCode: "718-7", value: 12.8, unit: "g/dL", referenceMin: 12.0, referenceMax: 16.0, status: "normal", source: "practice", collectedDate: "2024-02-14", resultDate: "2024-02-16", orderingProvider: "Dr. David Lee", category: "hematology" });
  await storage.createLabResult({ memberId: member3.id, testName: "WBC", testCode: "6690-2", value: 6.5, unit: "K/uL", referenceMin: 4.5, referenceMax: 11.0, status: "normal", source: "practice", collectedDate: "2024-02-14", resultDate: "2024-02-16", orderingProvider: "Dr. David Lee", category: "hematology" });
  await storage.createLabResult({ memberId: member3.id, testName: "Total Cholesterol", testCode: "2093-3", value: 195, unit: "mg/dL", referenceMin: 0, referenceMax: 200, status: "normal", source: "practice", collectedDate: "2024-02-14", resultDate: "2024-02-16", orderingProvider: "Dr. David Lee", category: "lipid" });
  await storage.createLabResult({ memberId: member3.id, testName: "CA-125", testCode: "11051-0", value: 18, unit: "U/mL", referenceMin: 0, referenceMax: 35, status: "normal", source: "practice", collectedDate: "2024-02-14", resultDate: "2024-02-16", orderingProvider: "Dr. David Lee", category: "metabolic" });

  await storage.createLabResult({ memberId: member3.id, testName: "TSH", testCode: "3016-3", value: 3.5, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, status: "normal", source: "hie", collectedDate: "2024-05-20", resultDate: "2024-05-22", orderingProvider: "Dr. David Lee", category: "thyroid" });
  await storage.createLabResult({ memberId: member3.id, testName: "Sodium", testCode: "2951-2", value: 140, unit: "mEq/L", referenceMin: 136, referenceMax: 145, status: "normal", source: "hie", collectedDate: "2024-05-20", resultDate: "2024-05-22", orderingProvider: "Dr. David Lee", category: "metabolic" });
  await storage.createLabResult({ memberId: member3.id, testName: "Potassium", testCode: "2823-3", value: 4.1, unit: "mEq/L", referenceMin: 3.5, referenceMax: 5.0, status: "normal", source: "hie", collectedDate: "2024-05-20", resultDate: "2024-05-22", orderingProvider: "Dr. David Lee", category: "metabolic" });
  await storage.createLabResult({ memberId: member3.id, testName: "Creatinine", testCode: "2160-0", value: 0.8, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.1, status: "normal", source: "hie", collectedDate: "2024-05-20", resultDate: "2024-05-22", orderingProvider: "Dr. David Lee", category: "metabolic" });

  await storage.createLabResult({ memberId: member3.id, testName: "TSH", testCode: "3016-3", value: 3.2, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, status: "normal", source: "practice", collectedDate: "2024-08-12", resultDate: "2024-08-14", orderingProvider: "Dr. David Lee", category: "thyroid" });
  await storage.createLabResult({ memberId: member3.id, testName: "Hemoglobin", testCode: "718-7", value: 13.0, unit: "g/dL", referenceMin: 12.0, referenceMax: 16.0, status: "normal", source: "practice", collectedDate: "2024-08-12", resultDate: "2024-08-14", orderingProvider: "Dr. David Lee", category: "hematology" });
  await storage.createLabResult({ memberId: member3.id, testName: "CA-125", testCode: "11051-0", value: 15, unit: "U/mL", referenceMin: 0, referenceMax: 35, status: "normal", source: "practice", collectedDate: "2024-08-12", resultDate: "2024-08-14", orderingProvider: "Dr. David Lee", category: "metabolic" });
  await storage.createLabResult({ memberId: member3.id, testName: "LDL Cholesterol", testCode: "2089-1", value: 108, unit: "mg/dL", referenceMin: 0, referenceMax: 100, status: "high", source: "practice", collectedDate: "2024-08-12", resultDate: "2024-08-14", orderingProvider: "Dr. David Lee", category: "lipid" });

  await storage.createLabResult({ memberId: member3.id, testName: "TSH", testCode: "3016-3", value: 2.8, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, status: "normal", source: "hie", collectedDate: "2024-11-18", resultDate: "2024-11-20", orderingProvider: "Dr. David Lee", category: "thyroid" });
  await storage.createLabResult({ memberId: member3.id, testName: "Total Cholesterol", testCode: "2093-3", value: 188, unit: "mg/dL", referenceMin: 0, referenceMax: 200, status: "normal", source: "hie", collectedDate: "2024-11-18", resultDate: "2024-11-20", orderingProvider: "Dr. David Lee", category: "lipid" });

  await storage.createLabResult({ memberId: member3.id, testName: "TSH", testCode: "3016-3", value: 2.5, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, status: "normal", source: "practice", collectedDate: "2025-02-20", resultDate: "2025-02-22", orderingProvider: "Dr. David Lee", category: "thyroid" });
  await storage.createLabResult({ memberId: member3.id, testName: "Hemoglobin", testCode: "718-7", value: 13.2, unit: "g/dL", referenceMin: 12.0, referenceMax: 16.0, status: "normal", source: "practice", collectedDate: "2025-02-20", resultDate: "2025-02-22", orderingProvider: "Dr. David Lee", category: "hematology" });
  await storage.createLabResult({ memberId: member3.id, testName: "WBC", testCode: "6690-2", value: 6.8, unit: "K/uL", referenceMin: 4.5, referenceMax: 11.0, status: "normal", source: "practice", collectedDate: "2025-02-20", resultDate: "2025-02-22", orderingProvider: "Dr. David Lee", category: "hematology" });
  await storage.createLabResult({ memberId: member3.id, testName: "CA-125", testCode: "11051-0", value: 12, unit: "U/mL", referenceMin: 0, referenceMax: 35, status: "normal", source: "practice", collectedDate: "2025-02-20", resultDate: "2025-02-22", orderingProvider: "Dr. David Lee", category: "metabolic" });
  await storage.createLabResult({ memberId: member3.id, testName: "Total Cholesterol", testCode: "2093-3", value: 182, unit: "mg/dL", referenceMin: 0, referenceMax: 200, status: "normal", source: "practice", collectedDate: "2025-02-20", resultDate: "2025-02-22", orderingProvider: "Dr. David Lee", category: "lipid" });
  await storage.createLabResult({ memberId: member3.id, testName: "LDL Cholesterol", testCode: "2089-1", value: 98, unit: "mg/dL", referenceMin: 0, referenceMax: 100, status: "normal", source: "practice", collectedDate: "2025-02-20", resultDate: "2025-02-22", orderingProvider: "Dr. David Lee", category: "lipid" });
  await storage.createLabResult({ memberId: member3.id, testName: "HDL Cholesterol", testCode: "2085-9", value: 58, unit: "mg/dL", referenceMin: 40, referenceMax: 60, status: "normal", source: "practice", collectedDate: "2025-02-20", resultDate: "2025-02-22", orderingProvider: "Dr. David Lee", category: "lipid" });

  await storage.createLabResult({ memberId: member3.id, testName: "TSH", testCode: "3016-3", value: 2.3, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, status: "normal", source: "hie", collectedDate: "2025-05-15", resultDate: "2025-05-17", orderingProvider: "Dr. David Lee", category: "thyroid" });
  await storage.createLabResult({ memberId: member3.id, testName: "Creatinine", testCode: "2160-0", value: 0.7, unit: "mg/dL", referenceMin: 0.6, referenceMax: 1.1, status: "normal", source: "hie", collectedDate: "2025-05-15", resultDate: "2025-05-17", orderingProvider: "Dr. David Lee", category: "metabolic" });

  await storage.createLabResult({ memberId: member3.id, testName: "TSH", testCode: "3016-3", value: 2.4, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, status: "normal", source: "practice", collectedDate: "2025-08-18", resultDate: "2025-08-20", orderingProvider: "Dr. David Lee", category: "thyroid" });
  await storage.createLabResult({ memberId: member3.id, testName: "Hemoglobin", testCode: "718-7", value: 13.1, unit: "g/dL", referenceMin: 12.0, referenceMax: 16.0, status: "normal", source: "practice", collectedDate: "2025-08-18", resultDate: "2025-08-20", orderingProvider: "Dr. David Lee", category: "hematology" });
  await storage.createLabResult({ memberId: member3.id, testName: "CA-125", testCode: "11051-0", value: 10, unit: "U/mL", referenceMin: 0, referenceMax: 35, status: "normal", source: "practice", collectedDate: "2025-08-18", resultDate: "2025-08-20", orderingProvider: "Dr. David Lee", category: "metabolic" });

  await storage.createLabResult({ memberId: member3.id, testName: "TSH", testCode: "3016-3", value: 2.2, unit: "mIU/L", referenceMin: 0.4, referenceMax: 4.0, status: "normal", source: "practice", collectedDate: "2025-11-22", resultDate: "2025-11-24", orderingProvider: "Dr. David Lee", category: "thyroid" });
  await storage.createLabResult({ memberId: member3.id, testName: "Total Cholesterol", testCode: "2093-3", value: 178, unit: "mg/dL", referenceMin: 0, referenceMax: 200, status: "normal", source: "practice", collectedDate: "2025-11-22", resultDate: "2025-11-24", orderingProvider: "Dr. David Lee", category: "lipid" });
  await storage.createLabResult({ memberId: member3.id, testName: "Sodium", testCode: "2951-2", value: 141, unit: "mEq/L", referenceMin: 136, referenceMax: 145, status: "normal", source: "practice", collectedDate: "2025-11-22", resultDate: "2025-11-24", orderingProvider: "Dr. David Lee", category: "metabolic" });
  await storage.createLabResult({ memberId: member3.id, testName: "Potassium", testCode: "2823-3", value: 4.0, unit: "mEq/L", referenceMin: 3.5, referenceMax: 5.0, status: "normal", source: "practice", collectedDate: "2025-11-22", resultDate: "2025-11-24", orderingProvider: "Dr. David Lee", category: "metabolic" });

  // Medication History
  // Dorothy Martinez medications
  await storage.createMedicationHistory({ memberId: member1.id, medicationName: "Metformin", genericName: "Metformin HCl", dosage: "500mg", frequency: "Twice daily", route: "oral", prescriber: "Dr. James Wilson", startDate: "2022-06-15", endDate: null, status: "active", source: "practice", category: "diabetes", reason: "Type 2 Diabetes management" });
  await storage.createMedicationHistory({ memberId: member1.id, medicationName: "Lisinopril", genericName: "Lisinopril", dosage: "10mg", frequency: "Once daily", route: "oral", prescriber: "Dr. James Wilson", startDate: "2023-09-10", endDate: null, status: "active", source: "practice", category: "cardiovascular", reason: "Hypertension management" });
  await storage.createMedicationHistory({ memberId: member1.id, medicationName: "Acetaminophen", genericName: "Acetaminophen", dosage: "500mg", frequency: "As needed", route: "oral", prescriber: "Dr. James Wilson", startDate: "2024-01-20", endDate: null, status: "active", source: "hie", category: "pain", reason: "Osteoarthritis pain management" });
  await storage.createMedicationHistory({ memberId: member1.id, medicationName: "Glipizide", genericName: "Glipizide", dosage: "5mg", frequency: "Once daily", route: "oral", prescriber: "Dr. James Wilson", startDate: "2024-03-01", endDate: "2025-06-08", status: "discontinued", source: "practice", category: "diabetes", reason: "Adjunct diabetes management - discontinued due to hypoglycemic episodes" });

  // Harold Washington medications
  await storage.createMedicationHistory({ memberId: member2.id, medicationName: "Albuterol Inhaler", genericName: "Albuterol Sulfate", dosage: "90mcg/actuation", frequency: "Every 4-6 hours as needed", route: "inhalation", prescriber: "Dr. Maria Garcia", startDate: "2022-03-20", endDate: null, status: "active", source: "practice", category: "respiratory", reason: "COPD symptom relief" });
  await storage.createMedicationHistory({ memberId: member2.id, medicationName: "Furosemide", genericName: "Furosemide", dosage: "40mg", frequency: "Once daily", route: "oral", prescriber: "Dr. Maria Garcia", startDate: "2023-01-15", endDate: null, status: "active", source: "practice", category: "cardiovascular", reason: "CHF fluid management" });
  await storage.createMedicationHistory({ memberId: member2.id, medicationName: "Sertraline", genericName: "Sertraline HCl", dosage: "50mg", frequency: "Once daily", route: "oral", prescriber: "Dr. Maria Garcia", startDate: "2023-08-10", endDate: null, status: "active", source: "hie", category: "mental_health", reason: "Depression management" });
  await storage.createMedicationHistory({ memberId: member2.id, medicationName: "Lisinopril", genericName: "Lisinopril", dosage: "20mg", frequency: "Once daily", route: "oral", prescriber: "Dr. Maria Garcia", startDate: "2023-01-15", endDate: null, status: "active", source: "practice", category: "cardiovascular", reason: "Heart failure and blood pressure management" });
  await storage.createMedicationHistory({ memberId: member2.id, medicationName: "Metoprolol Tartrate", genericName: "Metoprolol Tartrate", dosage: "25mg", frequency: "Twice daily", route: "oral", prescriber: "Dr. Maria Garcia", startDate: "2023-06-01", endDate: "2025-08-08", status: "discontinued", source: "practice", category: "cardiovascular", reason: "CHF rate control - switched to Carvedilol for improved outcomes" });
  await storage.createMedicationHistory({ memberId: member2.id, medicationName: "Carvedilol", genericName: "Carvedilol", dosage: "6.25mg", frequency: "Twice daily", route: "oral", prescriber: "Dr. Maria Garcia", startDate: "2025-08-08", endDate: null, status: "active", source: "practice", category: "cardiovascular", reason: "CHF management - replacement for Metoprolol" });

  // Margaret Thompson medications
  await storage.createMedicationHistory({ memberId: member3.id, medicationName: "Levothyroxine", genericName: "Levothyroxine Sodium", dosage: "75mcg", frequency: "Once daily", route: "oral", prescriber: "Dr. David Lee", startDate: "2021-11-05", endDate: null, status: "active", source: "practice", category: "thyroid", reason: "Hypothyroidism management" });
  await storage.createMedicationHistory({ memberId: member3.id, medicationName: "Buspirone", genericName: "Buspirone HCl", dosage: "10mg", frequency: "Twice daily", route: "oral", prescriber: "Dr. David Lee", startDate: "2024-10-15", endDate: null, status: "active", source: "practice", category: "mental_health", reason: "Anxiety management - switched from Sertraline" });
  await storage.createMedicationHistory({ memberId: member3.id, medicationName: "Tamoxifen", genericName: "Tamoxifen Citrate", dosage: "20mg", frequency: "Once daily", route: "oral", prescriber: "Dr. David Lee", startDate: "2020-03-01", endDate: "2025-03-01", status: "completed", source: "hie", category: "other", reason: "Breast cancer adjuvant therapy - 5 year course completed" });
  await storage.createMedicationHistory({ memberId: member3.id, medicationName: "Sertraline", genericName: "Sertraline HCl", dosage: "50mg", frequency: "Once daily", route: "oral", prescriber: "Dr. David Lee", startDate: "2023-04-10", endDate: "2024-10-10", status: "discontinued", source: "hie", category: "mental_health", reason: "Anxiety management - discontinued and switched to Buspirone due to side effects" });

  // Completeness Rules for MA-PLAN-001
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "consent", componentId: "nopp", label: "NOPP Acknowledgement", required: true, exceptionAllowed: true, sortOrder: 10 });
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "consent", componentId: "voice_transcription", label: "Voice Transcription Consent", required: false, exceptionAllowed: true, sortOrder: 20 });
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "vitals", componentId: null, label: "Vital Signs & Physical Exam", required: true, exceptionAllowed: false, sortOrder: 30 });
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "medication", componentId: null, label: "Medication Reconciliation", required: true, exceptionAllowed: true, sortOrder: 40 });
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "assessment", componentId: "PHQ-2", label: "PHQ-2 Depression Screening", required: true, exceptionAllowed: true, sortOrder: 50 });
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "assessment", componentId: "PRAPARE", label: "PRAPARE Social Determinants", required: true, exceptionAllowed: true, sortOrder: 60 });
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "assessment", componentId: "AWV", label: "Annual Wellness Visit Assessment", required: true, exceptionAllowed: true, sortOrder: 70 });
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "measure", componentId: "CBP", label: "Controlling Blood Pressure", required: true, exceptionAllowed: true, sortOrder: 80 });
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "measure", componentId: "CDC-A1C", label: "Diabetes HbA1c Control", required: true, exceptionAllowed: true, sortOrder: 90 });
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "measure", componentId: "COL", label: "Colorectal Cancer Screening", required: true, exceptionAllowed: true, sortOrder: 100 });
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "previsit_data", componentId: "suspected_conditions", label: "Suspected Condition Review", description: "All HIE-derived suspected conditions must be confirmed or dismissed", required: true, exceptionAllowed: true, sortOrder: 105 });
  await storage.createCompletenessRule({ planPackId: "MA-PLAN-001", componentType: "previsit_data", componentId: "hie_medication_review", label: "HIE Medication Verification", description: "All HIE-sourced medications must be verified in medication reconciliation", required: true, exceptionAllowed: true, sortOrder: 106 });

  // Completeness Rules for ACA-PLAN-001
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "consent", componentId: "nopp", label: "NOPP Acknowledgement", required: true, exceptionAllowed: true, sortOrder: 10 });
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "consent", componentId: "voice_transcription", label: "Voice Transcription Consent", required: false, exceptionAllowed: true, sortOrder: 20 });
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "vitals", componentId: null, label: "Vital Signs & Physical Exam", required: true, exceptionAllowed: false, sortOrder: 30 });
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "medication", componentId: null, label: "Medication Reconciliation", required: true, exceptionAllowed: true, sortOrder: 40 });
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "assessment", componentId: "PHQ-2", label: "PHQ-2 Depression Screening", required: true, exceptionAllowed: true, sortOrder: 50 });
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "assessment", componentId: "PRAPARE", label: "PRAPARE Social Determinants", required: true, exceptionAllowed: true, sortOrder: 60 });
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "assessment", componentId: "AWV", label: "Annual Wellness Visit Assessment", required: true, exceptionAllowed: true, sortOrder: 70 });
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "measure", componentId: "BCS", label: "Breast Cancer Screening", required: true, exceptionAllowed: true, sortOrder: 80 });
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "measure", componentId: "COL", label: "Colorectal Cancer Screening", required: true, exceptionAllowed: true, sortOrder: 90 });
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "measure", componentId: "CBP", label: "Controlling Blood Pressure", required: true, exceptionAllowed: true, sortOrder: 100 });
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "previsit_data", componentId: "suspected_conditions", label: "Suspected Condition Review", description: "All HIE-derived suspected conditions must be confirmed or dismissed", required: true, exceptionAllowed: true, sortOrder: 105 });
  await storage.createCompletenessRule({ planPackId: "ACA-PLAN-001", componentType: "previsit_data", componentId: "hie_medication_review", label: "HIE Medication Verification", description: "All HIE-sourced medications must be verified in medication reconciliation", required: true, exceptionAllowed: true, sortOrder: 106 });

  // Audit events
  await storage.createAuditEvent({
    eventType: "phi_access",
    userId: np1.id,
    userName: np1.fullName,
    userRole: "np",
    patientId: member1.id,
    details: "Viewed pre-visit summary for Dorothy Martinez",
    resourceType: "member",
    resourceId: member1.id,
  });

  await storage.createAiProviderConfig({
    providerType: "openai",
    displayName: "OpenAI (Default)",
    apiKeySecretName: "OPENAI_API_KEY",
    baseUrl: "https://api.openai.com/v1",
    modelName: "whisper-1",
    extractionModel: "gpt-4o-mini",
    active: true,
    featureFlags: { transcription: true, extraction: true, clinicalSuggestions: false },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const hieLog1 = await storage.createHieIngestionLog({
    visitId: visit1.id,
    memberId: member1.id,
    bundleId: "hie-bundle-dorothy-001",
    sourceSystem: "Regional HIE Network",
    resourceCount: 14,
    resourceSummary: { MedicationStatement: 3, Condition: 4, Observation: 5, Procedure: 2 } as any,
    status: "completed",
    receivedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    processedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    processedBy: "system",
  });

  await storage.createSuspectedCondition({
    visitId: visit1.id,
    memberId: member1.id,
    icdCode: "E11.40",
    description: "Type 2 diabetes with diabetic neuropathy, unspecified",
    hieSource: "Regional HIE Network",
    confidence: "suspected",
    status: "pending",
    ingestionLogId: hieLog1.id,
    createdAt: new Date().toISOString(),
  });

  await storage.createSuspectedCondition({
    visitId: visit1.id,
    memberId: member1.id,
    icdCode: "I10",
    description: "Essential hypertension",
    hieSource: "Regional HIE Network",
    confidence: "high",
    status: "pending",
    ingestionLogId: hieLog1.id,
    createdAt: new Date().toISOString(),
  });

  await storage.createSuspectedCondition({
    visitId: visit1.id,
    memberId: member1.id,
    icdCode: "E78.5",
    description: "Hyperlipidemia, unspecified",
    hieSource: "Regional HIE Network",
    confidence: "moderate",
    status: "pending",
    ingestionLogId: hieLog1.id,
    createdAt: new Date().toISOString(),
  });

  await storage.createHieIngestionLog({
    visitId: visit2.id,
    memberId: member2.id,
    bundleId: "hie-bundle-harold-001",
    sourceSystem: "State Health Exchange",
    resourceCount: 10,
    resourceSummary: { MedicationStatement: 2, Condition: 3, Observation: 4, Procedure: 1 } as any,
    status: "completed",
    receivedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    processedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    processedBy: "system",
  });

  console.log("Database seeded successfully!");
  console.log(`  - 6 users (2 NPs, 1 supervisor, 1 coordinator, 1 admin, 1 compliance)`);
  console.log(`  - 3 members (patients)`);
  console.log(`  - 3 visits with required checklists`);
  console.log(`  - 4 assessment definitions (PHQ-2, PHQ-9, PRAPARE, AWV)`);
  console.log(`  - 5 measure definitions (BCS, COL, CDC-A1C, CBP, FMC)`);
  console.log(`  - 2 plan packs (MA Standard, ACA Comprehensive)`);
  console.log(`  - Plan targets and care plan tasks`);
  console.log(`  - 8 clinical decision rules`);
  console.log(`  - 60 diagnosis validation rules`);
  console.log(`  - Vitals history, lab results, medication history`);
  console.log(`  - HIE ingestion logs and suspected conditions`);
  console.log(`  - 1 AI provider configuration (OpenAI default)`);
  console.log(`  - Demo FHIR Bundle available at /api/fhir/demo-bundle for importing 5 additional patients`);
}
