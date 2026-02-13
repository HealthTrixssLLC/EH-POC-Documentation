import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("np"),
  email: text("email"),
  active: boolean("active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: text("member_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dob: text("dob").notNull(),
  gender: text("gender"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  insurancePlan: text("insurance_plan"),
  pcp: text("pcp"),
  conditions: text("conditions").array(),
  medications: text("medications").array(),
  allergies: text("allergies").array(),
  riskFlags: text("risk_flags").array(),
  planPackId: text("plan_pack_id"),
  planPackVersion: text("plan_pack_version"),
});

export const insertMemberSchema = createInsertSchema(members).omit({ id: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

export const visits = pgTable("visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  npUserId: varchar("np_user_id").notNull(),
  status: text("status").notNull().default("scheduled"),
  scheduledDate: text("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time"),
  visitType: text("visit_type").notNull().default("annual_wellness"),
  planId: text("plan_id"),
  planPackVersion: text("plan_pack_version"),
  identityVerified: boolean("identity_verified").default(false),
  identityMethod: text("identity_method"),
  signedAt: text("signed_at"),
  signedBy: text("signed_by"),
  attestationText: text("attestation_text"),
  finalizedAt: text("finalized_at"),
  syncStatus: text("sync_status").default("draft_local"),
  travelNotes: text("travel_notes"),
  safetyNotes: text("safety_notes"),
  lockedAt: text("locked_at"),
  lockedBy: text("locked_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVisitSchema = createInsertSchema(visits).omit({ id: true, createdAt: true });
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;

export const planTargets = pgTable("plan_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  visitId: varchar("visit_id"),
  targetType: text("target_type").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("medium"),
  status: text("status").default("open"),
  source: text("source"),
});

export const insertPlanTargetSchema = createInsertSchema(planTargets).omit({ id: true });
export type InsertPlanTarget = z.infer<typeof insertPlanTargetSchema>;
export type PlanTarget = typeof planTargets.$inferSelect;

export const assessmentDefinitions = pgTable("assessment_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instrumentId: text("instrument_id").notNull().unique(),
  name: text("name").notNull(),
  version: text("version").notNull().default("1.0"),
  category: text("category").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(),
  scoringRules: jsonb("scoring_rules"),
  interpretationBands: jsonb("interpretation_bands"),
  branchingRules: jsonb("branching_rules"),
  active: boolean("active").notNull().default(true),
});

export const insertAssessmentDefinitionSchema = createInsertSchema(assessmentDefinitions).omit({ id: true });
export type InsertAssessmentDefinition = z.infer<typeof insertAssessmentDefinitionSchema>;
export type AssessmentDefinition = typeof assessmentDefinitions.$inferSelect;

export const requiredChecklists = pgTable("required_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  itemType: text("item_type").notNull(),
  itemId: text("item_id").notNull(),
  itemName: text("item_name").notNull(),
  status: text("status").notNull().default("not_started"),
  unableToAssessReason: text("unable_to_assess_reason"),
  unableToAssessNote: text("unable_to_assess_note"),
  completedAt: text("completed_at"),
  completedBy: text("completed_by"),
});

export const insertRequiredChecklistSchema = createInsertSchema(requiredChecklists).omit({ id: true });
export type InsertRequiredChecklist = z.infer<typeof insertRequiredChecklistSchema>;
export type RequiredChecklist = typeof requiredChecklists.$inferSelect;

export const assessmentResponses = pgTable("assessment_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  instrumentId: text("instrument_id").notNull(),
  instrumentVersion: text("instrument_version").notNull(),
  responses: jsonb("responses").notNull(),
  computedScore: integer("computed_score"),
  interpretation: text("interpretation"),
  performerId: varchar("performer_id"),
  sourceContext: text("source_context").default("in_home"),
  completedAt: text("completed_at"),
  status: text("status").notNull().default("in_progress"),
});

export const insertAssessmentResponseSchema = createInsertSchema(assessmentResponses).omit({ id: true });
export type InsertAssessmentResponse = z.infer<typeof insertAssessmentResponseSchema>;
export type AssessmentResponse = typeof assessmentResponses.$inferSelect;

export const measureDefinitions = pgTable("measure_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  measureId: text("measure_id").notNull().unique(),
  name: text("name").notNull(),
  version: text("version").notNull().default("1.0"),
  category: text("category").notNull(),
  description: text("description"),
  requiredEvidenceType: text("required_evidence_type"),
  allowedCaptureMethods: text("allowed_capture_methods").array(),
  evaluationType: text("evaluation_type").notNull().default("evidence_based"),
  dataSource: text("data_source"),
  clinicalCriteria: jsonb("clinical_criteria"),
  cptCodes: text("cpt_codes").array(),
  cptIICodes: text("cpt_ii_codes").array(),
  hcpcsCodes: text("hcpcs_codes").array(),
  icdCodes: text("icd_codes").array(),
  active: boolean("active").notNull().default(true),
});

export const insertMeasureDefinitionSchema = createInsertSchema(measureDefinitions).omit({ id: true });
export type InsertMeasureDefinition = z.infer<typeof insertMeasureDefinitionSchema>;
export type MeasureDefinition = typeof measureDefinitions.$inferSelect;

export const measureResults = pgTable("measure_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  measureId: text("measure_id").notNull(),
  status: text("status").notNull().default("not_started"),
  result: text("result"),
  value: text("value"),
  captureMethod: text("capture_method"),
  evidenceMetadata: jsonb("evidence_metadata"),
  unableToAssessReason: text("unable_to_assess_reason"),
  unableToAssessNote: text("unable_to_assess_note"),
  performerId: varchar("performer_id"),
  completedAt: text("completed_at"),
  evaluatedAt: text("evaluated_at"),
});

export const insertMeasureResultSchema = createInsertSchema(measureResults).omit({ id: true });
export type InsertMeasureResult = z.infer<typeof insertMeasureResultSchema>;
export type MeasureResult = typeof measureResults.$inferSelect;

export const vitalsRecords = pgTable("vitals_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  systolic: integer("systolic"),
  diastolic: integer("diastolic"),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),
  temperature: real("temperature"),
  oxygenSaturation: integer("oxygen_saturation"),
  weight: real("weight"),
  height: real("height"),
  bmi: real("bmi"),
  painLevel: integer("pain_level"),
  notes: text("notes"),
  recordedBy: varchar("recorded_by"),
  recordedAt: text("recorded_at"),
  voiceInferredFields: jsonb("voice_inferred_fields"),
});

export const insertVitalsRecordSchema = createInsertSchema(vitalsRecords).omit({ id: true });
export type InsertVitalsRecord = z.infer<typeof insertVitalsRecordSchema>;
export type VitalsRecord = typeof vitalsRecords.$inferSelect;

export const clinicalNotes = pgTable("clinical_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  chiefComplaint: text("chief_complaint"),
  hpiNotes: text("hpi_notes"),
  rosNotes: text("ros_notes"),
  examNotes: text("exam_notes"),
  assessmentNotes: text("assessment_notes"),
  planNotes: text("plan_notes"),
  assessmentMeasuresSummary: text("assessment_measures_summary"),
  generatedAt: text("generated_at"),
  version: integer("version").default(1),
});

export const insertClinicalNoteSchema = createInsertSchema(clinicalNotes).omit({ id: true });
export type InsertClinicalNote = z.infer<typeof insertClinicalNoteSchema>;
export type ClinicalNote = typeof clinicalNotes.$inferSelect;

export const carePlanTasks = pgTable("care_plan_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  memberId: varchar("member_id").notNull(),
  taskType: text("task_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  assignedTo: varchar("assigned_to"),
  dueDate: text("due_date"),
  outcome: text("outcome"),
  outcomeNotes: text("outcome_notes"),
  completedAt: text("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCarePlanTaskSchema = createInsertSchema(carePlanTasks).omit({ id: true, createdAt: true });
export type InsertCarePlanTask = z.infer<typeof insertCarePlanTaskSchema>;
export type CarePlanTask = typeof carePlanTasks.$inferSelect;

export const reviewDecisions = pgTable("review_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  reviewerId: varchar("reviewer_id").notNull(),
  decision: text("decision").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewDecisionSchema = createInsertSchema(reviewDecisions).omit({ id: true, createdAt: true });
export type InsertReviewDecision = z.infer<typeof insertReviewDecisionSchema>;
export type ReviewDecision = typeof reviewDecisions.$inferSelect;

export const exportArtifacts = pgTable("export_artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  exportType: text("export_type").notNull().default("fhir_bundle"),
  status: text("status").notNull().default("pending"),
  fileData: text("file_data"),
  generatedAt: text("generated_at"),
  downloadCount: integer("download_count").default(0),
});

export const insertExportArtifactSchema = createInsertSchema(exportArtifacts).omit({ id: true });
export type InsertExportArtifact = z.infer<typeof insertExportArtifactSchema>;
export type ExportArtifact = typeof exportArtifacts.$inferSelect;

export const auditEvents = pgTable("audit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  userId: varchar("user_id"),
  userName: text("user_name"),
  userRole: text("user_role"),
  patientId: varchar("patient_id"),
  visitId: varchar("visit_id"),
  resourceType: text("resource_type"),
  resourceId: varchar("resource_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertAuditEventSchema = createInsertSchema(auditEvents).omit({ id: true, timestamp: true });
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEvents.$inferSelect;

export const planPacks = pgTable("plan_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: text("plan_id").notNull().unique(),
  planName: text("plan_name").notNull(),
  programId: text("program_id"),
  visitType: text("visit_type").notNull(),
  requiredAssessments: text("required_assessments").array(),
  requiredMeasures: text("required_measures").array(),
  identityVerificationRequired: boolean("identity_verification_required").notNull().default(false),
  noppRequired: boolean("nopp_required").notNull().default(true),
  version: text("version").notNull().default("1.0"),
  active: boolean("active").notNull().default(true),
  moduleEnables: jsonb("module_enables").$type<Record<string, boolean>>(),
  featureFlags: jsonb("feature_flags").$type<Record<string, any>>(),
  description: text("description"),
});

export const insertPlanPackSchema = createInsertSchema(planPacks).omit({ id: true });
export type InsertPlanPack = z.infer<typeof insertPlanPackSchema>;
export type PlanPack = typeof planPacks.$inferSelect;

// Clinical decision rules
export const clinicalRules = pgTable("clinical_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: text("rule_id").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  triggerSource: text("trigger_source").notNull(),
  triggerCondition: jsonb("trigger_condition").notNull(),
  recommendedAction: text("recommended_action").notNull(),
  recommendedItemType: text("recommended_item_type"),
  recommendedItemId: text("recommended_item_id"),
  priority: text("priority").notNull().default("medium"),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  severity: text("severity").notNull().default("warning"),
  documentationPrompt: text("documentation_prompt"),
  programScope: text("program_scope"),
});

export const insertClinicalRuleSchema = createInsertSchema(clinicalRules).omit({ id: true });
export type InsertClinicalRule = z.infer<typeof insertClinicalRuleSchema>;
export type ClinicalRule = typeof clinicalRules.$inferSelect;

// Triggered recommendations per visit
export const visitRecommendations = pgTable("visit_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  ruleId: text("rule_id").notNull(),
  ruleName: text("rule_name").notNull(),
  recommendation: text("recommendation").notNull(),
  status: text("status").notNull().default("pending"),
  dismissReason: text("dismiss_reason"),
  dismissNote: text("dismiss_note"),
  triggeredAt: text("triggered_at"),
  resolvedAt: text("resolved_at"),
});

export const insertVisitRecommendationSchema = createInsertSchema(visitRecommendations).omit({ id: true });
export type InsertVisitRecommendation = z.infer<typeof insertVisitRecommendationSchema>;
export type VisitRecommendation = typeof visitRecommendations.$inferSelect;

// Validation overrides (when NP overrides a warning)
export const validationOverrides = pgTable("validation_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  field: text("field").notNull(),
  warningType: text("warning_type").notNull(),
  warningMessage: text("warning_message").notNull(),
  overrideReason: text("override_reason").notNull(),
  overrideNote: text("override_note"),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertValidationOverrideSchema = createInsertSchema(validationOverrides).omit({ id: true, createdAt: true });
export type InsertValidationOverride = z.infer<typeof insertValidationOverrideSchema>;
export type ValidationOverride = typeof validationOverrides.$inferSelect;

// Visit coding (CPT, HCPCS, ICD-10)
export const visitCodes = pgTable("visit_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  codeType: text("code_type").notNull(),
  code: text("code").notNull(),
  description: text("description").notNull(),
  source: text("source"),
  autoAssigned: boolean("auto_assigned").notNull().default(true),
  verified: boolean("verified").notNull().default(false),
  removedByNp: boolean("removed_by_np").notNull().default(false),
  evidenceMap: jsonb("evidence_map"),
  evidenceStatus: text("evidence_status"),
  triggerComponents: text("trigger_components").array(),
});

export const insertVisitCodeSchema = createInsertSchema(visitCodes).omit({ id: true });
export type InsertVisitCode = z.infer<typeof insertVisitCodeSchema>;
export type VisitCode = typeof visitCodes.$inferSelect;

export const labResults = pgTable("lab_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  testName: text("test_name").notNull(),
  testCode: text("test_code"),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  referenceMin: real("reference_min"),
  referenceMax: real("reference_max"),
  status: text("status"),
  source: text("source").notNull().default("practice"),
  collectedDate: text("collected_date").notNull(),
  resultDate: text("result_date"),
  orderingProvider: text("ordering_provider"),
  category: text("category"),
  actorName: text("actor_name"),
  actorId: varchar("actor_id"),
  notes: text("notes"),
});

export const insertLabResultSchema = createInsertSchema(labResults).omit({ id: true });
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
export type LabResult = typeof labResults.$inferSelect;

export const medicationHistory = pgTable("medication_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  medicationName: text("medication_name").notNull(),
  genericName: text("generic_name"),
  dosage: text("dosage"),
  frequency: text("frequency"),
  route: text("route"),
  prescriber: text("prescriber"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  status: text("status").notNull().default("active"),
  source: text("source").notNull().default("practice"),
  category: text("category"),
  reason: text("reason"),
  changeType: text("change_type"),
  changeReason: text("change_reason"),
  actorName: text("actor_name"),
  actorId: varchar("actor_id"),
});

export const insertMedicationHistorySchema = createInsertSchema(medicationHistory).omit({ id: true });
export type InsertMedicationHistory = z.infer<typeof insertMedicationHistorySchema>;
export type MedicationHistory = typeof medicationHistory.$inferSelect;

export const vitalsHistory = pgTable("vitals_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  measureDate: text("measure_date").notNull(),
  systolic: integer("systolic"),
  diastolic: integer("diastolic"),
  heartRate: integer("heart_rate"),
  oxygenSaturation: integer("oxygen_saturation"),
  weight: real("weight"),
  bmi: real("bmi"),
  temperature: real("temperature"),
  respiratoryRate: integer("respiratory_rate"),
  source: text("source").notNull().default("practice"),
  actorName: text("actor_name"),
  actorId: varchar("actor_id"),
  notes: text("notes"),
});

export const insertVitalsHistorySchema = createInsertSchema(vitalsHistory).omit({ id: true });
export type InsertVitalsHistory = z.infer<typeof insertVitalsHistorySchema>;
export type VitalsHistory = typeof vitalsHistory.$inferSelect;

export const DATA_SOURCES = ["practice", "hie"] as const;
export type DataSource = typeof DATA_SOURCES[number];

export const LAB_CATEGORIES = ["metabolic", "lipid", "hematology", "thyroid", "renal", "hepatic", "cardiac", "diabetes"] as const;
export type LabCategory = typeof LAB_CATEGORIES[number];

export const MEDICATION_CATEGORIES = ["cardiovascular", "diabetes", "respiratory", "mental_health", "pain", "thyroid", "anticoagulant", "gastrointestinal", "other"] as const;
export type MedicationCategory = typeof MEDICATION_CATEGORIES[number];

export const MED_RECON_STATUSES = ["verified", "new", "modified", "discontinued", "held"] as const;
export type MedReconStatus = typeof MED_RECON_STATUSES[number];

export const MED_RECON_SOURCES = ["history", "home", "patient_report", "external"] as const;
export type MedReconSource = typeof MED_RECON_SOURCES[number];

export const medReconciliation = pgTable("med_reconciliation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  memberId: varchar("member_id").notNull(),
  medicationName: text("medication_name").notNull(),
  genericName: text("generic_name"),
  dosage: text("dosage"),
  frequency: text("frequency"),
  route: text("route"),
  status: text("status").notNull().default("verified"),
  source: text("source").notNull().default("history"),
  isBeersRisk: boolean("is_beers_risk").default(false),
  beersReason: text("beers_reason"),
  interactionFlags: text("interaction_flags").array(),
  category: text("category"),
  notes: text("notes"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  reconciledBy: varchar("reconciled_by"),
  reconciledAt: text("reconciled_at"),
});

export const insertMedReconciliationSchema = createInsertSchema(medReconciliation).omit({ id: true });
export type InsertMedReconciliation = z.infer<typeof insertMedReconciliationSchema>;
export type MedReconciliation = typeof medReconciliation.$inferSelect;

export const EXCLUSION_REASONS = [
  "Patient declined",
  "Not clinically appropriate",
  "Safety concern",
  "Patient not present",
  "Equipment unavailable",
  "Time constraints",
  "Already completed externally",
  "Contraindicated",
  "Deferred to specialist",
  "Other (see notes)",
] as const;

export const reasonCodes = pgTable("reason_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  code: text("code").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertReasonCodeSchema = createInsertSchema(reasonCodes).omit({ id: true });
export type InsertReasonCode = z.infer<typeof insertReasonCodeSchema>;
export type ReasonCode = typeof reasonCodes.$inferSelect;

export const completenessRules = pgTable("completeness_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planPackId: text("plan_pack_id").notNull(),
  componentType: text("component_type").notNull(),
  componentId: text("component_id"),
  label: text("label").notNull(),
  description: text("description"),
  required: boolean("required").notNull().default(true),
  exceptionAllowed: boolean("exception_allowed").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertCompletenessRuleSchema = createInsertSchema(completenessRules).omit({ id: true });
export type InsertCompletenessRule = z.infer<typeof insertCompletenessRuleSchema>;
export type CompletenessRule = typeof completenessRules.$inferSelect;

export const diagnosisRules = pgTable("diagnosis_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  icdCode: text("icd_code").notNull(),
  icdDescription: text("icd_description").notNull(),
  category: text("category").notNull(),
  requiredEvidence: jsonb("required_evidence").notNull(),
  active: boolean("active").notNull().default(true),
});

export const insertDiagnosisRuleSchema = createInsertSchema(diagnosisRules).omit({ id: true });
export type InsertDiagnosisRule = z.infer<typeof insertDiagnosisRuleSchema>;
export type DiagnosisRule = typeof diagnosisRules.$inferSelect;

export const reviewSignOffs = pgTable("review_sign_offs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  reviewerId: varchar("reviewer_id").notNull(),
  reviewerName: text("reviewer_name").notNull(),
  decision: text("decision").notNull(),
  comments: text("comments"),
  returnReasons: jsonb("return_reasons"),
  completenessScore: integer("completeness_score"),
  diagnosisSupportScore: integer("diagnosis_support_score"),
  qualityFlags: jsonb("quality_flags"),
  signedAt: text("signed_at").notNull(),
  attestationText: text("attestation_text"),
});

export const insertReviewSignOffSchema = createInsertSchema(reviewSignOffs).omit({ id: true });
export type InsertReviewSignOff = z.infer<typeof insertReviewSignOffSchema>;
export type ReviewSignOff = typeof reviewSignOffs.$inferSelect;

export const RETURN_REASON_CATEGORIES = [
  { code: "incomplete_assessment", label: "Incomplete Assessment", description: "One or more required assessments are missing or incomplete" },
  { code: "missing_vitals", label: "Missing Vital Signs", description: "Vital signs are not documented or partially recorded" },
  { code: "unsupported_diagnosis", label: "Unsupported Diagnosis", description: "One or more diagnoses lack sufficient clinical evidence" },
  { code: "documentation_gap", label: "Documentation Gap", description: "Required clinical documentation is missing or insufficient" },
  { code: "coding_error", label: "Coding Error", description: "CPT/ICD-10 codes are incorrect or missing linkage" },
  { code: "medication_reconciliation", label: "Medication Reconciliation Issue", description: "Medication list is incomplete or has unresolved discrepancies" },
  { code: "consent_missing", label: "Missing Consent/NOPP", description: "Required consent or NOPP acknowledgement is not documented" },
  { code: "quality_measure", label: "Quality Measure Gap", description: "HEDIS/quality measures not properly documented" },
  { code: "clinical_concern", label: "Clinical Concern", description: "Clinical findings require additional review or follow-up" },
  { code: "other", label: "Other", description: "Other reason requiring correction" },
] as const;

export const REASON_CODE_CATEGORIES = [
  "unable_to_assess",
  "patient_declined",
  "deferred",
  "clinical_contraindication",
  "equipment_unavailable",
  "environmental",
  "cognitive_barrier",
  "consent_exception",
] as const;

export const objectiveExclusions = pgTable("objective_exclusions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  objectiveKey: text("objective_key").notNull(),
  objectiveLabel: text("objective_label").notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
  excludedBy: varchar("excluded_by"),
  excludedAt: text("excluded_at"),
});

export const insertObjectiveExclusionSchema = createInsertSchema(objectiveExclusions).omit({ id: true });
export type InsertObjectiveExclusion = z.infer<typeof insertObjectiveExclusionSchema>;
export type ObjectiveExclusion = typeof objectiveExclusions.$inferSelect;

export const visitConsents = pgTable("visit_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  consentType: text("consent_type").notNull(),
  status: text("status").notNull().default("pending"),
  method: text("method"),
  exceptionReason: text("exception_reason"),
  exceptionNote: text("exception_note"),
  capturedBy: varchar("captured_by"),
  capturedByName: text("captured_by_name"),
  capturedAt: text("captured_at"),
  notes: text("notes"),
});

export const insertVisitConsentSchema = createInsertSchema(visitConsents).omit({ id: true });
export type InsertVisitConsent = z.infer<typeof insertVisitConsentSchema>;
export type VisitConsent = typeof visitConsents.$inferSelect;

export const CONSENT_TYPES = ["voice_transcription", "nopp"] as const;
export const CONSENT_STATUSES = ["pending", "granted", "declined", "exception"] as const;
export const CONSENT_METHODS = ["verbal", "written", "digital", "previously_delivered"] as const;
export const NOPP_EXCEPTION_REASONS = [
  "Patient refused to acknowledge",
  "Patient incapacitated",
  "Language barrier - interpreter unavailable",
  "Previously delivered and on file",
  "Emergency visit - deferred",
  "Legal guardian unavailable",
  "Other (see notes)",
] as const;

export const ROLES = ["np", "supervisor", "care_coordinator", "admin", "compliance"] as const;
export type Role = typeof ROLES[number];

export const VISIT_STATUSES = ["scheduled", "in_progress", "ready_for_review", "approved", "correction_requested", "finalized", "synced", "emr_submitted", "export_generated"] as const;
export type VisitStatus = typeof VISIT_STATUSES[number];

export const CHECKLIST_STATUSES = ["not_started", "in_progress", "complete", "unable_to_assess"] as const;
export type ChecklistStatus = typeof CHECKLIST_STATUSES[number];

export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];

export const UNABLE_TO_ASSESS_REASONS = [
  "Patient declined",
  "Not clinically appropriate",
  "Safety issue",
  "Unable to obtain information",
  "Patient not present",
  "Equipment unavailable",
  "Time constraints",
  "Other",
] as const;

export const VALIDATION_OVERRIDE_REASONS = [
  "Confirmed with patient",
  "Known outlier for this patient",
  "Equipment recalibrated and verified",
  "Value consistent with clinical presentation",
  "Documented in prior records",
  "Patient has known condition explaining value",
  "Measurement repeated and confirmed",
  "Other (see notes)",
] as const;

export const RECOMMENDATION_DISMISS_REASONS = [
  "Already addressed in prior visit",
  "Not clinically indicated",
  "Patient declined",
  "Will address in follow-up",
  "Duplicate of existing order",
  "Outside scope of this visit",
  "Other (see notes)",
] as const;

export const CODE_TYPES = ["CPT", "HCPCS", "ICD-10"] as const;
export type CodeType = typeof CODE_TYPES[number];

export const AI_PROVIDER_TYPES = ["openai", "anthropic", "azure_openai"] as const;
export type AiProviderType = typeof AI_PROVIDER_TYPES[number];

export const aiProviderConfig = pgTable("ai_provider_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerType: text("provider_type").notNull().default("openai"),
  displayName: text("display_name").notNull(),
  apiKeySecretName: text("api_key_secret_name").notNull(),
  baseUrl: text("base_url"),
  modelName: text("model_name").notNull().default("whisper-1"),
  extractionModel: text("extraction_model").notNull().default("gpt-4o-mini"),
  active: boolean("active").notNull().default(true),
  featureFlags: jsonb("feature_flags").$type<Record<string, boolean>>(),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const insertAiProviderConfigSchema = createInsertSchema(aiProviderConfig).omit({ id: true });
export type InsertAiProviderConfig = z.infer<typeof insertAiProviderConfigSchema>;
export type AiProviderConfig = typeof aiProviderConfig.$inferSelect;

export const RECORDING_STATUSES = ["recording", "completed", "transcribing", "transcribed", "error"] as const;
export type RecordingStatus = typeof RECORDING_STATUSES[number];

export const voiceRecordings = pgTable("voice_recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  recordedBy: varchar("recorded_by"),
  recordedByName: text("recorded_by_name"),
  mimeType: text("mime_type").notNull().default("audio/webm"),
  durationSec: real("duration_sec"),
  audioData: text("audio_data"),
  status: text("status").notNull().default("completed"),
  consentId: varchar("consent_id"),
  createdAt: text("created_at"),
});

export const insertVoiceRecordingSchema = createInsertSchema(voiceRecordings).omit({ id: true });
export type InsertVoiceRecording = z.infer<typeof insertVoiceRecordingSchema>;
export type VoiceRecording = typeof voiceRecordings.$inferSelect;

export const TRANSCRIPT_STATUSES = ["pending", "processing", "completed", "error"] as const;
export type TranscriptStatus = typeof TRANSCRIPT_STATUSES[number];

export const transcripts = pgTable("transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  recordingId: varchar("recording_id"),
  providerType: text("provider_type"),
  model: text("model"),
  text: text("text"),
  confidence: real("confidence"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const insertTranscriptSchema = createInsertSchema(transcripts).omit({ id: true });
export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type Transcript = typeof transcripts.$inferSelect;

export const EXTRACTION_STATUSES = ["pending", "accepted", "rejected", "edited"] as const;
export type ExtractionStatus = typeof EXTRACTION_STATUSES[number];

export const extractedFields = pgTable("extracted_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  transcriptId: varchar("transcript_id").notNull(),
  fieldKey: text("field_key").notNull(),
  fieldLabel: text("field_label").notNull(),
  category: text("category"),
  proposedValue: text("proposed_value"),
  confidence: real("confidence"),
  sourceSnippet: text("source_snippet"),
  status: text("status").notNull().default("pending"),
  acceptedBy: varchar("accepted_by"),
  acceptedByName: text("accepted_by_name"),
  acceptedAt: text("accepted_at"),
  editedValue: text("edited_value"),
});

export const insertExtractedFieldSchema = createInsertSchema(extractedFields).omit({ id: true });
export type InsertExtractedField = z.infer<typeof insertExtractedFieldSchema>;
export type ExtractedField = typeof extractedFields.$inferSelect;

export const ALERT_SEVERITIES = ["info", "warning", "critical", "emergency"] as const;
export type AlertSeverity = typeof ALERT_SEVERITIES[number];

export const visitAlerts = pgTable("visit_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  ruleId: text("rule_id").notNull(),
  ruleName: text("rule_name").notNull(),
  severity: text("severity").notNull().default("warning"),
  message: text("message").notNull(),
  recommendedAction: text("recommended_action"),
  status: text("status").notNull().default("active"),
  acknowledgedBy: varchar("acknowledged_by"),
  acknowledgedByName: text("acknowledged_by_name"),
  acknowledgedAt: text("acknowledged_at"),
  dismissedBy: varchar("dismissed_by"),
  dismissedByName: text("dismissed_by_name"),
  dismissedAt: text("dismissed_at"),
  dismissReason: text("dismiss_reason"),
  actionTaken: text("action_taken"),
  triggeredAt: text("triggered_at"),
});

export const insertVisitAlertSchema = createInsertSchema(visitAlerts).omit({ id: true });
export type InsertVisitAlert = z.infer<typeof insertVisitAlertSchema>;
export type VisitAlert = typeof visitAlerts.$inferSelect;

export const noteEdits = pgTable("note_edits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  section: text("section").notNull(),
  previousContent: text("previous_content"),
  newContent: text("new_content"),
  editedBy: varchar("edited_by").notNull(),
  editedByName: text("edited_by_name").notNull(),
  editReason: text("edit_reason"),
  editedAt: text("edited_at").notNull(),
});

export const insertNoteEditSchema = createInsertSchema(noteEdits).omit({ id: true });
export type InsertNoteEdit = z.infer<typeof insertNoteEditSchema>;
export type NoteEdit = typeof noteEdits.$inferSelect;

export const noteSignatures = pgTable("note_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  signatureType: text("signature_type").notNull(),
  signedBy: varchar("signed_by").notNull(),
  signedByName: text("signed_by_name").notNull(),
  role: text("role").notNull(),
  attestationText: text("attestation_text"),
  signedAt: text("signed_at").notNull(),
});

export const insertNoteSignatureSchema = createInsertSchema(noteSignatures).omit({ id: true });
export type InsertNoteSignature = z.infer<typeof insertNoteSignatureSchema>;
export type NoteSignature = typeof noteSignatures.$inferSelect;

export const demoConfig = pgTable("demo_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  demoMode: boolean("demo_mode").default(false),
  watermarkText: text("watermark_text").default("DEMO MODE"),
  allowedRoles: jsonb("allowed_roles").$type<string[]>(),
  restrictedModules: jsonb("restricted_modules").$type<string[]>(),
  maxExportsPerDay: integer("max_exports_per_day").default(10),
  updatedAt: text("updated_at"),
  updatedBy: varchar("updated_by"),
});

export const insertDemoConfigSchema = createInsertSchema(demoConfig).omit({ id: true });
export type InsertDemoConfig = z.infer<typeof insertDemoConfigSchema>;
export type DemoConfig = typeof demoConfig.$inferSelect;

export const auditAssignments = pgTable("audit_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  assignedTo: varchar("assigned_to"),
  assignedToName: text("assigned_to_name"),
  status: text("status").notNull().default("pending"),
  samplingReason: text("sampling_reason"),
  priority: text("priority").default("normal"),
  dueDate: text("due_date"),
  assignedAt: text("assigned_at").notNull(),
  completedAt: text("completed_at"),
});

export const insertAuditAssignmentSchema = createInsertSchema(auditAssignments).omit({ id: true });
export type InsertAuditAssignment = z.infer<typeof insertAuditAssignmentSchema>;
export type AuditAssignment = typeof auditAssignments.$inferSelect;

export const auditOutcomes = pgTable("audit_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull(),
  visitId: varchar("visit_id").notNull(),
  reviewerId: varchar("reviewer_id").notNull(),
  reviewerName: text("reviewer_name").notNull(),
  findings: jsonb("findings").$type<{ category: string; description: string; severity: string }[]>(),
  overallSeverity: text("overall_severity").notNull(),
  recommendation: text("recommendation").notNull(),
  notes: text("notes"),
  completedAt: text("completed_at").notNull(),
});

export const insertAuditOutcomeSchema = createInsertSchema(auditOutcomes).omit({ id: true });
export type InsertAuditOutcome = z.infer<typeof insertAuditOutcomeSchema>;
export type AuditOutcome = typeof auditOutcomes.$inferSelect;

// CR-002: HIE Pre-Visit Intelligence
export const hieIngestionLog = pgTable("hie_ingestion_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  memberId: varchar("member_id").notNull(),
  bundleId: varchar("bundle_id"),
  sourceSystem: text("source_system").notNull().default("EH"),
  resourceCount: integer("resource_count").notNull().default(0),
  resourceSummary: jsonb("resource_summary").$type<Record<string, number>>(),
  status: text("status").notNull().default("processing"),
  errorDetails: text("error_details").array(),
  receivedAt: text("received_at").notNull(),
  processedAt: text("processed_at"),
  processedBy: text("processed_by").default("system"),
});

export const insertHieIngestionLogSchema = createInsertSchema(hieIngestionLog).omit({ id: true });
export type InsertHieIngestionLog = z.infer<typeof insertHieIngestionLogSchema>;
export type HieIngestionLog = typeof hieIngestionLog.$inferSelect;

export const suspectedConditions = pgTable("suspected_conditions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  memberId: varchar("member_id").notNull(),
  icdCode: text("icd_code").notNull(),
  description: text("description").notNull(),
  hieSource: text("hie_source").default("EH"),
  confidence: text("confidence").default("suspected"),
  status: text("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by"),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: text("reviewed_at"),
  dismissalReason: text("dismissal_reason"),
  linkedCodeId: varchar("linked_code_id"),
  ingestionLogId: varchar("ingestion_log_id"),
  createdAt: text("created_at"),
}, (table) => [
  unique("uq_suspected_visit_icd").on(table.visitId, table.icdCode),
]);

export const insertSuspectedConditionSchema = createInsertSchema(suspectedConditions).omit({ id: true });
export type InsertSuspectedCondition = z.infer<typeof insertSuspectedConditionSchema>;
export type SuspectedCondition = typeof suspectedConditions.$inferSelect;

export const AUDIT_FINDING_CATEGORIES = [
  { code: "documentation_quality", label: "Documentation Quality", description: "Completeness and accuracy of clinical documentation" },
  { code: "coding_accuracy", label: "Coding Accuracy", description: "CPT/ICD-10 code correctness and specificity" },
  { code: "clinical_appropriateness", label: "Clinical Appropriateness", description: "Clinical decisions align with guidelines" },
  { code: "regulatory_compliance", label: "Regulatory Compliance", description: "HEDIS, NCQA, and CMS compliance" },
  { code: "consent_verification", label: "Consent Verification", description: "Consent and NOPP properly documented" },
  { code: "assessment_completeness", label: "Assessment Completeness", description: "All required screenings performed" },
  { code: "medication_safety", label: "Medication Safety", description: "Medication reconciliation and safety checks" },
  { code: "care_coordination", label: "Care Coordination", description: "Referrals and follow-up properly documented" },
] as const;

export const AUDIT_SEVERITIES = ["none", "minor", "moderate", "major", "critical"] as const;
export const AUDIT_RECOMMENDATIONS = ["accept", "accept_with_findings", "remediate", "escalate"] as const;
