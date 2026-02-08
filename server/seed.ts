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
    active: true,
  });

  // Measure Definitions
  await storage.createMeasureDefinition({
    measureId: "BCS",
    name: "Breast Cancer Screening",
    version: "1.0",
    category: "Cancer Screening",
    description: "Women 50-74 who had a mammogram in the past 2 years.",
    requiredEvidenceType: "Mammogram report or documentation of screening",
    allowedCaptureMethods: ["in_home_visit", "external_record", "hie_retrieval"],
    active: true,
  });

  await storage.createMeasureDefinition({
    measureId: "COL",
    name: "Colorectal Cancer Screening",
    version: "1.0",
    category: "Cancer Screening",
    description: "Adults 45-75 who received appropriate colorectal cancer screening.",
    requiredEvidenceType: "Colonoscopy, FIT, or stool DNA test documentation",
    allowedCaptureMethods: ["in_home_visit", "external_record", "hie_retrieval", "member_reported"],
    active: true,
  });

  await storage.createMeasureDefinition({
    measureId: "CDC-A1C",
    name: "Diabetes: HbA1c Testing",
    version: "1.0",
    category: "Chronic Disease Management",
    description: "Diabetic patients who had HbA1c testing in the measurement year.",
    requiredEvidenceType: "Lab result showing HbA1c test",
    allowedCaptureMethods: ["in_home_visit", "external_record", "hie_retrieval"],
    active: true,
  });

  await storage.createMeasureDefinition({
    measureId: "CBP",
    name: "Controlling High Blood Pressure",
    version: "1.0",
    category: "Chronic Disease Management",
    description: "Patients 18-85 with hypertension whose BP was adequately controlled.",
    requiredEvidenceType: "Blood pressure reading documentation",
    allowedCaptureMethods: ["in_home_visit"],
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
    version: "1.0",
    active: true,
  });

  await storage.createPlanPack({
    planId: "ACA-PLAN-001",
    planName: "ACA Comprehensive",
    programId: "ACA-COMP",
    visitType: "annual_wellness",
    requiredAssessments: ["PHQ-2", "PHQ-9", "PRAPARE", "AWV"],
    requiredMeasures: ["BCS", "COL", "CBP"],
    version: "1.0",
    active: true,
  });

  // Visits
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

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

  console.log("Database seeded successfully!");
  console.log(`  - 6 users (2 NPs, 1 supervisor, 1 coordinator, 1 admin, 1 compliance)`);
  console.log(`  - 3 members (patients)`);
  console.log(`  - 3 visits with required checklists`);
  console.log(`  - 4 assessment definitions (PHQ-2, PHQ-9, PRAPARE, AWV)`);
  console.log(`  - 5 measure definitions (BCS, COL, CDC-A1C, CBP, FMC)`);
  console.log(`  - 2 plan packs (MA Standard, ACA Comprehensive)`);
  console.log(`  - 6 plan targets`);
  console.log(`  - 2 sample care plan tasks`);
}
