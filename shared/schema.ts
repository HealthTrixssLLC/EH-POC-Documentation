import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
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
  identityVerified: boolean("identity_verified").default(false),
  identityMethod: text("identity_method"),
  signedAt: text("signed_at"),
  signedBy: text("signed_by"),
  attestationText: text("attestation_text"),
  finalizedAt: text("finalized_at"),
  syncStatus: text("sync_status").default("draft_local"),
  travelNotes: text("travel_notes"),
  safetyNotes: text("safety_notes"),
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
  captureMethod: text("capture_method"),
  evidenceMetadata: jsonb("evidence_metadata"),
  unableToAssessReason: text("unable_to_assess_reason"),
  unableToAssessNote: text("unable_to_assess_note"),
  performerId: varchar("performer_id"),
  completedAt: text("completed_at"),
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
  version: text("version").notNull().default("1.0"),
  active: boolean("active").notNull().default(true),
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

export const ROLES = ["np", "supervisor", "care_coordinator", "admin", "compliance"] as const;
export type Role = typeof ROLES[number];

export const VISIT_STATUSES = ["scheduled", "in_progress", "ready_for_review", "finalized", "synced", "emr_submitted", "export_generated"] as const;
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
