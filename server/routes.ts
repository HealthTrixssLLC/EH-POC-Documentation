import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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

  return httpServer;
}
