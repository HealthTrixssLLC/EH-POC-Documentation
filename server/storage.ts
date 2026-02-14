import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users, members, visits, planTargets, assessmentDefinitions,
  requiredChecklists, assessmentResponses, measureDefinitions,
  measureResults, vitalsRecords, clinicalNotes, carePlanTasks,
  reviewDecisions, exportArtifacts, auditEvents, planPacks,
  clinicalRules, visitRecommendations, validationOverrides, visitCodes,
  labResults, medicationHistory, vitalsHistory, medReconciliation,
  type User, type InsertUser, type Member, type InsertMember,
  type Visit, type InsertVisit, type PlanTarget, type InsertPlanTarget,
  type AssessmentDefinition, type InsertAssessmentDefinition,
  type RequiredChecklist, type InsertRequiredChecklist,
  type AssessmentResponse, type InsertAssessmentResponse,
  type MeasureDefinition, type InsertMeasureDefinition,
  type MeasureResult, type InsertMeasureResult,
  type VitalsRecord, type InsertVitalsRecord,
  type ClinicalNote, type InsertClinicalNote,
  type CarePlanTask, type InsertCarePlanTask,
  type ReviewDecision, type InsertReviewDecision,
  type ExportArtifact, type InsertExportArtifact,
  type AuditEvent, type InsertAuditEvent,
  type PlanPack, type InsertPlanPack,
  type ClinicalRule, type InsertClinicalRule,
  type VisitRecommendation, type InsertVisitRecommendation,
  type ValidationOverride, type InsertValidationOverride,
  type VisitCode, type InsertVisitCode,
  type LabResult, type InsertLabResult,
  type MedicationHistory, type InsertMedicationHistory,
  type VitalsHistory, type InsertVitalsHistory,
  type MedReconciliation, type InsertMedReconciliation,
  objectiveExclusions,
  type ObjectiveExclusion, type InsertObjectiveExclusion,
  visitConsents,
  type VisitConsent, type InsertVisitConsent,
  reasonCodes,
  type ReasonCode, type InsertReasonCode,
  completenessRules,
  type CompletenessRule, type InsertCompletenessRule,
  diagnosisRules,
  type DiagnosisRule, type InsertDiagnosisRule,
  reviewSignOffs,
  type ReviewSignOff, type InsertReviewSignOff,
  aiProviderConfig,
  type AiProviderConfig, type InsertAiProviderConfig,
  voiceRecordings,
  type VoiceRecording, type InsertVoiceRecording,
  transcripts,
  type Transcript, type InsertTranscript,
  extractedFields,
  type ExtractedField, type InsertExtractedField,
  visitAlerts, noteEdits, noteSignatures,
  type VisitAlert, type InsertVisitAlert,
  type NoteEdit, type InsertNoteEdit,
  type NoteSignature, type InsertNoteSignature,
  demoConfig,
  type DemoConfig, type InsertDemoConfig,
  auditAssignments,
  type AuditAssignment, type InsertAuditAssignment,
  auditOutcomes,
  type AuditOutcome, type InsertAuditOutcome,
  hieIngestionLog,
  type HieIngestionLog, type InsertHieIngestionLog,
  suspectedConditions,
  type SuspectedCondition, type InsertSuspectedCondition,
  securitySettings,
  type SecuritySettings, type InsertSecuritySettings,
  mfaCodes,
  type MfaCode, type InsertMfaCode,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  getMember(id: string): Promise<Member | undefined>;
  getAllMembers(): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;

  getVisit(id: string): Promise<Visit | undefined>;
  getVisitsByNp(npUserId: string): Promise<Visit[]>;
  getAllVisits(): Promise<Visit[]>;
  getVisitsForReview(): Promise<Visit[]>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: string, updates: Partial<Visit>): Promise<Visit | undefined>;

  getPlanTargets(memberId: string): Promise<PlanTarget[]>;
  createPlanTarget(target: InsertPlanTarget): Promise<PlanTarget>;

  getAssessmentDefinition(instrumentId: string): Promise<AssessmentDefinition | undefined>;
  getAllAssessmentDefinitions(): Promise<AssessmentDefinition[]>;
  createAssessmentDefinition(def: InsertAssessmentDefinition): Promise<AssessmentDefinition>;

  getChecklistByVisit(visitId: string): Promise<RequiredChecklist[]>;
  createChecklistItem(item: InsertRequiredChecklist): Promise<RequiredChecklist>;
  updateChecklistItem(id: string, updates: Partial<RequiredChecklist>): Promise<RequiredChecklist | undefined>;
  getChecklistItemByVisitAndItem(visitId: string, itemId: string): Promise<RequiredChecklist | undefined>;
  deleteChecklistItem(id: string): Promise<void>;

  getAssessmentResponse(visitId: string, instrumentId: string): Promise<AssessmentResponse | undefined>;
  createAssessmentResponse(response: InsertAssessmentResponse): Promise<AssessmentResponse>;
  updateAssessmentResponse(id: string, updates: Partial<AssessmentResponse>): Promise<AssessmentResponse | undefined>;

  getMeasureDefinition(measureId: string): Promise<MeasureDefinition | undefined>;
  getAllMeasureDefinitions(): Promise<MeasureDefinition[]>;
  createMeasureDefinition(def: InsertMeasureDefinition): Promise<MeasureDefinition>;

  getMeasureResult(visitId: string, measureId: string): Promise<MeasureResult | undefined>;
  createMeasureResult(result: InsertMeasureResult): Promise<MeasureResult>;
  updateMeasureResult(id: string, updates: Partial<MeasureResult>): Promise<MeasureResult | undefined>;

  getVitalsByVisit(visitId: string): Promise<VitalsRecord | undefined>;
  createVitals(vitals: InsertVitalsRecord): Promise<VitalsRecord>;
  updateVitals(id: string, updates: Partial<VitalsRecord>): Promise<VitalsRecord | undefined>;

  getClinicalNote(visitId: string): Promise<ClinicalNote | undefined>;
  createClinicalNote(note: InsertClinicalNote): Promise<ClinicalNote>;
  updateClinicalNote(id: string, updates: Partial<ClinicalNote>): Promise<ClinicalNote | undefined>;

  getTasksByVisit(visitId: string): Promise<CarePlanTask[]>;
  getAllTasks(): Promise<CarePlanTask[]>;
  createTask(task: InsertCarePlanTask): Promise<CarePlanTask>;
  updateTask(id: string, updates: Partial<CarePlanTask>): Promise<CarePlanTask | undefined>;

  getReviewsByVisit(visitId: string): Promise<ReviewDecision[]>;
  createReview(review: InsertReviewDecision): Promise<ReviewDecision>;

  createExportArtifact(artifact: InsertExportArtifact): Promise<ExportArtifact>;

  getAuditEvents(): Promise<AuditEvent[]>;
  createAuditEvent(event: InsertAuditEvent): Promise<AuditEvent>;

  getPlanPack(planId: string): Promise<PlanPack | undefined>;
  getAllPlanPacks(): Promise<PlanPack[]>;
  createPlanPack(pack: InsertPlanPack): Promise<PlanPack>;

  getVisitsEnriched(): Promise<(Visit & { memberName: string; address: string })[]>;
  getTasksEnriched(): Promise<(CarePlanTask & { memberName: string })[]>;
  getReviewVisitsEnriched(): Promise<(Visit & { memberName: string; npName: string; reviewStatus: string | null })[]>;
  getMemberMap(): Promise<Map<string, Member>>;

  getAllClinicalRules(): Promise<ClinicalRule[]>;
  createClinicalRule(rule: InsertClinicalRule): Promise<ClinicalRule>;
  getRecommendationsByVisit(visitId: string): Promise<VisitRecommendation[]>;
  createRecommendation(rec: InsertVisitRecommendation): Promise<VisitRecommendation>;
  updateRecommendation(id: string, updates: Partial<VisitRecommendation>): Promise<VisitRecommendation>;
  getOverridesByVisit(visitId: string): Promise<ValidationOverride[]>;
  createOverride(override: InsertValidationOverride): Promise<ValidationOverride>;
  getCodesByVisit(visitId: string): Promise<VisitCode[]>;
  createVisitCode(code: InsertVisitCode): Promise<VisitCode>;
  deleteVisitCodesByVisit(visitId: string): Promise<void>;
  updateVisitCode(id: string, updates: Partial<VisitCode>): Promise<VisitCode>;

  getLabResultsByMember(memberId: string): Promise<LabResult[]>;
  createLabResult(lab: InsertLabResult): Promise<LabResult>;
  getMedicationHistoryByMember(memberId: string): Promise<MedicationHistory[]>;
  createMedicationHistory(med: InsertMedicationHistory): Promise<MedicationHistory>;
  updateMedicationHistory(id: string, data: Partial<InsertMedicationHistory>): Promise<MedicationHistory>;
  getVitalsHistoryByMember(memberId: string): Promise<VitalsHistory[]>;
  createVitalsHistory(vitals: InsertVitalsHistory): Promise<VitalsHistory>;
  updateVitalsHistory(id: string, data: Partial<InsertVitalsHistory>): Promise<VitalsHistory>;

  getMeasureResultsByVisit(visitId: string): Promise<MeasureResult[]>;

  getMedReconciliationByVisit(visitId: string): Promise<MedReconciliation[]>;
  createMedReconciliation(med: InsertMedReconciliation): Promise<MedReconciliation>;
  updateMedReconciliation(id: string, updates: Partial<MedReconciliation>): Promise<MedReconciliation | undefined>;
  deleteMedReconciliation(id: string): Promise<void>;

  getMemberByMemberId(memberId: string): Promise<Member | undefined>;
  updateMember(id: string, updates: Partial<Member>): Promise<Member | undefined>;
  getAssessmentResponsesByVisit(visitId: string): Promise<AssessmentResponse[]>;
  getVisitsByMember(memberId: string): Promise<Visit[]>;

  getExclusionsByVisit(visitId: string): Promise<ObjectiveExclusion[]>;
  createExclusion(excl: InsertObjectiveExclusion): Promise<ObjectiveExclusion>;
  deleteExclusion(id: string): Promise<void>;

  getConsentsByVisit(visitId: string): Promise<VisitConsent[]>;
  createConsent(consent: InsertVisitConsent): Promise<VisitConsent>;
  updateConsent(id: string, updates: Partial<VisitConsent>): Promise<VisitConsent | undefined>;

  getReasonCodes(category?: string): Promise<ReasonCode[]>;
  createReasonCode(code: InsertReasonCode): Promise<ReasonCode>;

  getCompletenessRules(planPackId: string): Promise<CompletenessRule[]>;
  createCompletenessRule(rule: InsertCompletenessRule): Promise<CompletenessRule>;

  getDiagnosisRules(): Promise<DiagnosisRule[]>;
  getDiagnosisRuleByCode(icdCode: string): Promise<DiagnosisRule | undefined>;
  createDiagnosisRule(rule: InsertDiagnosisRule): Promise<DiagnosisRule>;

  getReviewSignOffs(visitId: string): Promise<ReviewSignOff[]>;
  createReviewSignOff(signOff: InsertReviewSignOff): Promise<ReviewSignOff>;

  getAiProviderConfigs(): Promise<AiProviderConfig[]>;
  getActiveAiProvider(): Promise<AiProviderConfig | undefined>;
  getAiProviderConfig(id: string): Promise<AiProviderConfig | undefined>;
  createAiProviderConfig(config: InsertAiProviderConfig): Promise<AiProviderConfig>;
  updateAiProviderConfig(id: string, updates: Partial<AiProviderConfig>): Promise<AiProviderConfig | undefined>;
  deleteAiProviderConfig(id: string): Promise<boolean>;

  getRecordingsByVisit(visitId: string): Promise<VoiceRecording[]>;
  getRecording(id: string): Promise<VoiceRecording | undefined>;
  createRecording(recording: InsertVoiceRecording): Promise<VoiceRecording>;
  updateRecording(id: string, updates: Partial<VoiceRecording>): Promise<VoiceRecording | undefined>;

  getTranscriptsByVisit(visitId: string): Promise<Transcript[]>;
  getTranscript(id: string): Promise<Transcript | undefined>;
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;
  updateTranscript(id: string, updates: Partial<Transcript>): Promise<Transcript | undefined>;

  getExtractedFieldsByVisit(visitId: string): Promise<ExtractedField[]>;
  getExtractedFieldsByTranscript(transcriptId: string): Promise<ExtractedField[]>;
  getExtractedField(id: string): Promise<ExtractedField | undefined>;
  createExtractedField(field: InsertExtractedField): Promise<ExtractedField>;
  updateExtractedField(id: string, updates: Partial<ExtractedField>): Promise<ExtractedField | undefined>;
  createExtractedFields(fields: InsertExtractedField[]): Promise<ExtractedField[]>;

  // Visit Alerts (CR-001-12)
  getAlertsByVisit(visitId: string): Promise<VisitAlert[]>;
  createVisitAlert(alert: InsertVisitAlert): Promise<VisitAlert>;
  updateVisitAlert(id: string, updates: Partial<VisitAlert>): Promise<VisitAlert | undefined>;

  // Note Edits (CR-001-16)
  getNoteEditsByVisit(visitId: string): Promise<NoteEdit[]>;
  createNoteEdit(edit: InsertNoteEdit): Promise<NoteEdit>;

  // Note Signatures (CR-001-16)
  getNoteSignaturesByVisit(visitId: string): Promise<NoteSignature[]>;
  createNoteSignature(sig: InsertNoteSignature): Promise<NoteSignature>;

  // Plan Pack updates (CR-001-15)
  updatePlanPack(id: string, updates: Partial<PlanPack>): Promise<PlanPack | undefined>;

  // Clinical Rule updates (CR-001-12)
  updateClinicalRule(id: string, updates: Partial<ClinicalRule>): Promise<ClinicalRule | undefined>;

  // Demo Config (CR-001-18)
  getDemoConfig(): Promise<DemoConfig | undefined>;
  upsertDemoConfig(config: Partial<DemoConfig>): Promise<DemoConfig>;

  // Audit Assignments & Outcomes (CR-001-19)
  getAuditAssignments(): Promise<AuditAssignment[]>;
  getAuditAssignment(id: string): Promise<AuditAssignment | undefined>;
  createAuditAssignment(assignment: InsertAuditAssignment): Promise<AuditAssignment>;
  updateAuditAssignment(id: string, updates: Partial<AuditAssignment>): Promise<AuditAssignment | undefined>;
  getAuditOutcomesByAssignment(assignmentId: string): Promise<AuditOutcome[]>;
  getAuditOutcomesByVisit(visitId: string): Promise<AuditOutcome[]>;
  createAuditOutcome(outcome: InsertAuditOutcome): Promise<AuditOutcome>;

  // Review Sign-offs for rework tracking (CR-001-20)
  getAllReviewSignOffs(): Promise<ReviewSignOff[]>;

  // CR-002: HIE Pre-Visit Intelligence
  createHieIngestionLog(log: InsertHieIngestionLog): Promise<HieIngestionLog>;
  getHieIngestionLogsByVisit(visitId: string): Promise<HieIngestionLog[]>;
  getHieIngestionLogByBundleId(visitId: string, bundleId: string): Promise<HieIngestionLog | undefined>;
  updateHieIngestionLog(id: string, updates: Partial<HieIngestionLog>): Promise<HieIngestionLog | undefined>;

  createSuspectedCondition(cond: InsertSuspectedCondition): Promise<SuspectedCondition>;
  getSuspectedConditionsByVisit(visitId: string): Promise<SuspectedCondition[]>;
  getSuspectedCondition(id: string): Promise<SuspectedCondition | undefined>;
  getSuspectedConditionByVisitAndCode(visitId: string, icdCode: string): Promise<SuspectedCondition | undefined>;
  updateSuspectedCondition(id: string, updates: Partial<SuspectedCondition>): Promise<SuspectedCondition | undefined>;

  getSecuritySettings(): Promise<SecuritySettings | undefined>;
  upsertSecuritySettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings>;
  createMfaCode(entry: InsertMfaCode): Promise<MfaCode>;
  getLatestMfaCode(userId: string): Promise<MfaCode | undefined>;
  updateMfaCode(id: string, updates: Partial<MfaCode>): Promise<MfaCode | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getAllUsers() {
    return db.select().from(users);
  }

  async getMember(id: string) {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async getAllMembers() {
    return db.select().from(members);
  }

  async createMember(member: InsertMember) {
    const [created] = await db.insert(members).values(member).returning();
    return created;
  }

  async getVisit(id: string) {
    const [visit] = await db.select().from(visits).where(eq(visits.id, id));
    return visit;
  }

  async getVisitsByNp(npUserId: string) {
    return db.select().from(visits).where(eq(visits.npUserId, npUserId)).orderBy(desc(visits.createdAt));
  }

  async getAllVisits() {
    return db.select().from(visits).orderBy(desc(visits.createdAt));
  }

  async getVisitsForReview() {
    return db.select().from(visits).where(eq(visits.status, "ready_for_review")).orderBy(desc(visits.createdAt));
  }

  async createVisit(visit: InsertVisit) {
    const [created] = await db.insert(visits).values(visit).returning();
    return created;
  }

  async updateVisit(id: string, updates: Partial<Visit>) {
    const [updated] = await db.update(visits).set(updates).where(eq(visits.id, id)).returning();
    return updated;
  }

  async getPlanTargets(memberId: string) {
    return db.select().from(planTargets).where(eq(planTargets.memberId, memberId));
  }

  async createPlanTarget(target: InsertPlanTarget) {
    const [created] = await db.insert(planTargets).values(target).returning();
    return created;
  }

  async getAssessmentDefinition(instrumentId: string) {
    const [def] = await db.select().from(assessmentDefinitions).where(eq(assessmentDefinitions.instrumentId, instrumentId));
    return def;
  }

  async getAllAssessmentDefinitions() {
    return db.select().from(assessmentDefinitions);
  }

  async createAssessmentDefinition(def: InsertAssessmentDefinition) {
    const [created] = await db.insert(assessmentDefinitions).values(def).returning();
    return created;
  }

  async getChecklistByVisit(visitId: string) {
    return db.select().from(requiredChecklists).where(eq(requiredChecklists.visitId, visitId));
  }

  async createChecklistItem(item: InsertRequiredChecklist) {
    const [created] = await db.insert(requiredChecklists).values(item).returning();
    return created;
  }

  async updateChecklistItem(id: string, updates: Partial<RequiredChecklist>) {
    const [updated] = await db.update(requiredChecklists).set(updates).where(eq(requiredChecklists.id, id)).returning();
    return updated;
  }

  async getChecklistItemByVisitAndItem(visitId: string, itemId: string) {
    const [item] = await db.select().from(requiredChecklists)
      .where(and(eq(requiredChecklists.visitId, visitId), eq(requiredChecklists.itemId, itemId)));
    return item;
  }

  async deleteChecklistItem(id: string) {
    await db.delete(requiredChecklists).where(eq(requiredChecklists.id, id));
  }

  async getAssessmentResponse(visitId: string, instrumentId: string) {
    const [resp] = await db.select().from(assessmentResponses)
      .where(and(eq(assessmentResponses.visitId, visitId), eq(assessmentResponses.instrumentId, instrumentId)));
    return resp;
  }

  async createAssessmentResponse(response: InsertAssessmentResponse) {
    const [created] = await db.insert(assessmentResponses).values(response).returning();
    return created;
  }

  async updateAssessmentResponse(id: string, updates: Partial<AssessmentResponse>) {
    const [updated] = await db.update(assessmentResponses).set(updates).where(eq(assessmentResponses.id, id)).returning();
    return updated;
  }

  async getMeasureDefinition(measureId: string) {
    const [def] = await db.select().from(measureDefinitions).where(eq(measureDefinitions.measureId, measureId));
    return def;
  }

  async getAllMeasureDefinitions() {
    return db.select().from(measureDefinitions);
  }

  async createMeasureDefinition(def: InsertMeasureDefinition) {
    const [created] = await db.insert(measureDefinitions).values(def).returning();
    return created;
  }

  async getMeasureResult(visitId: string, measureId: string) {
    const [result] = await db.select().from(measureResults)
      .where(and(eq(measureResults.visitId, visitId), eq(measureResults.measureId, measureId)));
    return result;
  }

  async getMeasureResultsByVisit(visitId: string) {
    return db.select().from(measureResults).where(eq(measureResults.visitId, visitId));
  }

  async createMeasureResult(result: InsertMeasureResult) {
    const [created] = await db.insert(measureResults).values(result).returning();
    return created;
  }

  async updateMeasureResult(id: string, updates: Partial<MeasureResult>) {
    const [updated] = await db.update(measureResults).set(updates).where(eq(measureResults.id, id)).returning();
    return updated;
  }

  async getVitalsByVisit(visitId: string) {
    const [vitals] = await db.select().from(vitalsRecords).where(eq(vitalsRecords.visitId, visitId));
    return vitals;
  }

  async createVitals(vitals: InsertVitalsRecord) {
    const [created] = await db.insert(vitalsRecords).values(vitals).returning();
    return created;
  }

  async updateVitals(id: string, updates: Partial<VitalsRecord>) {
    const [updated] = await db.update(vitalsRecords).set(updates).where(eq(vitalsRecords.id, id)).returning();
    return updated;
  }

  async getClinicalNote(visitId: string) {
    const [note] = await db.select().from(clinicalNotes).where(eq(clinicalNotes.visitId, visitId));
    return note;
  }

  async createClinicalNote(note: InsertClinicalNote) {
    const [created] = await db.insert(clinicalNotes).values(note).returning();
    return created;
  }

  async updateClinicalNote(id: string, updates: Partial<ClinicalNote>) {
    const [updated] = await db.update(clinicalNotes).set(updates).where(eq(clinicalNotes.id, id)).returning();
    return updated;
  }

  async getTasksByVisit(visitId: string) {
    return db.select().from(carePlanTasks).where(eq(carePlanTasks.visitId, visitId));
  }

  async getAllTasks() {
    return db.select().from(carePlanTasks).orderBy(desc(carePlanTasks.createdAt));
  }

  async createTask(task: InsertCarePlanTask) {
    const [created] = await db.insert(carePlanTasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, updates: Partial<CarePlanTask>) {
    const [updated] = await db.update(carePlanTasks).set(updates).where(eq(carePlanTasks.id, id)).returning();
    return updated;
  }

  async getReviewsByVisit(visitId: string) {
    return db.select().from(reviewDecisions).where(eq(reviewDecisions.visitId, visitId));
  }

  async createReview(review: InsertReviewDecision) {
    const [created] = await db.insert(reviewDecisions).values(review).returning();
    return created;
  }

  async createExportArtifact(artifact: InsertExportArtifact) {
    const [created] = await db.insert(exportArtifacts).values(artifact).returning();
    return created;
  }

  async getAuditEvents() {
    return db.select().from(auditEvents).orderBy(desc(auditEvents.timestamp)).limit(200);
  }

  async createAuditEvent(event: InsertAuditEvent) {
    const [created] = await db.insert(auditEvents).values(event).returning();
    return created;
  }

  async getPlanPack(planId: string) {
    const [pack] = await db.select().from(planPacks).where(eq(planPacks.planId, planId));
    return pack;
  }

  async getAllPlanPacks() {
    return db.select().from(planPacks);
  }

  async createPlanPack(pack: InsertPlanPack) {
    const [created] = await db.insert(planPacks).values(pack).returning();
    return created;
  }

  async getMemberMap() {
    const allMembers = await db.select().from(members);
    const map = new Map<string, Member>();
    for (const m of allMembers) {
      map.set(m.id, m);
    }
    return map;
  }

  async getVisitsEnriched() {
    const [allVisits, memberMap] = await Promise.all([
      this.getAllVisits(),
      this.getMemberMap(),
    ]);
    return allVisits.map((v) => {
      const member = memberMap.get(v.memberId);
      return {
        ...v,
        memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown",
        address: member ? `${member.city || ""}, ${member.state || ""}` : "",
      };
    });
  }

  async getTasksEnriched() {
    const [allTasks, memberMap] = await Promise.all([
      this.getAllTasks(),
      this.getMemberMap(),
    ]);
    return allTasks.map((t) => {
      const member = memberMap.get(t.memberId);
      return {
        ...t,
        memberName: member ? `${member.firstName} ${member.lastName}` : "",
      };
    });
  }

  async getReviewVisitsEnriched() {
    const [allVisits, memberMap, allUsers, allReviews] = await Promise.all([
      this.getAllVisits(),
      this.getMemberMap(),
      this.getAllUsers(),
      db.select().from(reviewDecisions),
    ]);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const reviewsByVisit = new Map<string, string>();
    for (const r of allReviews) {
      reviewsByVisit.set(r.visitId, r.decision);
    }
    const reviewable = allVisits.filter((v) => v.status === "ready_for_review" || v.status === "finalized");
    return reviewable.map((v) => {
      const member = memberMap.get(v.memberId);
      const np = userMap.get(v.npUserId);
      const latestDecision = reviewsByVisit.get(v.id) || null;
      return {
        ...v,
        memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown",
        npName: np?.fullName || "Unknown",
        reviewStatus: latestDecision === "approve" ? "approved" : latestDecision === "request_correction" ? "correction_requested" : null,
      };
    });
  }

  async getAllClinicalRules() {
    return db.select().from(clinicalRules).where(eq(clinicalRules.active, true));
  }

  async createClinicalRule(rule: InsertClinicalRule) {
    const [created] = await db.insert(clinicalRules).values(rule).returning();
    return created;
  }

  async getRecommendationsByVisit(visitId: string) {
    return db.select().from(visitRecommendations).where(eq(visitRecommendations.visitId, visitId));
  }

  async createRecommendation(rec: InsertVisitRecommendation) {
    const [created] = await db.insert(visitRecommendations).values(rec).returning();
    return created;
  }

  async updateRecommendation(id: string, updates: Partial<VisitRecommendation>) {
    const [updated] = await db.update(visitRecommendations).set(updates).where(eq(visitRecommendations.id, id)).returning();
    return updated;
  }

  async getOverridesByVisit(visitId: string) {
    return db.select().from(validationOverrides).where(eq(validationOverrides.visitId, visitId));
  }

  async createOverride(override: InsertValidationOverride) {
    const [created] = await db.insert(validationOverrides).values(override).returning();
    return created;
  }

  async getCodesByVisit(visitId: string) {
    return db.select().from(visitCodes).where(eq(visitCodes.visitId, visitId));
  }

  async createVisitCode(code: InsertVisitCode) {
    const [created] = await db.insert(visitCodes).values(code).returning();
    return created;
  }

  async deleteVisitCodesByVisit(visitId: string) {
    await db.delete(visitCodes).where(eq(visitCodes.visitId, visitId));
  }

  async updateVisitCode(id: string, updates: Partial<VisitCode>) {
    const [updated] = await db.update(visitCodes).set(updates).where(eq(visitCodes.id, id)).returning();
    return updated;
  }

  async getLabResultsByMember(memberId: string) {
    return db.select().from(labResults).where(eq(labResults.memberId, memberId));
  }

  async createLabResult(lab: InsertLabResult) {
    const [created] = await db.insert(labResults).values(lab).returning();
    return created;
  }

  async getMedicationHistoryByMember(memberId: string) {
    return db.select().from(medicationHistory).where(eq(medicationHistory.memberId, memberId));
  }

  async createMedicationHistory(med: InsertMedicationHistory) {
    const [created] = await db.insert(medicationHistory).values(med).returning();
    return created;
  }

  async updateMedicationHistory(id: string, data: Partial<InsertMedicationHistory>) {
    const [updated] = await db.update(medicationHistory).set(data).where(eq(medicationHistory.id, id)).returning();
    return updated;
  }

  async getVitalsHistoryByMember(memberId: string) {
    return db.select().from(vitalsHistory).where(eq(vitalsHistory.memberId, memberId));
  }

  async createVitalsHistory(vitals: InsertVitalsHistory) {
    const [created] = await db.insert(vitalsHistory).values(vitals).returning();
    return created;
  }

  async updateVitalsHistory(id: string, data: Partial<InsertVitalsHistory>) {
    const [updated] = await db.update(vitalsHistory).set(data).where(eq(vitalsHistory.id, id)).returning();
    return updated;
  }

  async getMedReconciliationByVisit(visitId: string) {
    return db.select().from(medReconciliation).where(eq(medReconciliation.visitId, visitId));
  }

  async createMedReconciliation(med: InsertMedReconciliation) {
    const [created] = await db.insert(medReconciliation).values(med).returning();
    return created;
  }

  async updateMedReconciliation(id: string, updates: Partial<MedReconciliation>) {
    const [updated] = await db.update(medReconciliation).set(updates).where(eq(medReconciliation.id, id)).returning();
    return updated;
  }

  async deleteMedReconciliation(id: string) {
    await db.delete(medReconciliation).where(eq(medReconciliation.id, id));
  }

  async getMemberByMemberId(memberId: string) {
    const [member] = await db.select().from(members).where(eq(members.memberId, memberId));
    return member;
  }

  async updateMember(id: string, updates: Partial<Member>) {
    const [updated] = await db.update(members).set(updates).where(eq(members.id, id)).returning();
    return updated;
  }

  async getAssessmentResponsesByVisit(visitId: string) {
    return db.select().from(assessmentResponses).where(eq(assessmentResponses.visitId, visitId));
  }

  async getVisitsByMember(memberId: string) {
    return db.select().from(visits).where(eq(visits.memberId, memberId)).orderBy(desc(visits.createdAt));
  }

  async getExclusionsByVisit(visitId: string) {
    return db.select().from(objectiveExclusions).where(eq(objectiveExclusions.visitId, visitId));
  }

  async createExclusion(excl: InsertObjectiveExclusion) {
    const [created] = await db.insert(objectiveExclusions).values(excl).returning();
    return created;
  }

  async deleteExclusion(id: string) {
    await db.delete(objectiveExclusions).where(eq(objectiveExclusions.id, id));
  }

  async getConsentsByVisit(visitId: string) {
    return db.select().from(visitConsents).where(eq(visitConsents.visitId, visitId));
  }

  async createConsent(consent: InsertVisitConsent) {
    const [created] = await db.insert(visitConsents).values(consent).returning();
    return created;
  }

  async updateConsent(id: string, updates: Partial<VisitConsent>) {
    const [updated] = await db.update(visitConsents).set(updates).where(eq(visitConsents.id, id)).returning();
    return updated;
  }

  async getReasonCodes(category?: string) {
    if (category) {
      return db.select().from(reasonCodes)
        .where(and(eq(reasonCodes.category, category), eq(reasonCodes.active, true)))
        .orderBy(asc(reasonCodes.sortOrder));
    }
    return db.select().from(reasonCodes)
      .where(eq(reasonCodes.active, true))
      .orderBy(asc(reasonCodes.sortOrder));
  }

  async createReasonCode(code: InsertReasonCode) {
    const [created] = await db.insert(reasonCodes).values(code).returning();
    return created;
  }

  async getCompletenessRules(planPackId: string) {
    return db.select().from(completenessRules)
      .where(eq(completenessRules.planPackId, planPackId))
      .orderBy(asc(completenessRules.sortOrder));
  }

  async createCompletenessRule(rule: InsertCompletenessRule) {
    const [created] = await db.insert(completenessRules).values(rule).returning();
    return created;
  }

  async getDiagnosisRules() {
    return db.select().from(diagnosisRules).where(eq(diagnosisRules.active, true));
  }

  async getDiagnosisRuleByCode(icdCode: string) {
    const [rule] = await db.select().from(diagnosisRules).where(eq(diagnosisRules.icdCode, icdCode));
    return rule;
  }

  async createDiagnosisRule(rule: InsertDiagnosisRule) {
    const [created] = await db.insert(diagnosisRules).values(rule).returning();
    return created;
  }

  async getReviewSignOffs(visitId: string) {
    return db.select().from(reviewSignOffs)
      .where(eq(reviewSignOffs.visitId, visitId))
      .orderBy(desc(reviewSignOffs.signedAt));
  }

  async createReviewSignOff(signOff: InsertReviewSignOff) {
    const [created] = await db.insert(reviewSignOffs).values(signOff).returning();
    return created;
  }

  async getAiProviderConfigs() {
    return db.select().from(aiProviderConfig);
  }

  async getActiveAiProvider() {
    const [config] = await db.select().from(aiProviderConfig).where(eq(aiProviderConfig.active, true));
    return config;
  }

  async getAiProviderConfig(id: string) {
    const [config] = await db.select().from(aiProviderConfig).where(eq(aiProviderConfig.id, id));
    return config;
  }

  async createAiProviderConfig(config: InsertAiProviderConfig) {
    const [created] = await db.insert(aiProviderConfig).values(config).returning();
    return created;
  }

  async updateAiProviderConfig(id: string, updates: Partial<AiProviderConfig>) {
    const [updated] = await db.update(aiProviderConfig).set(updates).where(eq(aiProviderConfig.id, id)).returning();
    return updated;
  }

  async deleteAiProviderConfig(id: string) {
    const deleted = await db.delete(aiProviderConfig).where(eq(aiProviderConfig.id, id)).returning();
    return deleted.length > 0;
  }

  async getRecordingsByVisit(visitId: string) {
    return db.select().from(voiceRecordings).where(eq(voiceRecordings.visitId, visitId)).orderBy(desc(voiceRecordings.createdAt));
  }

  async getRecording(id: string) {
    const [rec] = await db.select().from(voiceRecordings).where(eq(voiceRecordings.id, id));
    return rec;
  }

  async createRecording(recording: InsertVoiceRecording) {
    const [created] = await db.insert(voiceRecordings).values(recording).returning();
    return created;
  }

  async updateRecording(id: string, updates: Partial<VoiceRecording>) {
    const [updated] = await db.update(voiceRecordings).set(updates).where(eq(voiceRecordings.id, id)).returning();
    return updated;
  }

  async getTranscriptsByVisit(visitId: string) {
    return db.select().from(transcripts).where(eq(transcripts.visitId, visitId)).orderBy(desc(transcripts.createdAt));
  }

  async getTranscript(id: string) {
    const [t] = await db.select().from(transcripts).where(eq(transcripts.id, id));
    return t;
  }

  async createTranscript(transcript: InsertTranscript) {
    const [created] = await db.insert(transcripts).values(transcript).returning();
    return created;
  }

  async updateTranscript(id: string, updates: Partial<Transcript>) {
    const [updated] = await db.update(transcripts).set(updates).where(eq(transcripts.id, id)).returning();
    return updated;
  }

  async getExtractedFieldsByVisit(visitId: string) {
    return db.select().from(extractedFields).where(eq(extractedFields.visitId, visitId));
  }

  async getExtractedFieldsByTranscript(transcriptId: string) {
    return db.select().from(extractedFields).where(eq(extractedFields.transcriptId, transcriptId));
  }

  async getExtractedField(id: string) {
    const [f] = await db.select().from(extractedFields).where(eq(extractedFields.id, id));
    return f;
  }

  async createExtractedField(field: InsertExtractedField) {
    const [created] = await db.insert(extractedFields).values(field).returning();
    return created;
  }

  async updateExtractedField(id: string, updates: Partial<ExtractedField>) {
    const [updated] = await db.update(extractedFields).set(updates).where(eq(extractedFields.id, id)).returning();
    return updated;
  }

  async createExtractedFields(fields: InsertExtractedField[]) {
    if (fields.length === 0) return [];
    return db.insert(extractedFields).values(fields).returning();
  }

  // Visit Alerts (CR-001-12)
  async getAlertsByVisit(visitId: string) {
    return db.select().from(visitAlerts).where(eq(visitAlerts.visitId, visitId));
  }

  async createVisitAlert(alert: InsertVisitAlert) {
    const [created] = await db.insert(visitAlerts).values(alert).returning();
    return created;
  }

  async updateVisitAlert(id: string, updates: Partial<VisitAlert>) {
    const [updated] = await db.update(visitAlerts).set(updates).where(eq(visitAlerts.id, id)).returning();
    return updated;
  }

  // Note Edits (CR-001-16)
  async getNoteEditsByVisit(visitId: string) {
    return db.select().from(noteEdits).where(eq(noteEdits.visitId, visitId));
  }

  async createNoteEdit(edit: InsertNoteEdit) {
    const [created] = await db.insert(noteEdits).values(edit).returning();
    return created;
  }

  // Note Signatures (CR-001-16)
  async getNoteSignaturesByVisit(visitId: string) {
    return db.select().from(noteSignatures).where(eq(noteSignatures.visitId, visitId));
  }

  async createNoteSignature(sig: InsertNoteSignature) {
    const [created] = await db.insert(noteSignatures).values(sig).returning();
    return created;
  }

  // Plan Pack updates (CR-001-15)
  async updatePlanPack(id: string, updates: Partial<PlanPack>) {
    const [updated] = await db.update(planPacks).set(updates).where(eq(planPacks.id, id)).returning();
    return updated;
  }

  // Clinical Rule updates (CR-001-12)
  async updateClinicalRule(id: string, updates: Partial<ClinicalRule>) {
    const [updated] = await db.update(clinicalRules).set(updates).where(eq(clinicalRules.id, id)).returning();
    return updated;
  }

  // Demo Config (CR-001-18)
  async getDemoConfig() {
    const [config] = await db.select().from(demoConfig);
    return config;
  }

  async upsertDemoConfig(config: Partial<DemoConfig>) {
    const existing = await this.getDemoConfig();
    if (existing) {
      const [updated] = await db.update(demoConfig).set(config).where(eq(demoConfig.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(demoConfig).values(config as any).returning();
    return created;
  }

  // Audit Assignments & Outcomes (CR-001-19)
  async getAuditAssignments() {
    return db.select().from(auditAssignments).orderBy(desc(auditAssignments.assignedAt));
  }

  async getAuditAssignment(id: string) {
    const [assignment] = await db.select().from(auditAssignments).where(eq(auditAssignments.id, id));
    return assignment;
  }

  async createAuditAssignment(assignment: InsertAuditAssignment) {
    const [created] = await db.insert(auditAssignments).values(assignment).returning();
    return created;
  }

  async updateAuditAssignment(id: string, updates: Partial<AuditAssignment>) {
    const [updated] = await db.update(auditAssignments).set(updates).where(eq(auditAssignments.id, id)).returning();
    return updated;
  }

  async getAuditOutcomesByAssignment(assignmentId: string) {
    return db.select().from(auditOutcomes).where(eq(auditOutcomes.assignmentId, assignmentId));
  }

  async getAuditOutcomesByVisit(visitId: string) {
    return db.select().from(auditOutcomes).where(eq(auditOutcomes.visitId, visitId));
  }

  async createAuditOutcome(outcome: InsertAuditOutcome) {
    const [created] = await db.insert(auditOutcomes).values([outcome]).returning();
    return created;
  }

  // Review Sign-offs for rework tracking (CR-001-20)
  async getAllReviewSignOffs() {
    return db.select().from(reviewSignOffs).orderBy(desc(reviewSignOffs.signedAt));
  }

  // CR-002: HIE Pre-Visit Intelligence
  async createHieIngestionLog(log: InsertHieIngestionLog) {
    const [created] = await db.insert(hieIngestionLog).values(log).returning();
    return created;
  }

  async getHieIngestionLogsByVisit(visitId: string) {
    return db.select().from(hieIngestionLog).where(eq(hieIngestionLog.visitId, visitId)).orderBy(desc(hieIngestionLog.receivedAt));
  }

  async getHieIngestionLogByBundleId(visitId: string, bundleId: string) {
    const [log] = await db.select().from(hieIngestionLog).where(and(eq(hieIngestionLog.visitId, visitId), eq(hieIngestionLog.bundleId, bundleId)));
    return log;
  }

  async updateHieIngestionLog(id: string, updates: Partial<HieIngestionLog>) {
    const [updated] = await db.update(hieIngestionLog).set(updates).where(eq(hieIngestionLog.id, id)).returning();
    return updated;
  }

  async createSuspectedCondition(cond: InsertSuspectedCondition) {
    const [created] = await db.insert(suspectedConditions).values(cond).returning();
    return created;
  }

  async getSuspectedConditionsByVisit(visitId: string) {
    return db.select().from(suspectedConditions).where(eq(suspectedConditions.visitId, visitId));
  }

  async getSuspectedCondition(id: string) {
    const [cond] = await db.select().from(suspectedConditions).where(eq(suspectedConditions.id, id));
    return cond;
  }

  async getSuspectedConditionByVisitAndCode(visitId: string, icdCode: string) {
    const [cond] = await db.select().from(suspectedConditions).where(and(eq(suspectedConditions.visitId, visitId), eq(suspectedConditions.icdCode, icdCode)));
    return cond;
  }

  async updateSuspectedCondition(id: string, updates: Partial<SuspectedCondition>) {
    const [updated] = await db.update(suspectedConditions).set(updates).where(eq(suspectedConditions.id, id)).returning();
    return updated;
  }

  async getSecuritySettings() {
    const [settings] = await db.select().from(securitySettings);
    return settings;
  }

  async upsertSecuritySettings(settings: Partial<SecuritySettings>) {
    const existing = await this.getSecuritySettings();
    if (existing) {
      const [updated] = await db.update(securitySettings).set(settings).where(eq(securitySettings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(securitySettings).values([settings as InsertSecuritySettings]).returning();
    return created;
  }

  async createMfaCode(entry: InsertMfaCode) {
    const [created] = await db.insert(mfaCodes).values(entry).returning();
    return created;
  }

  async getLatestMfaCode(userId: string) {
    const [code] = await db.select().from(mfaCodes)
      .where(eq(mfaCodes.userId, userId))
      .orderBy(desc(mfaCodes.createdAt))
      .limit(1);
    return code;
  }

  async updateMfaCode(id: string, updates: Partial<MfaCode>) {
    const [updated] = await db.update(mfaCodes).set(updates).where(eq(mfaCodes.id, id)).returning();
    return updated;
  }

  async updateUser(id: string, updates: Partial<User>) {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
