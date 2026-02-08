import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Search,
  BookOpen,
  Stethoscope,
  CheckSquare,
  Users,
  Settings,
  Shield,
  ClipboardList,
  FileJson,
  Activity,
  Heart,
  Brain,
  BarChart3,
  Lock,
  FileText,
  AlertTriangle,
  ArrowRight,
  Zap,
  Target,
  Eye,
  Code,
  Upload,
  Download,
} from "lucide-react";

interface HelpSection {
  id: string;
  title: string;
  icon: any;
  description: string;
  items: HelpItem[];
}

interface HelpItem {
  question: string;
  answer: string;
  roles?: string[];
  tags?: string[];
}

const gettingStartedSection: HelpSection = {
  id: "getting-started",
  title: "Getting Started",
  icon: BookOpen,
  description: "Login, navigation, and basic platform orientation",
  items: [
    {
      question: "How do I log in?",
      answer: "Go to the login page and enter your username and password. The system supports five roles: Nurse Practitioner (NP), Supervisor, Care Coordinator, Admin, and Compliance. Each role has a tailored dashboard and navigation. Demo credentials are available for testing:\n\n- NP: sarah.np / password or michael.np / password\n- Supervisor: dr.williams / password\n- Care Coordinator: emma.coord / password\n- Admin: admin / password\n- Compliance: compliance / password",
      tags: ["login", "credentials", "access"],
    },
    {
      question: "How does role-based access work?",
      answer: "Each user role sees a different dashboard and sidebar navigation:\n\n- Nurse Practitioner (NP): Dashboard with visit stats, My Visits list. Can conduct full visit lifecycle from pre-visit through finalization.\n- Supervisor: Dashboard with review metrics, Review Queue for approving/rejecting finalized visits, All Visits list.\n- Care Coordinator: Dashboard with task metrics, Care Tasks management for follow-ups and referrals, All Visits list.\n- Admin: Admin Dashboard with system configuration links, Admin Console for plan packs/assessments/measures, FHIR Interoperability playground, All Visits list.\n- Compliance: Dashboard, Audit Log viewer for reviewing all system events, All Visits list.",
      tags: ["roles", "permissions", "access", "dashboard"],
    },
    {
      question: "How do I navigate the application?",
      answer: "Use the sidebar on the left to navigate between pages. The sidebar shows different menu items based on your role. You can collapse the sidebar using the toggle button in the header. The header also includes a light/dark theme toggle. Breadcrumb links are available on many pages to navigate back to parent views.",
      tags: ["navigation", "sidebar", "menu"],
    },
    {
      question: "How do I switch between light and dark mode?",
      answer: "Click the sun/moon icon in the top-right corner of the header to toggle between light and dark mode. Your preference is saved in your browser.",
      tags: ["theme", "dark mode", "display"],
    },
  ],
};

const visitLifecycleSection: HelpSection = {
  id: "visit-lifecycle",
  title: "Visit Lifecycle",
  icon: ClipboardList,
  description: "Complete workflow from scheduling to supervisor approval",
  items: [
    {
      question: "What is the visit lifecycle?",
      answer: "Each in-home visit follows this workflow:\n\n1. Pre-Visit Summary - Review member info, plan targets, and required checklist items\n2. Start Visit - Begin the clinical intake process\n3. Identity Verification - Confirm the patient's identity\n4. Vitals & Exam - Record vital signs and exam notes\n5. Assessments - Complete required clinical assessments (PHQ-2, PHQ-9, PRAPARE, AWV)\n6. HEDIS Measures - Capture evidence for required quality measures\n7. Care Plan & Tasks - Create follow-up tasks and referrals\n8. Patient Timeline - Review longitudinal clinical history\n9. Review & Finalize - Review all data, sign, and submit\n10. Supervisor Review - Supervisor approves or requests corrections\n11. Care Coordination - Follow-up tasks are routed to care coordinators",
      roles: ["np", "supervisor"],
      tags: ["workflow", "lifecycle", "process", "visits"],
    },
    {
      question: "How do I view and manage visits?",
      answer: "Navigate to 'My Visits' (NP) or 'All Visits' (other roles) from the sidebar. The visit list shows all visits with their status, member name, date, and time. You can search visits by member name and filter by status (Scheduled, In Progress, Completed, Finalized, Approved). Click any visit to open its Pre-Visit Summary.",
      roles: ["np"],
      tags: ["visits", "list", "search", "filter"],
    },
    {
      question: "What is the Pre-Visit Summary?",
      answer: "The Pre-Visit Summary page is shown before starting a visit. It displays:\n\n- Member demographics (name, DOB, insurance, member ID)\n- Visit details (date, time, type, address, notes)\n- Required checklist items (assessments and measures needed for this visit type)\n- Plan targets (clinical goals for the visit)\n- Clinical history snapshot\n\nClick 'Start Visit' to begin the clinical intake process.",
      roles: ["np"],
      tags: ["pre-visit", "summary", "preparation"],
    },
    {
      question: "What does each visit status mean?",
      answer: "- Scheduled: Visit is planned but not yet started\n- In Progress: NP has started the visit and is collecting clinical data\n- Completed: NP has finished data collection (checklist may not be fully complete)\n- Finalized: NP has signed and submitted the visit for review\n- Pending Review: Visit is awaiting supervisor approval\n- Approved: Supervisor has approved the visit\n- Corrections Requested: Supervisor has asked for changes",
      tags: ["status", "workflow", "visits"],
    },
  ],
};

const intakeSection: HelpSection = {
  id: "clinical-intake",
  title: "Clinical Intake",
  icon: Stethoscope,
  description: "Identity verification, vitals, assessments, HEDIS measures, and care planning",
  items: [
    {
      question: "How does the Intake Dashboard work?",
      answer: "After starting a visit, you land on the Intake Dashboard. It shows:\n\n- Overall progress bar (percentage of checklist items completed)\n- Quick-access cards for each intake activity: Identity Verification, Vitals & Exam, each required Assessment, each required HEDIS Measure, Care Plan & Tasks, and Patient Clinical Timeline\n- Each card shows its completion status with a checkmark when done\n\nClick any card to navigate to that activity. You can complete items in any order.",
      roles: ["np"],
      tags: ["intake", "dashboard", "progress", "checklist"],
    },
    {
      question: "How do I verify a patient's identity?",
      answer: "From the Intake Dashboard, click the 'Identity Verification' card. Select the verification method used (e.g., Photo ID, Medicare Card, verbal confirmation) and click 'Confirm Identity'. This is a required gating item - the visit cannot be finalized without identity verification.",
      roles: ["np"],
      tags: ["identity", "verification", "gating"],
    },
    {
      question: "How do I record vitals and exam findings?",
      answer: "From the Intake Dashboard, click 'Vitals & Exam'. Enter vital signs in the form:\n\n- Blood Pressure (systolic/diastolic in mmHg)\n- Heart Rate (bpm)\n- Respiratory Rate (breaths/min)\n- Temperature (degrees F)\n- Oxygen Saturation (SpO2 %)\n- Weight (lbs)\n- Height (inches)\n- BMI (auto-calculated from weight and height)\n- Pain Scale (0-10)\n\nAdd exam notes in the free-text area. Click 'Save Vitals' to record. After saving, the Clinical Decision Support system automatically evaluates the vitals against clinical rules and may generate recommendations.",
      roles: ["np"],
      tags: ["vitals", "exam", "blood pressure", "BMI"],
    },
    {
      question: "How do clinical assessments work?",
      answer: "Click an assessment card on the Intake Dashboard (e.g., PHQ-2, PHQ-9, PRAPARE, AWV). Each assessment presents standardized questions with multiple-choice answers. As you answer questions:\n\n- A running score is calculated automatically\n- An interpretation band is shown (e.g., 'Minimal depression', 'Moderate depression')\n- You can save as 'Draft' to return later or 'Complete' to finalize\n\nIf you cannot complete an assessment, use the 'Unable to Assess' option. You must select a reason (patient refused, cognitive impairment, language barrier, time constraint, other) and optionally add a note. This counts as completing the checklist item for gating purposes.",
      roles: ["np"],
      tags: ["assessment", "PHQ-2", "PHQ-9", "PRAPARE", "AWV", "scoring"],
    },
    {
      question: "What are the assessment scoring ranges?",
      answer: "PHQ-2 (Depression Screening, 2 questions, max score 6):\n- 0-2: Negative screen\n- 3-6: Positive screen (triggers PHQ-9 recommendation)\n\nPHQ-9 (Depression Assessment, 9 questions, max score 27):\n- 0-4: Minimal depression\n- 5-9: Mild depression\n- 10-14: Moderate depression\n- 15-19: Moderately severe depression\n- 20-27: Severe depression\n\nPRAPARE (Social Determinants of Health):\n- Scores across domains: housing, food, transportation, utilities, safety, social integration\n- Higher scores indicate more social risk factors\n\nAWV (Annual Wellness Visit):\n- Covers functional status, fall risk, cognitive screening, preventive services\n- Generates a comprehensive wellness profile",
      roles: ["np"],
      tags: ["scoring", "PHQ-2", "PHQ-9", "PRAPARE", "AWV", "interpretation"],
    },
    {
      question: "How do HEDIS measures work?",
      answer: "HEDIS (Healthcare Effectiveness Data and Information Set) measures track quality of care. From the Intake Dashboard, click a measure card. For each measure:\n\n1. Select a capture method (e.g., medical record review, patient self-report, direct observation)\n2. Add clinical notes about the evidence captured\n3. Click 'Complete Measure' to mark it done\n\nIf you cannot capture the measure, use 'Unable to Assess' with a structured reason (patient refused, not clinically appropriate, documentation unavailable, time constraint, other) and an optional note.",
      roles: ["np"],
      tags: ["HEDIS", "measures", "quality", "capture"],
    },
    {
      question: "How do I create care plan tasks?",
      answer: "From the Intake Dashboard, click 'Care Plan & Tasks'. This page shows existing tasks for the visit and allows you to create new ones:\n\n1. Click 'Add Task'\n2. Fill in the task details:\n   - Task Type: follow_up, referral, lab_order, medication, education, other\n   - Title: Brief description of the task\n   - Description: Detailed instructions\n   - Priority: low, medium, high, urgent\n   - Due Date: When the task should be completed\n3. Click 'Create Task'\n\nTasks are visible to Care Coordinators for follow-up after the visit is finalized.",
      roles: ["np"],
      tags: ["care plan", "tasks", "referrals", "follow-up"],
    },
  ],
};

const timelineSection: HelpSection = {
  id: "patient-timeline",
  title: "Patient Clinical Timeline",
  icon: Activity,
  description: "Longitudinal health data visualization with vitals, labs, and medication history",
  items: [
    {
      question: "What does the Patient Clinical Timeline show?",
      answer: "The Patient Clinical Timeline provides a 2-year longitudinal view of the patient's clinical data. It is accessible from the Intake Dashboard via the 'Patient Clinical Timeline' card. The timeline includes three main sections:\n\n1. Vitals Trends - Charts for Blood Pressure, Heart Rate, SpO2, and Weight/BMI over time\n2. Lab Results - Trend charts with reference ranges for common labs\n3. Medication History - Gantt-style timeline bars showing medication start/stop periods\n\nData is sourced from both Practice (in-house) and HIE (Health Information Exchange) systems, indicated by color-coded dots on the charts.",
      roles: ["np"],
      tags: ["timeline", "vitals", "labs", "medications", "history", "longitudinal"],
    },
    {
      question: "How do I read the vitals trend charts?",
      answer: "Each vitals chart displays data points over time with:\n- Blue dots: Practice data (from your organization)\n- Green dots: HIE data (from external health information exchanges)\n- Shaded reference ranges showing normal values\n- Hover over any data point to see the exact value and date\n\nCharts available: Blood Pressure (systolic/diastolic), Heart Rate (bpm), Oxygen Saturation (SpO2 %), and Weight/BMI.",
      roles: ["np"],
      tags: ["vitals", "charts", "trends", "HIE"],
    },
    {
      question: "What is the medication timeline?",
      answer: "The medication timeline shows a Gantt-style chart of all medications over a 2-year lookback period. Each medication appears as a horizontal bar spanning its active period (start date to end date or present). The bars are color-coded by medication class and show the medication name, dosage, and prescriber information on hover.",
      roles: ["np"],
      tags: ["medications", "Rx", "timeline", "Gantt"],
    },
  ],
};

const cdsSection: HelpSection = {
  id: "clinical-decision-support",
  title: "Clinical Decision Support",
  icon: Brain,
  description: "Real-time recommendations, validation warnings, and auto-coding",
  items: [
    {
      question: "How does Clinical Decision Support (CDS) work?",
      answer: "The CDS system automatically evaluates clinical data against a set of predefined rules and generates recommendations. Rules are triggered at two points:\n\n1. After saving vitals - Rules check for abnormal blood pressure, heart rate, BMI, oxygen saturation, and pain levels\n2. After completing assessments - Rules check for escalation triggers (e.g., positive PHQ-2 triggers PHQ-9 recommendation)\n\nRecommendations appear as inline alerts on the Vitals & Exam page and on the Review & Finalize page. Each recommendation shows the rule that triggered it, the severity level, and a suggested action.",
      roles: ["np"],
      tags: ["CDS", "recommendations", "rules", "alerts", "clinical"],
    },
    {
      question: "What clinical rules are available?",
      answer: "The system includes 8 clinical rules:\n\n1. PHQ-2 Positive Screen - If PHQ-2 score >= 3, recommends administering PHQ-9\n2. Elevated Blood Pressure - If systolic >= 140 or diastolic >= 90, flags hypertension alert\n3. High BMI - If BMI >= 30, recommends obesity counseling and nutrition referral\n4. Low Oxygen Saturation - If SpO2 < 95%, flags respiratory concern\n5. Elevated Pain - If pain scale >= 7, recommends pain management assessment\n6. PRAPARE Social Risk - If PRAPARE identifies social determinants, recommends social work referral\n7. Elevated Heart Rate - If heart rate > 100 bpm, flags tachycardia alert\n8. Additional rules may be configured by administrators",
      roles: ["np"],
      tags: ["rules", "clinical", "thresholds", "alerts"],
    },
    {
      question: "How do validation warnings and overrides work?",
      answer: "When clinical data falls outside expected ranges, validation warnings appear on the Vitals & Exam page. These are inline alerts that flag potential data entry errors or clinically significant findings.\n\nFor each warning, you can:\n1. Correct the data if it was entered incorrectly\n2. Override the warning by clicking 'Override' and providing:\n   - A structured reason (confirmed accurate, clinically appropriate, equipment limitation, patient-specific, other)\n   - An optional detailed note\n\nAll overrides are tracked and visible on the Review & Finalize page and in the audit log.",
      roles: ["np"],
      tags: ["validation", "warnings", "overrides", "data quality"],
    },
    {
      question: "How does automatic coding work?",
      answer: "The system automatically generates billing and diagnostic codes based on clinical data collected during the visit:\n\n- CPT codes: Based on visit type and services provided (e.g., AWV, evaluation & management)\n- HCPCS codes: For specific procedures and services\n- ICD-10 codes: Based on documented conditions, assessment results, and clinical findings\n\nAuto-generated codes appear on the Review & Finalize page. For each code, you can:\n- Verify: Confirm the code is appropriate\n- Remove: Delete an incorrect code\n\nCodes are included in the FHIR export bundle as Condition resources with ICD-10 coding.",
      roles: ["np"],
      tags: ["coding", "CPT", "HCPCS", "ICD-10", "billing", "auto-coding"],
    },
  ],
};

const finalizationSection: HelpSection = {
  id: "finalization",
  title: "Review & Finalization",
  icon: CheckSquare,
  description: "Gating validation, attestation, electronic signature, and submission",
  items: [
    {
      question: "What is finalization gating?",
      answer: "Before a visit can be finalized and signed, all required items must be completed. The Review & Finalize page shows a gating checklist with:\n\n- Identity Verification: Must be confirmed\n- Vitals Recorded: At least one set of vitals must be saved\n- All Required Assessments: Each assessment must be completed or have a structured 'unable to assess' reason\n- All Required HEDIS Measures: Each measure must be completed or have a structured 'unable to assess' reason\n\nIf any gating item is incomplete, the 'Sign & Finalize' button is disabled and the incomplete items are highlighted.",
      roles: ["np"],
      tags: ["finalization", "gating", "checklist", "requirements"],
    },
    {
      question: "What does the Review & Finalize page show?",
      answer: "The Review & Finalize page provides a comprehensive summary before submission:\n\n1. Gating Checklist - All required items with pass/fail status\n2. Auto-Generated Codes - CPT, HCPCS, and ICD-10 codes with verify/remove actions\n3. Clinical Recommendations - Any pending CDS recommendations\n4. Validation Overrides - Summary of any data validation overrides made during the visit\n5. Attestation Statement - Legal attestation text that must be acknowledged\n6. Electronic Signature - Type your full name to sign\n\nClick 'Sign & Finalize' to submit the visit for supervisor review.",
      roles: ["np"],
      tags: ["review", "finalize", "codes", "signature", "attestation"],
    },
    {
      question: "Can I edit a visit after finalizing?",
      answer: "Once a visit is finalized, it enters the supervisor review queue. If the supervisor requests corrections, the visit status changes to 'Corrections Requested' and you can make the needed changes. After corrections, you can re-finalize the visit. Approved visits cannot be edited.",
      roles: ["np"],
      tags: ["edit", "corrections", "finalize", "locked"],
    },
  ],
};

const supervisorSection: HelpSection = {
  id: "supervisor-review",
  title: "Supervisor Review",
  icon: Eye,
  description: "Review queue, approval workflow, and correction requests",
  items: [
    {
      question: "How do I review finalized visits?",
      answer: "Navigate to 'Review Queue' from the sidebar. The queue shows all visits pending supervisor review with:\n\n- Patient name and visit date\n- NP who conducted the visit\n- Visit status and submission timestamp\n\nClick a visit to open its details. After reviewing the clinical documentation, choose one of:\n- Approve: Confirms the visit meets quality standards\n- Request Correction: Sends the visit back to the NP with your comments explaining what needs to be changed",
      roles: ["supervisor"],
      tags: ["review", "approve", "corrections", "queue"],
    },
    {
      question: "What should I check during a review?",
      answer: "When reviewing a finalized visit, verify:\n\n1. Identity verification was properly completed\n2. Vitals are recorded and clinically reasonable\n3. All required assessments are completed with appropriate scores\n4. HEDIS measures have proper evidence documented\n5. Any 'unable to assess' items have valid, documented reasons\n6. Clinical recommendations were appropriately addressed or acknowledged\n7. Auto-generated codes are accurate and complete\n8. Validation overrides have acceptable justifications\n9. Care plan tasks are appropriate for the clinical findings\n10. Clinical notes are adequate and professional",
      roles: ["supervisor"],
      tags: ["review", "quality", "checklist", "standards"],
    },
  ],
};

const coordinationSection: HelpSection = {
  id: "care-coordination",
  title: "Care Coordination",
  icon: Users,
  description: "Task management, follow-up tracking, and referral processing",
  items: [
    {
      question: "How do I manage care tasks?",
      answer: "Navigate to 'Care Tasks' from the sidebar. The task list shows all follow-up tasks and referrals created during visits:\n\n- Search tasks by title or description\n- Filter by status: All, Pending, In Progress, Completed\n- Each task card shows: title, type (follow-up, referral, lab order, etc.), priority, description, and due date\n\nClick a task to open the update dialog where you can:\n1. Change the status (pending, in_progress, completed)\n2. Add outcome notes documenting the resolution\n3. Save changes\n\nTask updates are tracked in the audit log.",
      roles: ["care_coordinator"],
      tags: ["tasks", "coordination", "follow-up", "referrals"],
    },
    {
      question: "What task types are available?",
      answer: "Tasks created during visits can be of these types:\n\n- Follow-up: General follow-up actions\n- Referral: Specialist or service referrals\n- Lab Order: Laboratory tests to be scheduled\n- Medication: Medication-related tasks (refills, changes)\n- Education: Patient education materials or sessions\n- Other: Any other follow-up action\n\nEach task also has a priority level (low, medium, high, urgent) and a due date.",
      roles: ["care_coordinator"],
      tags: ["task types", "referrals", "labs", "medications"],
    },
  ],
};

const adminSection: HelpSection = {
  id: "admin",
  title: "Administration",
  icon: Settings,
  description: "System configuration, plan packs, assessment/measure definitions",
  items: [
    {
      question: "What is the Admin Console?",
      answer: "The Admin Console is accessible from the admin sidebar. It provides configuration management across three tabs:\n\n1. Plan Packs: View configured insurance plan packs with their visit types and required checklists\n2. Assessments: View all assessment definitions (PHQ-2, PHQ-9, PRAPARE, AWV) with their versions, categories, and active/inactive status\n3. Measures: View all HEDIS measure definitions with their codes, categories, and active/inactive status\n\nThese configurations determine which assessments and measures are required for each visit type.",
      roles: ["admin"],
      tags: ["admin", "configuration", "plan packs", "assessments", "measures"],
    },
    {
      question: "What is the Audit Viewer?",
      answer: "The Audit Viewer (accessible to Admin and Compliance roles) shows a chronological log of all significant system events:\n\n- PHI Access: When patient health information is viewed\n- Login/Logout: User authentication events\n- Visit Finalized: When a visit is signed and submitted\n- Visit Exported: When visit data is exported (e.g., FHIR)\n- Assessment Completed: When clinical assessments are finalized\n- Measure Completed: When HEDIS measures are captured\n- Review Submitted: Supervisor approval/correction decisions\n- Task Updated: Care coordination task status changes\n\nYou can search events by description and filter by event type.",
      roles: ["admin", "compliance"],
      tags: ["audit", "logs", "compliance", "events", "tracking"],
    },
  ],
};

const fhirSection: HelpSection = {
  id: "fhir",
  title: "FHIR Interoperability",
  icon: FileJson,
  description: "Import and export clinical data using FHIR R4 standard format",
  items: [
    {
      question: "What is FHIR and why is it important?",
      answer: "FHIR (Fast Healthcare Interoperability Resources) R4 is the international standard for exchanging healthcare data electronically. Easy Health supports bidirectional FHIR R4 data exchange, enabling:\n\n- Sharing clinical data with hospitals, labs, and other healthcare systems\n- Importing patient and encounter data from external sources\n- Compliance with federal interoperability requirements\n- Standardized data format using LOINC codes and ICD-10 coding",
      roles: ["admin"],
      tags: ["FHIR", "interoperability", "data exchange", "standards"],
    },
    {
      question: "How do I export clinical data?",
      answer: "Navigate to 'FHIR Interop' from the admin sidebar or dashboard. On the Export tab:\n\n1. Select a visit from the dropdown\n2. Choose a resource type:\n   - Bundle: Complete visit package with all resources\n   - Patient: Member demographics\n   - Encounter: Visit details\n   - Observation: Vitals (BP, HR, SpO2, etc. with LOINC codes)\n   - Condition: ICD-10 diagnoses\n3. Click 'Fetch Resource' to generate the FHIR JSON\n4. Use 'Copy' to copy to clipboard or 'Download' to save as a JSON file\n\nThe exported data follows FHIR R4 specifications with proper resource references and coding systems.",
      roles: ["admin"],
      tags: ["FHIR", "export", "download", "JSON", "bundle"],
    },
    {
      question: "How do I import clinical data?",
      answer: "On the Import tab of the FHIR Playground:\n\n1. Select the import type: Patient or Bundle\n2. Paste FHIR-compliant JSON into the text area, or use the 'Load Sample' buttons to pre-fill with example data:\n   - Load Sample Patient: Pre-fills with a valid FHIR Patient resource\n   - Load Sample Bundle: Pre-fills with a FHIR Bundle containing Patient and Encounter resources\n3. Click 'Import' to process the data\n\nFor Patient imports: The system matches on the member ID identifier. If a matching member exists, it updates their record. If not, it creates a new member.\n\nFor Bundle imports: The system processes Patient and Encounter resources from the bundle, creating or updating members and scheduling new visits.\n\nThe result JSON is displayed after import showing what was created or updated.",
      roles: ["admin"],
      tags: ["FHIR", "import", "upload", "JSON", "patient", "bundle"],
    },
    {
      question: "What FHIR API endpoints are available?",
      answer: "Easy Health provides 8 FHIR R4 API endpoints:\n\nOutbound (Read/Export):\n- GET /api/fhir/Patient - List all patients\n- GET /api/fhir/Patient/:id - Single patient by ID\n- GET /api/fhir/Encounter/:id - Visit as FHIR Encounter\n- GET /api/fhir/Observation?encounter=:id - Vitals as FHIR Observations with LOINC codes\n- GET /api/fhir/Condition?encounter=:id - ICD-10 diagnoses as FHIR Conditions\n- GET /api/fhir/Bundle?visit=:id - Full visit bundle with all resources\n\nInbound (Write/Import):\n- POST /api/fhir/Patient - Create or update a member from FHIR Patient resource\n- POST /api/fhir/Bundle - Import a bundle with Patient and Encounter resources\n\nAll endpoints return FHIR R4 compliant JSON with proper OperationOutcome error responses.",
      roles: ["admin"],
      tags: ["FHIR", "API", "endpoints", "REST"],
    },
  ],
};

const testingSection: HelpSection = {
  id: "testing-guide",
  title: "Testing Guide",
  icon: Target,
  description: "Step-by-step walkthroughs for testing all major features",
  items: [
    {
      question: "How do I test a complete NP visit workflow?",
      answer: "1. Log in as sarah.np / password\n2. On the Dashboard, click an upcoming visit (or go to My Visits and select a 'Scheduled' visit)\n3. On the Pre-Visit Summary, review the member info and checklist, then click 'Start Visit'\n4. On the Intake Dashboard, complete each card in order:\n   a. Identity Verification: Select a method and confirm\n   b. Vitals & Exam: Enter vitals (e.g., BP 130/85, HR 78, Temp 98.6, SpO2 97, Weight 180, Height 68), add exam notes, click Save\n   c. Observe CDS recommendations that appear after saving vitals\n   d. Click each Assessment card: Answer all questions, view the computed score, and click Complete\n   e. Click each HEDIS Measure card: Select a capture method, add notes, click Complete\n   f. Care Plan & Tasks: Add at least one follow-up task\n   g. Patient Timeline: Review the longitudinal data charts\n5. When all cards show checkmarks, click 'Review & Finalize'\n6. On the Review & Finalize page: Verify the gating checklist is all green, review auto-generated codes, type your signature, and click 'Sign & Finalize'\n7. The visit is now in the supervisor review queue",
      tags: ["testing", "walkthrough", "NP", "workflow", "end-to-end"],
    },
    {
      question: "How do I test the supervisor review workflow?",
      answer: "1. First, complete and finalize a visit as an NP (see above)\n2. Log out and log in as dr.williams / password\n3. Go to 'Review Queue' from the sidebar\n4. Find the recently finalized visit in the queue\n5. Click the visit to open details\n6. Review the clinical documentation\n7. Test both actions:\n   a. Approve: Click 'Approve' to complete the review\n   b. Request Correction: Click 'Request Correction', type comments explaining the issue, and submit. Then log back in as the NP to see the correction request.",
      tags: ["testing", "walkthrough", "supervisor", "review"],
    },
    {
      question: "How do I test care coordination?",
      answer: "1. First, create care plan tasks during a visit as an NP\n2. Log out and log in as emma.coord / password\n3. Go to 'Care Tasks' from the sidebar\n4. Search or filter to find the tasks you created\n5. Click a task to open the update dialog\n6. Change the status to 'In Progress' and save\n7. Change the status to 'Completed', add outcome notes, and save\n8. Verify the task status updated in the list",
      tags: ["testing", "walkthrough", "care coordination", "tasks"],
    },
    {
      question: "How do I test the 'Unable to Assess' workflow?",
      answer: "During a visit, when completing an assessment or HEDIS measure:\n\n1. Instead of answering questions or selecting a capture method, click 'Unable to Assess'\n2. Select a reason from the dropdown (patient refused, cognitive impairment, language barrier, time constraint, not clinically appropriate, documentation unavailable, other)\n3. Optionally add a detailed note explaining the situation\n4. Submit the 'unable to assess' form\n5. The item is now marked as complete on the intake dashboard (with a note that it was marked unable)\n6. On the Review & Finalize page, the item shows as complete with the unable-to-assess reason documented",
      tags: ["testing", "unable to assess", "assessment", "measure"],
    },
    {
      question: "How do I test CDS recommendations and validation overrides?",
      answer: "1. Log in as sarah.np / password and start a visit\n2. Go to Vitals & Exam\n3. Enter abnormal vitals to trigger rules:\n   - BP: 160/100 (triggers hypertension alert)\n   - Heart Rate: 110 (triggers tachycardia alert)\n   - SpO2: 92 (triggers low oxygen alert)\n   - BMI: 35 (enter weight/height to produce BMI >= 30, triggers obesity alert)\n   - Pain: 8 (triggers pain management alert)\n4. Save vitals - observe validation warnings and CDS recommendations appearing\n5. For validation warnings, click 'Override' and provide a reason and note\n6. Go to Review & Finalize to see all recommendations and overrides summarized\n\nFor assessment-triggered CDS:\n1. Complete PHQ-2 with a score >= 3 (answer questions with higher scores)\n2. After completing, observe the recommendation to administer PHQ-9\n3. Complete the PRAPARE assessment with social risk factors to trigger social work referral recommendations",
      tags: ["testing", "CDS", "recommendations", "overrides", "validation"],
    },
    {
      question: "How do I test FHIR import and export?",
      answer: "1. Log in as admin / password\n2. Navigate to FHIR Interop from the sidebar or dashboard\n3. Test Export:\n   a. Select a visit from the dropdown\n   b. Select 'Bundle' as the resource type\n   c. Click 'Fetch Resource' - verify JSON output contains Patient, Encounter, Observation resources\n   d. Try other resource types (Patient, Encounter, Observation, Condition)\n   e. Click 'Copy' to copy JSON, or 'Download' to save file\n4. Test Import (Patient):\n   a. Switch to the Import tab\n   b. Click 'Load Sample Patient' to pre-fill sample data\n   c. Click 'Import' - verify the response shows the created patient\n5. Test Import (Bundle):\n   a. Select 'Bundle' as import type\n   b. Click 'Load Sample Bundle' to pre-fill sample data\n   c. Click 'Import' - verify the response shows created resources\n6. Check the API Reference tab to see all available endpoints",
      tags: ["testing", "FHIR", "import", "export", "walkthrough"],
    },
    {
      question: "How do I test the audit log?",
      answer: "1. Log in as admin / password (or compliance / password)\n2. Navigate to 'Audit Log' from the sidebar\n3. The log shows all system events in chronological order\n4. Use the search bar to find specific events by description\n5. Use the event type filter to view specific categories\n6. Perform various actions across different roles (login, view visits, finalize, review) and verify they appear in the audit log",
      tags: ["testing", "audit", "logs", "compliance"],
    },
  ],
};

const credentialsSection: HelpSection = {
  id: "demo-credentials",
  title: "Demo Credentials",
  icon: Lock,
  description: "Test accounts for each role with login information",
  items: [
    {
      question: "What are the available test accounts?",
      answer: "The following demo accounts are pre-configured for testing:\n\nNurse Practitioner:\n- Username: sarah.np | Password: password | Name: Sarah Johnson, NP\n- Username: michael.np | Password: password | Name: Michael Chen, NP\n\nClinical Supervisor:\n- Username: dr.williams | Password: password | Name: Dr. Patricia Williams\n\nCare Coordinator:\n- Username: emma.coord | Password: password | Name: Emma Rodriguez\n\nAdministrator:\n- Username: admin | Password: password | Name: System Admin\n\nCompliance:\n- Username: compliance | Password: password | Name: Compliance Officer\n\nAll accounts use 'password' as the password for simplicity in this POC environment.",
      tags: ["credentials", "login", "accounts", "demo", "testing"],
    },
    {
      question: "What seed data is available for testing?",
      answer: "The system comes pre-loaded with demo data:\n\n- 3 Members/Patients: Each with demographics, insurance info, and a member ID\n- Multiple Visits: Scheduled across different dates and visit types\n- Clinical History: 2 years of longitudinal data for each member:\n  - Lab results (A1C, lipids, CBC, metabolic panel)\n  - Vital sign history (BP, HR, SpO2, weight)\n  - Medication history (multiple active and discontinued medications)\n- Plan Packs: Insurance plan configurations with visit type checklists\n- Assessment Definitions: PHQ-2, PHQ-9, PRAPARE, AWV with questions and scoring bands\n- HEDIS Measure Definitions: Multiple quality measures with capture methods\n- Clinical Rules: 8 CDS rules for automated recommendations",
      tags: ["seed data", "demo data", "members", "patients", "testing"],
    },
  ],
};

const allSections: HelpSection[] = [
  gettingStartedSection,
  visitLifecycleSection,
  intakeSection,
  timelineSection,
  cdsSection,
  finalizationSection,
  supervisorSection,
  coordinationSection,
  adminSection,
  fhirSection,
  testingSection,
  credentialsSection,
];

export default function HelpSupport() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredSections = allSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }),
  })).filter((section) => section.items.length > 0);

  const totalResults = filteredSections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center justify-center w-10 h-10 rounded-md" style={{ backgroundColor: "#27749315" }}>
            <HelpCircle className="w-5 h-5" style={{ color: "#277493" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-help-title">Help & Support</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Comprehensive guide to all features, workflows, and testing procedures
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search help topics (e.g., vitals, FHIR, finalization, PHQ-9)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-help-search"
        />
      </div>

      {searchQuery.trim() && (
        <p className="text-sm text-muted-foreground" data-testid="text-search-results">
          {totalResults} result{totalResults !== 1 ? "s" : ""} found for "{searchQuery}"
        </p>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-help">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all" data-testid="tab-all">All Topics</TabsTrigger>
          <TabsTrigger value="workflows" data-testid="tab-workflows">Workflows</TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">Features</TabsTrigger>
          <TabsTrigger value="testing" data-testid="tab-testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {filteredSections.map((section) => (
            <HelpSectionCard key={section.id} section={section} />
          ))}
        </TabsContent>

        <TabsContent value="workflows" className="mt-4 space-y-4">
          {filteredSections
            .filter((s) => ["getting-started", "visit-lifecycle", "clinical-intake", "finalization", "supervisor-review", "care-coordination"].includes(s.id))
            .map((section) => (
              <HelpSectionCard key={section.id} section={section} />
            ))}
        </TabsContent>

        <TabsContent value="features" className="mt-4 space-y-4">
          {filteredSections
            .filter((s) => ["patient-timeline", "clinical-decision-support", "admin", "fhir"].includes(s.id))
            .map((section) => (
              <HelpSectionCard key={section.id} section={section} />
            ))}
        </TabsContent>

        <TabsContent value="testing" className="mt-4 space-y-4">
          {filteredSections
            .filter((s) => ["testing-guide", "demo-credentials"].includes(s.id))
            .map((section) => (
              <HelpSectionCard key={section.id} section={section} />
            ))}
        </TabsContent>
      </Tabs>

      {filteredSections.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <Search className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No results found</p>
            <p className="text-xs mt-1">Try different search terms or browse all topics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HelpSectionCard({ section }: { section: HelpSection }) {
  const Icon = section.icon;
  return (
    <Card data-testid={`section-${section.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center justify-center w-8 h-8 rounded-md" style={{ backgroundColor: "#2E456B15" }}>
            <Icon className="w-4 h-4" style={{ color: "#2E456B" }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{section.title}</h2>
            <p className="text-xs text-muted-foreground">{section.description}</p>
          </div>
          <Badge variant="secondary" className="text-xs ml-auto">
            {section.items.length} {section.items.length === 1 ? "topic" : "topics"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="multiple" className="w-full">
          {section.items.map((item, idx) => (
            <AccordionItem key={idx} value={`${section.id}-${idx}`}>
              <AccordionTrigger className="text-sm text-left hover:no-underline py-3" data-testid={`question-${section.id}-${idx}`}>
                {item.question}
              </AccordionTrigger>
              <AccordionContent>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed pb-2" data-testid={`answer-${section.id}-${idx}`}>
                  {item.answer}
                </div>
                {item.roles && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Relevant for:</span>
                    {item.roles.map((role) => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {role === "np" ? "NP" : role === "care_coordinator" ? "Care Coordinator" : role.charAt(0).toUpperCase() + role.slice(1)}
                      </Badge>
                    ))}
                  </div>
                )}
                {item.tags && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
