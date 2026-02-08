import { eq, and, desc, inArray } from "drizzle-orm";
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
  getVitalsHistoryByMember(memberId: string): Promise<VitalsHistory[]>;
  createVitalsHistory(vitals: InsertVitalsHistory): Promise<VitalsHistory>;

  getMeasureResultsByVisit(visitId: string): Promise<MeasureResult[]>;

  getMedReconciliationByVisit(visitId: string): Promise<MedReconciliation[]>;
  createMedReconciliation(med: InsertMedReconciliation): Promise<MedReconciliation>;
  updateMedReconciliation(id: string, updates: Partial<MedReconciliation>): Promise<MedReconciliation | undefined>;
  deleteMedReconciliation(id: string): Promise<void>;

  getMemberByMemberId(memberId: string): Promise<Member | undefined>;
  updateMember(id: string, updates: Partial<Member>): Promise<Member | undefined>;
  getAssessmentResponsesByVisit(visitId: string): Promise<AssessmentResponse[]>;
  getVisitsByMember(memberId: string): Promise<Visit[]>;
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
    const [allVisits, memberMap, allUsers] = await Promise.all([
      this.getAllVisits(),
      this.getMemberMap(),
      this.getAllUsers(),
    ]);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const reviewable = allVisits.filter((v) => v.status === "ready_for_review" || v.status === "finalized");
    return reviewable.map((v) => {
      const member = memberMap.get(v.memberId);
      const np = userMap.get(v.npUserId);
      return {
        ...v,
        memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown",
        npName: np?.fullName || "Unknown",
        reviewStatus: null as string | null,
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

  async getVitalsHistoryByMember(memberId: string) {
    return db.select().from(vitalsHistory).where(eq(vitalsHistory.memberId, memberId));
  }

  async createVitalsHistory(vitals: InsertVitalsHistory) {
    const [created] = await db.insert(vitalsHistory).values(vitals).returning();
    return created;
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
}

export const storage = new DatabaseStorage();
