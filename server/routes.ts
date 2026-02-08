import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { seedDatabase } from "./seed";

function evaluateCondition(value: number, threshold: number, operator: string): boolean {
  switch (operator) {
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    case ">": return value > threshold;
    case "<": return value < threshold;
    case "==": return value === threshold;
    default: return false;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      await storage.createAuditEvent({
        eventType: "login",
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        details: `User ${user.fullName} logged in`,
      });
      const { password: _, ...safeUser } = user;
      return res.json(safeUser);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/np", async (_req, res) => {
    try {
      const [allVisits, memberMap, auditEvts] = await Promise.all([
        storage.getAllVisits(),
        storage.getMemberMap(),
        storage.getAuditEvents(),
      ]);
      const today = new Date().toISOString().split("T")[0];
      const todayVisits = allVisits.filter((v) => v.scheduledDate === today).length;
      const inProgress = allVisits.filter((v) => v.status === "in_progress").length;
      const completed = allVisits.filter((v) => v.status === "finalized" || v.status === "ready_for_review").length;

      const upcomingVisits = allVisits.filter((v) => v.status === "scheduled" || v.status === "in_progress").slice(0, 5).map((v) => {
        const member = memberMap.get(v.memberId);
        return { ...v, memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown" };
      });

      const recentActivity = auditEvts.slice(0, 5).map((e) => ({
        description: e.details,
        timestamp: e.timestamp ? new Date(e.timestamp).toLocaleString() : "",
      }));

      return res.json({ todayVisits, inProgress, completed, needsAttention: 0, upcomingVisits, recentActivity });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/dashboard/supervisor", async (_req, res) => {
    try {
      const allVisits = await storage.getAllVisits();
      const reviewVisits = allVisits.filter((v) => v.status === "ready_for_review");
      return res.json({
        pendingReview: reviewVisits.length,
        approvedToday: 0,
        corrections: 0,
        totalVisits: allVisits.length,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/dashboard/coordinator", async (_req, res) => {
    try {
      const [tasks, allMembers] = await Promise.all([
        storage.getAllTasks(),
        storage.getAllMembers(),
      ]);
      const openTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
      const completedTasks = tasks.filter((t) => t.status === "completed").length;
      return res.json({ openTasks, dueToday: 0, completedTasks, totalMembers: allMembers.length });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Visits
  app.get("/api/visits", async (_req, res) => {
    try {
      const enriched = await storage.getVisitsEnriched();
      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Visit bundle (pre-visit summary + intake data)
  app.get("/api/visits/:id/bundle", async (req, res) => {
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).json({ message: "Visit not found" });

      const member = await storage.getMember(visit.memberId);
      const checklist = await storage.getChecklistByVisit(visit.id);
      const targets = member ? await storage.getPlanTargets(member.id) : [];
      const vitals = await storage.getVitalsByVisit(visit.id);

      return res.json({ visit, member, checklist, targets, vitals });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Identity verification
  app.post("/api/visits/:id/verify-identity", async (req, res) => {
    try {
      const { method } = req.body;
      const updated = await storage.updateVisit(req.params.id, {
        identityVerified: true,
        identityMethod: method,
        status: "in_progress",
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Vitals
  app.post("/api/visits/:id/vitals", async (req, res) => {
    try {
      const existing = await storage.getVitalsByVisit(req.params.id);
      if (existing) {
        const updated = await storage.updateVitals(existing.id, req.body);
        return res.json(updated);
      }
      const created = await storage.createVitals({ ...req.body, visitId: req.params.id, recordedAt: new Date().toISOString() });
      await storage.updateVisit(req.params.id, { status: "in_progress" });
      return res.json(created);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Assessment definitions
  app.get("/api/assessments/definitions/:id", async (req, res) => {
    try {
      const def = await storage.getAssessmentDefinition(req.params.id);
      if (!def) return res.status(404).json({ message: "Assessment definition not found" });
      return res.json(def);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Assessment response for a visit
  app.get("/api/visits/:id/assessments/:aid", async (req, res) => {
    try {
      const response = await storage.getAssessmentResponse(req.params.id, req.params.aid);
      return res.json(response || null);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Save assessment response
  app.post("/api/visits/:id/assessments", async (req, res) => {
    try {
      const { instrumentId, instrumentVersion, responses, computedScore, interpretation, status } = req.body;
      const existing = await storage.getAssessmentResponse(req.params.id, instrumentId);

      if (existing) {
        const updated = await storage.updateAssessmentResponse(existing.id, {
          responses,
          computedScore,
          interpretation,
          status,
          completedAt: status === "complete" ? new Date().toISOString() : undefined,
        });

        if (status === "complete") {
          const checkItem = await storage.getChecklistItemByVisitAndItem(req.params.id, instrumentId);
          if (checkItem) {
            await storage.updateChecklistItem(checkItem.id, { status: "complete", completedAt: new Date().toISOString() });
          }
          await storage.createAuditEvent({
            eventType: "assessment_completed",
            visitId: req.params.id,
            resourceType: "assessment",
            resourceId: instrumentId,
            details: `Assessment ${instrumentId} completed with score ${computedScore}`,
          });
        }
        return res.json(updated);
      }

      const created = await storage.createAssessmentResponse({
        visitId: req.params.id,
        instrumentId,
        instrumentVersion,
        responses,
        computedScore,
        interpretation,
        status,
        completedAt: status === "complete" ? new Date().toISOString() : undefined,
      });

      if (status === "complete") {
        const checkItem = await storage.getChecklistItemByVisitAndItem(req.params.id, instrumentId);
        if (checkItem) {
          await storage.updateChecklistItem(checkItem.id, { status: "complete", completedAt: new Date().toISOString() });
        }
      }

      return res.json(created);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Unable to assess for assessment
  app.post("/api/visits/:id/assessments/unable", async (req, res) => {
    try {
      const { instrumentId, reason, note } = req.body;
      const checkItem = await storage.getChecklistItemByVisitAndItem(req.params.id, instrumentId);
      if (checkItem) {
        await storage.updateChecklistItem(checkItem.id, {
          status: "unable_to_assess",
          unableToAssessReason: reason,
          unableToAssessNote: note,
          completedAt: new Date().toISOString(),
        });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Measure definitions
  app.get("/api/measures/definitions/:id", async (req, res) => {
    try {
      const def = await storage.getMeasureDefinition(req.params.id);
      if (!def) return res.status(404).json({ message: "Measure definition not found" });
      return res.json(def);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Measure result for a visit
  app.get("/api/visits/:id/measures/:mid", async (req, res) => {
    try {
      const result = await storage.getMeasureResult(req.params.id, req.params.mid);
      return res.json(result || null);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Save measure result
  app.post("/api/visits/:id/measures", async (req, res) => {
    try {
      const { measureId, captureMethod, evidenceMetadata, status } = req.body;
      const existing = await storage.getMeasureResult(req.params.id, measureId);

      if (existing) {
        const updated = await storage.updateMeasureResult(existing.id, {
          captureMethod,
          evidenceMetadata,
          status,
          completedAt: status === "complete" ? new Date().toISOString() : undefined,
        });

        if (status === "complete") {
          const checkItem = await storage.getChecklistItemByVisitAndItem(req.params.id, measureId);
          if (checkItem) {
            await storage.updateChecklistItem(checkItem.id, { status: "complete", completedAt: new Date().toISOString() });
          }
          await storage.createAuditEvent({
            eventType: "measure_completed",
            visitId: req.params.id,
            resourceType: "measure",
            resourceId: measureId,
            details: `Measure ${measureId} completed via ${captureMethod}`,
          });
        }
        return res.json(updated);
      }

      const created = await storage.createMeasureResult({
        visitId: req.params.id,
        measureId,
        captureMethod,
        evidenceMetadata,
        status,
        completedAt: status === "complete" ? new Date().toISOString() : undefined,
      });

      if (status === "complete") {
        const checkItem = await storage.getChecklistItemByVisitAndItem(req.params.id, measureId);
        if (checkItem) {
          await storage.updateChecklistItem(checkItem.id, { status: "complete", completedAt: new Date().toISOString() });
        }
      }

      return res.json(created);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Unable to assess for measure
  app.post("/api/visits/:id/measures/unable", async (req, res) => {
    try {
      const { measureId, reason, note } = req.body;
      const checkItem = await storage.getChecklistItemByVisitAndItem(req.params.id, measureId);
      if (checkItem) {
        await storage.updateChecklistItem(checkItem.id, {
          status: "unable_to_assess",
          unableToAssessReason: reason,
          unableToAssessNote: note,
          completedAt: new Date().toISOString(),
        });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Care plan tasks
  app.get("/api/visits/:id/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksByVisit(req.params.id);
      return res.json(tasks);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/tasks", async (req, res) => {
    try {
      const task = await storage.createTask({ ...req.body, visitId: req.params.id });
      return res.json(task);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // All tasks (for care coordination)
  app.get("/api/tasks", async (_req, res) => {
    try {
      const enriched = await storage.getTasksEnriched();
      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { status, outcome, outcomeNotes } = req.body;
      const updates: any = { status };
      if (outcome) updates.outcome = outcome;
      if (outcomeNotes) updates.outcomeNotes = outcomeNotes;
      if (status === "completed") updates.completedAt = new Date().toISOString();

      const updated = await storage.updateTask(req.params.id, updates);
      await storage.createAuditEvent({
        eventType: "task_updated",
        resourceType: "task",
        resourceId: req.params.id,
        details: `Task updated to ${status}`,
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Finalize visit
  app.post("/api/visits/:id/finalize", async (req, res) => {
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).json({ message: "Visit not found" });

      // Gating check
      if (!visit.identityVerified) {
        return res.status(400).json({ message: "Identity not verified" });
      }
      const vitals = await storage.getVitalsByVisit(req.params.id);
      if (!vitals) {
        return res.status(400).json({ message: "Vitals not recorded" });
      }
      const checklist = await storage.getChecklistByVisit(req.params.id);
      const incomplete = checklist.filter((c) => c.status !== "complete" && c.status !== "unable_to_assess");
      if (incomplete.length > 0) {
        return res.status(400).json({
          message: `${incomplete.length} required item(s) not completed`,
          incompleteItems: incomplete.map((c) => c.itemName),
        });
      }

      const { signature, attestationText } = req.body;
      const now = new Date().toISOString();

      // Generate clinical note
      const member = await storage.getMember(visit.memberId);
      const assessmentSummaries: string[] = [];
      for (const item of checklist) {
        if (item.itemType === "assessment" && item.status === "complete") {
          const resp = await storage.getAssessmentResponse(visit.id, item.itemId);
          if (resp) {
            assessmentSummaries.push(`${item.itemName}: Score ${resp.computedScore} - ${resp.interpretation || "N/A"}`);
          }
        }
        if (item.itemType === "measure" && item.status === "complete") {
          const mResult = await storage.getMeasureResult(visit.id, item.itemId);
          if (mResult) {
            assessmentSummaries.push(`${item.itemName}: Completed via ${mResult.captureMethod || "unknown"}`);
          }
        }
        if (item.status === "unable_to_assess") {
          assessmentSummaries.push(`${item.itemName}: Unable to assess - ${item.unableToAssessReason}`);
        }
      }

      const existingNote = await storage.getClinicalNote(visit.id);
      const noteData = {
        visitId: visit.id,
        chiefComplaint: "Annual Wellness Visit / In-Home Assessment",
        hpiNotes: `${member?.firstName} ${member?.lastName} (DOB: ${member?.dob}) seen for scheduled in-home visit.`,
        examNotes: vitals.notes || "Physical exam performed. See vitals for recorded measurements.",
        assessmentMeasuresSummary: assessmentSummaries.join("\n"),
        planNotes: "See care plan tasks for follow-up actions.",
        generatedAt: now,
      };

      if (existingNote) {
        await storage.updateClinicalNote(existingNote.id, noteData);
      } else {
        await storage.createClinicalNote(noteData);
      }

      const updated = await storage.updateVisit(req.params.id, {
        status: "ready_for_review",
        signedAt: now,
        signedBy: signature,
        attestationText,
        finalizedAt: now,
      });

      await storage.createAuditEvent({
        eventType: "visit_finalized",
        visitId: visit.id,
        patientId: visit.memberId,
        details: `Visit finalized and signed by ${signature}`,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Clinical note
  app.get("/api/visits/:id/note", async (req, res) => {
    try {
      const note = await storage.getClinicalNote(req.params.id);
      return res.json(note || null);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Reviews
  app.get("/api/reviews", async (_req, res) => {
    try {
      const enriched = await storage.getReviewVisitsEnriched();
      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/review", async (req, res) => {
    try {
      const { decision, comments, reviewerId } = req.body;
      const review = await storage.createReview({
        visitId: req.params.id,
        reviewerId: reviewerId || "system",
        decision,
        comments,
      });

      if (decision === "approve") {
        await storage.updateVisit(req.params.id, { status: "finalized" });
      }

      await storage.createAuditEvent({
        eventType: "review_submitted",
        visitId: req.params.id,
        details: `Visit ${decision === "approve" ? "approved" : "correction requested"}${comments ? ": " + comments : ""}`,
      });

      return res.json(review);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Export
  app.post("/api/visits/:id/export", async (req, res) => {
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).json({ message: "Visit not found" });

      const member = await storage.getMember(visit.memberId);
      const vitals = await storage.getVitalsByVisit(visit.id);
      const checklist = await storage.getChecklistByVisit(visit.id);
      const note = await storage.getClinicalNote(visit.id);
      const tasks = await storage.getTasksByVisit(visit.id);

      const fhirBundle = {
        resourceType: "Bundle",
        type: "document",
        timestamp: new Date().toISOString(),
        entry: [
          {
            resource: {
              resourceType: "Patient",
              id: member?.id,
              name: [{ family: member?.lastName, given: [member?.firstName] }],
              birthDate: member?.dob,
              gender: member?.gender,
              address: member?.address ? [{ line: [member.address], city: member.city, state: member.state, postalCode: member.zip }] : [],
            },
          },
          {
            resource: {
              resourceType: "Encounter",
              id: visit.id,
              status: "finished",
              class: { code: "HH", display: "home health" },
              period: { start: visit.scheduledDate, end: visit.finalizedAt },
              type: [{ coding: [{ code: visit.visitType, display: visit.visitType?.replace(/_/g, " ") }] }],
            },
          },
          ...(vitals ? [{
            resource: {
              resourceType: "Observation",
              status: "final",
              category: [{ coding: [{ code: "vital-signs" }] }],
              component: [
                vitals.systolic ? { code: { text: "Systolic BP" }, valueQuantity: { value: vitals.systolic, unit: "mmHg" } } : null,
                vitals.diastolic ? { code: { text: "Diastolic BP" }, valueQuantity: { value: vitals.diastolic, unit: "mmHg" } } : null,
                vitals.heartRate ? { code: { text: "Heart Rate" }, valueQuantity: { value: vitals.heartRate, unit: "bpm" } } : null,
                vitals.bmi ? { code: { text: "BMI" }, valueQuantity: { value: vitals.bmi, unit: "kg/m2" } } : null,
              ].filter(Boolean),
            },
          }] : []),
          ...(note ? [{
            resource: {
              resourceType: "DocumentReference",
              status: "current",
              description: "Clinical Note",
              content: [{ attachment: { contentType: "text/plain", data: Buffer.from(JSON.stringify(note)).toString("base64") } }],
            },
          }] : []),
          ...tasks.map((t) => ({
            resource: {
              resourceType: "Task",
              status: t.status,
              description: t.title,
              note: t.description ? [{ text: t.description }] : [],
              priority: t.priority,
            },
          })),
        ],
      };

      await storage.createExportArtifact({
        visitId: visit.id,
        exportType: "fhir_bundle",
        status: "generated",
        fileData: JSON.stringify(fhirBundle),
        generatedAt: new Date().toISOString(),
      });

      await storage.createAuditEvent({
        eventType: "visit_exported",
        visitId: visit.id,
        patientId: visit.memberId,
        details: `FHIR bundle exported for visit ${visit.id}`,
      });

      return res.json({ fhirBundle });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Audit
  app.get("/api/audit", async (_req, res) => {
    try {
      const events = await storage.getAuditEvents();
      return res.json(events);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ===== Clinical Decision Support =====
  app.get("/api/clinical-rules", async (_req, res) => {
    try {
      const rules = await storage.getAllClinicalRules();
      return res.json(rules);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/evaluate-rules", async (req, res) => {
    try {
      const { source, data } = req.body;
      const rules = await storage.getAllClinicalRules();
      const existingRecs = await storage.getRecommendationsByVisit(req.params.id);
      const existingRuleIds = new Set(existingRecs.map((r) => r.ruleId));
      const triggered: any[] = [];

      for (const rule of rules) {
        if (existingRuleIds.has(rule.ruleId)) continue;
        if (rule.triggerSource !== source) continue;
        const condition = rule.triggerCondition as any;

        let matches = false;
        if (source === "vitals") {
          const value = data[condition.field];
          if (value != null) {
            matches = evaluateCondition(value, condition.threshold, condition.operator);
          }
          if (!matches && condition.orCondition) {
            const orValue = data[condition.orCondition.field];
            if (orValue != null) {
              matches = evaluateCondition(orValue, condition.orCondition.threshold, condition.orCondition.operator);
            }
          }
        } else if (source === "assessment") {
          if (condition.instrumentId === data.instrumentId) {
            matches = evaluateCondition(data.score, condition.scoreThreshold, condition.operator);
          }
        }

        if (matches) {
          const rec = await storage.createRecommendation({
            visitId: req.params.id,
            ruleId: rule.ruleId,
            ruleName: rule.name,
            recommendation: rule.recommendedAction,
            status: "pending",
            triggeredAt: new Date().toISOString(),
          });
          triggered.push({ ...rec, priority: rule.priority, category: rule.category });
        }
      }

      return res.json({ triggered, total: triggered.length });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/visits/:id/recommendations", async (req, res) => {
    try {
      const recs = await storage.getRecommendationsByVisit(req.params.id);
      return res.json(recs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/recommendations/:id", async (req, res) => {
    try {
      const { status, dismissReason, dismissNote } = req.body;
      const updates: any = { status };
      if (dismissReason) updates.dismissReason = dismissReason;
      if (dismissNote) updates.dismissNote = dismissNote;
      if (status === "dismissed" || status === "resolved") updates.resolvedAt = new Date().toISOString();
      const updated = await storage.updateRecommendation(req.params.id, updates);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ===== Data Validation =====
  app.post("/api/visits/:id/validate-vitals", async (req, res) => {
    try {
      const data = req.body;
      const warnings: any[] = [];

      const checks = [
        { field: "systolic", min: 60, max: 250, label: "Systolic BP" },
        { field: "diastolic", min: 30, max: 150, label: "Diastolic BP" },
        { field: "heartRate", min: 30, max: 220, label: "Heart Rate" },
        { field: "respiratoryRate", min: 6, max: 60, label: "Respiratory Rate" },
        { field: "temperature", min: 90, max: 108, label: "Temperature" },
        { field: "oxygenSaturation", min: 50, max: 100, label: "O2 Saturation" },
        { field: "bmi", min: 10, max: 70, label: "BMI" },
        { field: "painLevel", min: 0, max: 10, label: "Pain Level" },
      ];

      for (const check of checks) {
        const val = parseFloat(data[check.field]);
        if (isNaN(val)) continue;
        if (val < check.min || val > check.max) {
          warnings.push({
            field: check.field,
            warningType: "out_of_range",
            message: `${check.label} value of ${val} is outside expected range (${check.min}-${check.max})`,
            value: val,
          });
        }
      }

      if (data.systolic && data.diastolic) {
        const sys = parseFloat(data.systolic);
        const dia = parseFloat(data.diastolic);
        if (!isNaN(sys) && !isNaN(dia) && dia >= sys) {
          warnings.push({
            field: "diastolic",
            warningType: "logical_conflict",
            message: "Diastolic pressure should be less than systolic pressure",
            value: dia,
          });
        }
      }

      return res.json({ warnings, valid: warnings.length === 0 });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/visits/:id/overrides", async (req, res) => {
    try {
      const overrides = await storage.getOverridesByVisit(req.params.id);
      return res.json(overrides);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/overrides", async (req, res) => {
    try {
      const override = await storage.createOverride({
        ...req.body,
        visitId: req.params.id,
      });
      return res.json(override);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ===== Auto-Coding Engine =====
  app.get("/api/visits/:id/codes", async (req, res) => {
    try {
      const codes = await storage.getCodesByVisit(req.params.id);
      return res.json(codes);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/generate-codes", async (req, res) => {
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).json({ message: "Visit not found" });

      await storage.deleteVisitCodesByVisit(req.params.id);

      const codes: any[] = [];

      if (visit.visitType === "annual_wellness") {
        codes.push(
          { codeType: "CPT", code: "99387", description: "Preventive visit, new patient, 65+", source: "visit_type" },
          { codeType: "HCPCS", code: "G0438", description: "Annual wellness visit, initial", source: "visit_type" },
          { codeType: "ICD-10", code: "Z00.00", description: "Encounter for general adult medical exam w/o abnormal findings", source: "visit_type" },
        );
      } else if (visit.visitType === "initial_assessment") {
        codes.push(
          { codeType: "CPT", code: "99345", description: "Home visit, new patient, high complexity", source: "visit_type" },
          { codeType: "ICD-10", code: "Z00.00", description: "Encounter for general adult medical exam w/o abnormal findings", source: "visit_type" },
        );
      } else {
        codes.push(
          { codeType: "CPT", code: "99350", description: "Home visit, established patient, high complexity", source: "visit_type" },
        );
      }

      const vitals = await storage.getVitalsByVisit(req.params.id);
      if (vitals) {
        if (vitals.systolic && vitals.systolic >= 140) {
          codes.push({ codeType: "ICD-10", code: "I10", description: "Essential (primary) hypertension", source: "vitals" });
        }
        if (vitals.bmi && vitals.bmi >= 30) {
          codes.push({ codeType: "ICD-10", code: "E66.9", description: "Obesity, unspecified", source: "vitals" });
        }
        if (vitals.bmi && vitals.bmi >= 25 && vitals.bmi < 30) {
          codes.push({ codeType: "ICD-10", code: "E66.3", description: "Overweight", source: "vitals" });
        }
      }

      const checklist = await storage.getChecklistByVisit(req.params.id);
      for (const item of checklist) {
        if (item.status !== "complete") continue;

        if (item.itemType === "assessment") {
          const resp = await storage.getAssessmentResponse(req.params.id, item.itemId);
          if (resp) {
            if (item.itemId === "PHQ-2" || item.itemId === "PHQ-9") {
              codes.push({ codeType: "CPT", code: "96127", description: "Brief emotional/behavioral assessment", source: "assessment" });
              if (resp.computedScore && resp.computedScore >= 10) {
                codes.push({ codeType: "ICD-10", code: "F32.1", description: "Major depressive disorder, single episode, moderate", source: "assessment" });
              }
            }
            if (item.itemId === "PRAPARE") {
              codes.push({ codeType: "CPT", code: "96160", description: "Patient-focused health risk assessment", source: "assessment" });
            }
            if (item.itemId === "AWV") {
              codes.push({ codeType: "HCPCS", code: "G0438", description: "Annual wellness visit, initial", source: "assessment" });
            }
          }
        }

        if (item.itemType === "measure") {
          if (item.itemId === "BCS") {
            codes.push({ codeType: "HCPCS", code: "G0202", description: "Screening mammography reference", source: "measure" });
          }
          if (item.itemId === "COL") {
            codes.push({ codeType: "HCPCS", code: "G0121", description: "Colorectal cancer screening", source: "measure" });
          }
          if (item.itemId === "CDC-A1C") {
            codes.push({ codeType: "CPT", code: "83036", description: "Hemoglobin A1c", source: "measure" });
            codes.push({ codeType: "ICD-10", code: "Z13.1", description: "Encounter for screening for diabetes mellitus", source: "measure" });
          }
          if (item.itemId === "CBP") {
            codes.push({ codeType: "ICD-10", code: "Z13.6", description: "Encounter for screening for cardiovascular disorders", source: "measure" });
          }
        }
      }

      const unique = new Map<string, any>();
      for (const c of codes) {
        const key = `${c.codeType}:${c.code}`;
        if (!unique.has(key)) unique.set(key, c);
      }

      const savedCodes = [];
      for (const c of unique.values()) {
        const saved = await storage.createVisitCode({
          visitId: req.params.id,
          codeType: c.codeType,
          code: c.code,
          description: c.description,
          source: c.source,
          autoAssigned: true,
          verified: false,
          removedByNp: false,
        });
        savedCodes.push(saved);
      }

      return res.json({ codes: savedCodes, total: savedCodes.length });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/codes/:id", async (req, res) => {
    try {
      const updated = await storage.updateVisitCode(req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Admin endpoints
  app.get("/api/admin/plan-packs", async (_req, res) => {
    try {
      const packs = await storage.getAllPlanPacks();
      return res.json(packs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/assessment-definitions", async (_req, res) => {
    try {
      const defs = await storage.getAllAssessmentDefinitions();
      return res.json(defs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/measure-definitions", async (_req, res) => {
    try {
      const defs = await storage.getAllMeasureDefinitions();
      return res.json(defs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/members/:id/labs", async (req, res) => {
    try {
      const labs = await storage.getLabResultsByMember(req.params.id);
      return res.json(labs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/members/:id/medications", async (req, res) => {
    try {
      const meds = await storage.getMedicationHistoryByMember(req.params.id);
      return res.json(meds);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/members/:id/vitals-history", async (req, res) => {
    try {
      const history = await storage.getVitalsHistoryByMember(req.params.id);
      return res.json(history);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ========== Medication Reconciliation API ==========

  app.get("/api/visits/:visitId/med-reconciliation", async (req, res) => {
    try {
      const meds = await storage.getMedReconciliationByVisit(req.params.visitId);
      return res.json(meds);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:visitId/med-reconciliation", async (req, res) => {
    try {
      const med = await storage.createMedReconciliation({
        ...req.body,
        visitId: req.params.visitId,
        reconciledAt: new Date().toISOString(),
      });
      return res.status(201).json(med);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:visitId/med-reconciliation/bulk", async (req, res) => {
    try {
      const items = req.body.medications || [];
      const created = [];
      for (const item of items) {
        const med = await storage.createMedReconciliation({
          ...item,
          visitId: req.params.visitId,
          reconciledAt: new Date().toISOString(),
        });
        created.push(med);
      }
      return res.status(201).json(created);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/visits/:visitId/med-reconciliation/:id", async (req, res) => {
    try {
      const updated = await storage.updateMedReconciliation(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/visits/:visitId/med-reconciliation/:id", async (req, res) => {
    try {
      await storage.deleteMedReconciliation(req.params.id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ========== FHIR R4 API ==========

  // --- Helper: convert member to FHIR Patient ---
  function memberToFhirPatient(member: any) {
    return {
      resourceType: "Patient",
      id: member.id,
      identifier: [{ system: "urn:easy-health:member-id", value: member.memberId }],
      name: [{ family: member.lastName, given: [member.firstName], use: "official" }],
      birthDate: member.dob,
      gender: member.gender || "unknown",
      telecom: [
        member.phone ? { system: "phone", value: member.phone, use: "home" } : null,
        member.email ? { system: "email", value: member.email } : null,
      ].filter(Boolean),
      address: member.address ? [{
        use: "home",
        line: [member.address],
        city: member.city || "",
        state: member.state || "",
        postalCode: member.zip || "",
      }] : [],
      generalPractitioner: member.pcp ? [{ display: member.pcp }] : [],
    };
  }

  // --- Helper: convert visit to FHIR Encounter ---
  function visitToFhirEncounter(visit: any, member: any) {
    return {
      resourceType: "Encounter",
      id: visit.id,
      status: visit.status === "finalized" || visit.status === "exported" ? "finished" :
              visit.status === "in_progress" ? "in-progress" : "planned",
      class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "HH", display: "home health" },
      type: [{ coding: [{ system: "urn:easy-health:visit-type", code: visit.visitType, display: visit.visitType?.replace(/_/g, " ") }] }],
      subject: { reference: `Patient/${member?.id || visit.memberId}` },
      period: {
        start: visit.scheduledDate,
        ...(visit.finalizedAt ? { end: visit.finalizedAt } : {}),
      },
      participant: visit.npUserId ? [{ individual: { reference: `Practitioner/${visit.npUserId}` } }] : [],
    };
  }

  // --- Helper: convert vitals to FHIR Observations ---
  function vitalsToFhirObservations(vitals: any, visitId: string) {
    const observations: any[] = [];
    if (vitals.systolic || vitals.diastolic) {
      observations.push({
        resourceType: "Observation",
        id: `${vitals.id}-bp`,
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel" }] },
        encounter: { reference: `Encounter/${visitId}` },
        component: [
          vitals.systolic ? { code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic BP" }] }, valueQuantity: { value: vitals.systolic, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" } } : null,
          vitals.diastolic ? { code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic BP" }] }, valueQuantity: { value: vitals.diastolic, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" } } : null,
        ].filter(Boolean),
      });
    }
    if (vitals.heartRate) {
      observations.push({
        resourceType: "Observation",
        id: `${vitals.id}-hr`,
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
        encounter: { reference: `Encounter/${visitId}` },
        valueQuantity: { value: vitals.heartRate, unit: "bpm", system: "http://unitsofmeasure.org", code: "/min" },
      });
    }
    if (vitals.respiratoryRate) {
      observations.push({
        resourceType: "Observation",
        id: `${vitals.id}-rr`,
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "9279-1", display: "Respiratory rate" }] },
        encounter: { reference: `Encounter/${visitId}` },
        valueQuantity: { value: vitals.respiratoryRate, unit: "breaths/min", system: "http://unitsofmeasure.org", code: "/min" },
      });
    }
    if (vitals.temperature) {
      observations.push({
        resourceType: "Observation",
        id: `${vitals.id}-temp`,
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "8310-5", display: "Body temperature" }] },
        encounter: { reference: `Encounter/${visitId}` },
        valueQuantity: { value: vitals.temperature, unit: "degF", system: "http://unitsofmeasure.org", code: "[degF]" },
      });
    }
    if (vitals.oxygenSaturation) {
      observations.push({
        resourceType: "Observation",
        id: `${vitals.id}-spo2`,
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "2708-6", display: "Oxygen saturation" }] },
        encounter: { reference: `Encounter/${visitId}` },
        valueQuantity: { value: vitals.oxygenSaturation, unit: "%", system: "http://unitsofmeasure.org", code: "%" },
      });
    }
    if (vitals.weight) {
      observations.push({
        resourceType: "Observation",
        id: `${vitals.id}-wt`,
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }] },
        encounter: { reference: `Encounter/${visitId}` },
        valueQuantity: { value: vitals.weight, unit: "lbs", system: "http://unitsofmeasure.org", code: "[lb_av]" },
      });
    }
    if (vitals.bmi) {
      observations.push({
        resourceType: "Observation",
        id: `${vitals.id}-bmi`,
        status: "final",
        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
        code: { coding: [{ system: "http://loinc.org", code: "39156-5", display: "BMI" }] },
        encounter: { reference: `Encounter/${visitId}` },
        valueQuantity: { value: vitals.bmi, unit: "kg/m2", system: "http://unitsofmeasure.org", code: "kg/m2" },
      });
    }
    return observations;
  }

  // --- Helper: convert visit codes (ICD-10) to FHIR Conditions ---
  function codesToFhirConditions(codes: any[], visitId: string, memberId: string) {
    return codes
      .filter((c: any) => c.codeType === "ICD-10" && !c.removedByNp)
      .map((c: any) => ({
        resourceType: "Condition",
        id: c.id,
        clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
        code: { coding: [{ system: "http://hl7.org/fhir/sid/icd-10-cm", code: c.code, display: c.description }] },
        subject: { reference: `Patient/${memberId}` },
        encounter: { reference: `Encounter/${visitId}` },
      }));
  }

  // --- Outbound: GET /api/fhir/Patient/:id ---
  app.get("/api/fhir/Patient/:id", async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) return res.status(404).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found", diagnostics: "Patient not found" }] });
      return res.json(memberToFhirPatient(member));
    } catch (err: any) {
      return res.status(500).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "exception", diagnostics: err.message }] });
    }
  });

  // --- Outbound: GET /api/fhir/Encounter/:id ---
  app.get("/api/fhir/Encounter/:id", async (req, res) => {
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found", diagnostics: "Encounter not found" }] });
      const member = await storage.getMember(visit.memberId);
      return res.json(visitToFhirEncounter(visit, member));
    } catch (err: any) {
      return res.status(500).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "exception", diagnostics: err.message }] });
    }
  });

  // --- Outbound: GET /api/fhir/Observation?encounter=:id ---
  app.get("/api/fhir/Observation", async (req, res) => {
    try {
      const encounterId = req.query.encounter as string;
      if (!encounterId) return res.status(400).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "required", diagnostics: "encounter query parameter required" }] });
      const visit = await storage.getVisit(encounterId);
      if (!visit) return res.status(404).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found", diagnostics: "Encounter not found" }] });
      const vitals = await storage.getVitalsByVisit(encounterId);
      const observations = vitals ? vitalsToFhirObservations(vitals, encounterId) : [];
      return res.json({
        resourceType: "Bundle",
        type: "searchset",
        total: observations.length,
        entry: observations.map(obs => ({ resource: obs })),
      });
    } catch (err: any) {
      return res.status(500).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "exception", diagnostics: err.message }] });
    }
  });

  // --- Outbound: GET /api/fhir/Condition?encounter=:id ---
  app.get("/api/fhir/Condition", async (req, res) => {
    try {
      const encounterId = req.query.encounter as string;
      if (!encounterId) return res.status(400).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "required", diagnostics: "encounter query parameter required" }] });
      const visit = await storage.getVisit(encounterId);
      if (!visit) return res.status(404).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found", diagnostics: "Encounter not found" }] });
      const codes = await storage.getCodesByVisit(encounterId);
      const conditions = codesToFhirConditions(codes, encounterId, visit.memberId);
      return res.json({
        resourceType: "Bundle",
        type: "searchset",
        total: conditions.length,
        entry: conditions.map(cond => ({ resource: cond })),
      });
    } catch (err: any) {
      return res.status(500).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "exception", diagnostics: err.message }] });
    }
  });

  // --- Outbound: GET /api/fhir/Bundle?visit=:id ---
  app.get("/api/fhir/Bundle", async (req, res) => {
    try {
      const visitId = req.query.visit as string;
      if (!visitId) return res.status(400).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "required", diagnostics: "visit query parameter required" }] });
      const visit = await storage.getVisit(visitId);
      if (!visit) return res.status(404).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found", diagnostics: "Visit not found" }] });

      const member = await storage.getMember(visit.memberId);
      const vitals = await storage.getVitalsByVisit(visit.id);
      const codes = await storage.getCodesByVisit(visit.id);
      const note = await storage.getClinicalNote(visit.id);
      const tasks = await storage.getTasksByVisit(visit.id);
      const assessments = await storage.getAssessmentResponsesByVisit(visit.id);

      const entries: any[] = [];
      if (member) entries.push({ fullUrl: `urn:uuid:${member.id}`, resource: memberToFhirPatient(member) });
      entries.push({ fullUrl: `urn:uuid:${visit.id}`, resource: visitToFhirEncounter(visit, member) });
      if (vitals) {
        vitalsToFhirObservations(vitals, visit.id).forEach(obs => {
          entries.push({ fullUrl: `urn:uuid:${obs.id}`, resource: obs });
        });
      }
      codesToFhirConditions(codes, visit.id, visit.memberId).forEach(cond => {
        entries.push({ fullUrl: `urn:uuid:${cond.id}`, resource: cond });
      });
      assessments.forEach(a => {
        entries.push({
          fullUrl: `urn:uuid:${a.id}`,
          resource: {
            resourceType: "Observation",
            id: a.id,
            status: a.status === "completed" ? "final" : "preliminary",
            category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "survey", display: "Survey" }] }],
            code: { coding: [{ system: "urn:easy-health:instrument", code: a.instrumentId, display: a.instrumentId }] },
            encounter: { reference: `Encounter/${visit.id}` },
            valueInteger: a.computedScore ?? undefined,
            interpretation: a.interpretation ? [{ text: a.interpretation }] : [],
          },
        });
      });
      if (note) {
        entries.push({
          fullUrl: `urn:uuid:${note.id}`,
          resource: {
            resourceType: "DocumentReference",
            id: note.id,
            status: "current",
            type: { coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }] },
            content: [{ attachment: { contentType: "application/json", data: Buffer.from(JSON.stringify(note)).toString("base64") } }],
          },
        });
      }
      tasks.forEach(t => {
        entries.push({
          fullUrl: `urn:uuid:${t.id}`,
          resource: {
            resourceType: "Task",
            id: t.id,
            status: t.status === "completed" ? "completed" : t.status === "in_progress" ? "in-progress" : "requested",
            description: t.title,
            note: t.description ? [{ text: t.description }] : [],
            priority: t.priority === "urgent" ? "urgent" : t.priority === "high" ? "asap" : "routine",
          },
        });
      });

      const bundle = {
        resourceType: "Bundle",
        id: `export-${visit.id}`,
        type: "document",
        timestamp: new Date().toISOString(),
        entry: entries,
      };

      return res.json(bundle);
    } catch (err: any) {
      return res.status(500).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "exception", diagnostics: err.message }] });
    }
  });

  // --- Inbound: POST /api/fhir/Patient ---
  app.post("/api/fhir/Patient", async (req, res) => {
    try {
      const resource = req.body;
      if (resource.resourceType !== "Patient") {
        return res.status(400).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "invalid", diagnostics: "Expected resourceType 'Patient'" }] });
      }
      if (!resource.name || !resource.name[0]) {
        return res.status(400).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "required", diagnostics: "Patient.name is required" }] });
      }

      const name = resource.name[0];
      const firstName = (name.given || [])[0] || "Unknown";
      const lastName = name.family || "Unknown";
      const identifier = resource.identifier?.find((i: any) => i.system === "urn:easy-health:member-id");
      const externalMemberId = identifier?.value || `FHIR-${Date.now()}`;
      const addr = resource.address?.[0];
      const phone = resource.telecom?.find((t: any) => t.system === "phone")?.value;
      const email = resource.telecom?.find((t: any) => t.system === "email")?.value;

      const existing = await storage.getMemberByMemberId(externalMemberId);
      if (existing) {
        const updated = await storage.updateMember(existing.id, {
          firstName,
          lastName,
          dob: resource.birthDate || existing.dob,
          gender: resource.gender || existing.gender,
          phone: phone || existing.phone,
          email: email || existing.email,
          address: addr?.line?.[0] || existing.address,
          city: addr?.city || existing.city,
          state: addr?.state || existing.state,
          zip: addr?.postalCode || existing.zip,
        });
        await storage.createAuditEvent({ eventType: "fhir_patient_updated", patientId: existing.id, details: `Patient ${externalMemberId} updated via FHIR API` });
        return res.status(200).json(memberToFhirPatient(updated || existing));
      }

      const created = await storage.createMember({
        memberId: externalMemberId,
        firstName,
        lastName,
        dob: resource.birthDate || "1900-01-01",
        gender: resource.gender,
        phone,
        email,
        address: addr?.line?.[0],
        city: addr?.city,
        state: addr?.state,
        zip: addr?.postalCode,
        insurancePlan: null,
        pcp: resource.generalPractitioner?.[0]?.display || null,
        conditions: null,
        medications: null,
        allergies: null,
        riskFlags: null,
      });
      await storage.createAuditEvent({ eventType: "fhir_patient_created", patientId: created.id, details: `Patient ${externalMemberId} created via FHIR API` });
      return res.status(201).json(memberToFhirPatient(created));
    } catch (err: any) {
      return res.status(500).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "exception", diagnostics: err.message }] });
    }
  });

  // --- Inbound: POST /api/fhir/Bundle ---
  app.post("/api/fhir/Bundle", async (req, res) => {
    try {
      const bundle = req.body;
      if (bundle.resourceType !== "Bundle") {
        return res.status(400).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "invalid", diagnostics: "Expected resourceType 'Bundle'" }] });
      }
      if (!bundle.entry || !Array.isArray(bundle.entry)) {
        return res.status(400).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "required", diagnostics: "Bundle.entry is required" }] });
      }

      const results: any[] = [];
      const errors: any[] = [];
      let createdMember: any = null;

      for (const entry of bundle.entry) {
        const resource = entry.resource;
        if (!resource || !resource.resourceType) {
          errors.push({ severity: "warning", code: "invalid", diagnostics: "Entry missing resource or resourceType" });
          continue;
        }

        try {
          if (resource.resourceType === "Patient") {
            const name = resource.name?.[0];
            const firstName = (name?.given || [])[0] || "Unknown";
            const lastName = name?.family || "Unknown";
            const identifier = resource.identifier?.find((i: any) => i.system === "urn:easy-health:member-id");
            const externalMemberId = identifier?.value || `FHIR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const addr = resource.address?.[0];
            const phone = resource.telecom?.find((t: any) => t.system === "phone")?.value;
            const email = resource.telecom?.find((t: any) => t.system === "email")?.value;

            const existing = await storage.getMemberByMemberId(externalMemberId);
            if (existing) {
              await storage.updateMember(existing.id, {
                firstName, lastName,
                dob: resource.birthDate || existing.dob,
                gender: resource.gender || existing.gender,
                phone: phone || existing.phone, email: email || existing.email,
                address: addr?.line?.[0] || existing.address, city: addr?.city || existing.city,
                state: addr?.state || existing.state, zip: addr?.postalCode || existing.zip,
              });
              createdMember = existing;
              results.push({ resourceType: "Patient", action: "updated", id: existing.id });
            } else {
              const created = await storage.createMember({
                memberId: externalMemberId, firstName, lastName,
                dob: resource.birthDate || "1900-01-01",
                gender: resource.gender, phone, email,
                address: addr?.line?.[0], city: addr?.city, state: addr?.state, zip: addr?.postalCode,
                insurancePlan: null, pcp: resource.generalPractitioner?.[0]?.display || null,
                conditions: null, medications: null, allergies: null, riskFlags: null,
              });
              createdMember = created;
              results.push({ resourceType: "Patient", action: "created", id: created.id });
            }
          } else if (resource.resourceType === "Encounter") {
            const subjectRef = resource.subject?.reference;
            const memberId = createdMember?.id || (subjectRef ? subjectRef.replace("Patient/", "") : null);
            if (!memberId) {
              errors.push({ severity: "warning", code: "invalid", diagnostics: "Encounter has no subject reference and no Patient in bundle" });
              continue;
            }
            const allUsers = await storage.getAllUsers();
            const npUser = allUsers.find(u => u.role === "np");
            const created = await storage.createVisit({
              memberId,
              npUserId: npUser?.id || "unknown",
              scheduledDate: resource.period?.start || new Date().toISOString().split("T")[0],
              scheduledTime: null,
              visitType: resource.type?.[0]?.coding?.[0]?.code || "annual_wellness",
              status: "scheduled",
              planId: null,
              identityVerified: false, identityMethod: null,
              signedAt: null, signedBy: null, attestationText: null, finalizedAt: null,
              syncStatus: "draft_local", travelNotes: null, safetyNotes: null,
            });
            results.push({ resourceType: "Encounter", action: "created", id: created.id });
          } else {
            results.push({ resourceType: resource.resourceType, action: "skipped", reason: "unsupported resource type" });
          }
        } catch (entryErr: any) {
          errors.push({ severity: "error", code: "exception", diagnostics: `Error processing ${resource.resourceType}: ${entryErr.message}` });
        }
      }

      await storage.createAuditEvent({
        eventType: "fhir_bundle_imported",
        details: `FHIR Bundle imported: ${results.length} resources processed, ${errors.length} errors`,
      });

      return res.status(200).json({
        resourceType: "OperationOutcome",
        issue: [
          { severity: "information", code: "informational", diagnostics: `Processed ${results.length} resources` },
          ...errors,
        ],
        results,
      });
    } catch (err: any) {
      return res.status(500).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "exception", diagnostics: err.message }] });
    }
  });

  // --- List all members as FHIR Patients ---
  app.get("/api/fhir/Patient", async (_req, res) => {
    try {
      const allMembers = await storage.getAllMembers();
      return res.json({
        resourceType: "Bundle",
        type: "searchset",
        total: allMembers.length,
        entry: allMembers.map(m => ({ resource: memberToFhirPatient(m) })),
      });
    } catch (err: any) {
      return res.status(500).json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "exception", diagnostics: err.message }] });
    }
  });

  // =====================================================
  // Demo Management endpoints
  // =====================================================

  app.post("/api/demo/reset", async (_req, res) => {
    try {
      const tableNames = [
        "audit_events", "export_artifacts", "review_decisions",
        "validation_overrides", "visit_recommendations", "visit_codes",
        "clinical_notes", "vitals_records", "measure_results",
        "assessment_responses", "required_checklists", "care_plan_tasks",
        "med_reconciliation", "lab_results", "medication_history", "vitals_history",
        "plan_targets", "visits", "members",
        "clinical_rules", "plan_packs", "measure_definitions",
        "assessment_definitions", "users",
      ];

      for (const table of tableNames) {
        await db.execute(sql.raw(`DELETE FROM ${table}`));
      }

      await seedDatabase();

      res.json({ success: true, message: "Database reset and re-seeded successfully" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/demo/fhir-bundles", async (_req, res) => {
    try {
      const allMembers = await storage.getAllMembers();
      const allVisits = await storage.getAllVisits();
      const bundles: any[] = [];

      for (const member of allMembers) {
        const memberVisits = allVisits.filter((v: any) => v.memberId === member.id);
        const patient = memberToFhirPatient(member);
        const entries: any[] = [{ fullUrl: `urn:uuid:${member.id}`, resource: patient }];

        for (const visit of memberVisits) {
          const encounter = visitToFhirEncounter(visit, member);
          entries.push({ fullUrl: `urn:uuid:${visit.id}`, resource: encounter });

          const vitals = await storage.getVitalsByVisit(visit.id);
          if (vitals) {
            const observations = vitalsToFhirObservations(vitals, visit.id);
            for (const obs of observations) {
              entries.push({ fullUrl: `urn:uuid:${obs.id}`, resource: obs });
            }
          }

          const codes = await storage.getCodesByVisit(visit.id);
          if (codes.length > 0) {
            const conditions = codesToFhirConditions(codes, visit.id, member.id);
            for (const cond of conditions) {
              entries.push({ fullUrl: `urn:uuid:${cond.id}`, resource: cond });
            }
          }
        }

        bundles.push({
          memberId: member.memberId,
          memberName: `${member.firstName} ${member.lastName}`,
          visitCount: memberVisits.length,
          bundle: {
            resourceType: "Bundle",
            type: "document",
            timestamp: new Date().toISOString(),
            entry: entries,
          },
        });
      }

      res.json(bundles);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/demo/fhir-bundle/:memberId", async (req, res) => {
    try {
      const member = await storage.getMemberByMemberId(req.params.memberId);
      if (!member) return res.status(404).json({ message: "Member not found" });

      const memberVisits = await storage.getVisitsByMember(member.id);
      const patient = memberToFhirPatient(member);
      const entries: any[] = [{ fullUrl: `urn:uuid:${member.id}`, resource: patient }];

      for (const visit of memberVisits) {
        const encounter = visitToFhirEncounter(visit, member);
        entries.push({ fullUrl: `urn:uuid:${visit.id}`, resource: encounter });

        const vitals = await storage.getVitalsByVisit(visit.id);
        if (vitals) {
          const observations = vitalsToFhirObservations(vitals, visit.id);
          for (const obs of observations) {
            entries.push({ fullUrl: `urn:uuid:${obs.id}`, resource: obs });
          }
        }

        const codes = await storage.getCodesByVisit(visit.id);
        if (codes.length > 0) {
          const conditions = codesToFhirConditions(codes, visit.id, member.id);
          for (const cond of conditions) {
            entries.push({ fullUrl: `urn:uuid:${cond.id}`, resource: cond });
          }
        }
      }

      res.json({
        resourceType: "Bundle",
        type: "document",
        timestamp: new Date().toISOString(),
        entry: entries,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/demo/sample-import-bundle", async (_req, res) => {
    try {
      res.json({
        resourceType: "Bundle",
        type: "transaction",
        timestamp: new Date().toISOString(),
        entry: [
          {
            fullUrl: "urn:uuid:demo-patient-1",
            resource: {
              resourceType: "Patient",
              identifier: [{ system: "urn:easy-health:member-id", value: "DEMO-IMPORT-001" }],
              name: [{ family: "Anderson", given: ["James", "Robert"] }],
              gender: "male",
              birthDate: "1948-06-20",
              address: [{ line: ["100 Demo Lane"], city: "Springfield", state: "IL", postalCode: "62704" }],
              telecom: [
                { system: "phone", value: "(555) 999-0001", use: "home" },
                { system: "email", value: "james.anderson@demo.com" },
              ],
            },
            request: { method: "POST", url: "Patient" },
          },
          {
            fullUrl: "urn:uuid:demo-encounter-1",
            resource: {
              resourceType: "Encounter",
              status: "planned",
              class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "HH", display: "Home Health" },
              type: [{ coding: [{ system: "http://www.ama-assn.org/go/cpt", code: "99345", display: "Home visit - new patient" }] }],
              subject: { reference: "urn:uuid:demo-patient-1" },
              period: { start: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0] },
            },
            request: { method: "POST", url: "Encounter" },
          },
          {
            fullUrl: "urn:uuid:demo-patient-2",
            resource: {
              resourceType: "Patient",
              identifier: [{ system: "urn:easy-health:member-id", value: "DEMO-IMPORT-002" }],
              name: [{ family: "Chen", given: ["Linda", "Mai"] }],
              gender: "female",
              birthDate: "1955-12-03",
              address: [{ line: ["250 Sample Blvd"], city: "Springfield", state: "IL", postalCode: "62705" }],
              telecom: [
                { system: "phone", value: "(555) 999-0002", use: "home" },
              ],
            },
            request: { method: "POST", url: "Patient" },
          },
          {
            fullUrl: "urn:uuid:demo-encounter-2",
            resource: {
              resourceType: "Encounter",
              status: "planned",
              class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "HH", display: "Home Health" },
              type: [{ coding: [{ system: "http://www.ama-assn.org/go/cpt", code: "99345", display: "Home visit - new patient" }] }],
              subject: { reference: "urn:uuid:demo-patient-2" },
              period: { start: new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0] },
            },
            request: { method: "POST", url: "Encounter" },
          },
        ],
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
