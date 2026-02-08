import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users, members, visits, planTargets, assessmentDefinitions,
  requiredChecklists, assessmentResponses, measureDefinitions,
  measureResults, vitalsRecords, clinicalNotes, carePlanTasks,
  reviewDecisions, exportArtifacts, auditEvents, planPacks,
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
}

export const storage = new DatabaseStorage();
