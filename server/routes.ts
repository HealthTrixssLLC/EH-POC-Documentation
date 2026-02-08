import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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
  app.get("/api/dashboard/np", async (req, res) => {
    try {
      const allVisits = await storage.getAllVisits();
      const members = await storage.getAllMembers();
      const today = new Date().toISOString().split("T")[0];
      const todayVisits = allVisits.filter((v) => v.scheduledDate === today).length;
      const inProgress = allVisits.filter((v) => v.status === "in_progress").length;
      const completed = allVisits.filter((v) => v.status === "finalized" || v.status === "ready_for_review").length;

      const upcomingVisits = allVisits.filter((v) => v.status === "scheduled" || v.status === "in_progress").slice(0, 5).map((v) => {
        const member = members.find((m) => m.id === v.memberId);
        return { ...v, memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown" };
      });

      const auditEvents = await storage.getAuditEvents();
      const recentActivity = auditEvents.slice(0, 5).map((e) => ({
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
      const tasks = await storage.getAllTasks();
      const openTasks = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
      const completedTasks = tasks.filter((t) => t.status === "completed").length;
      const members = await storage.getAllMembers();
      return res.json({ openTasks, dueToday: 0, completedTasks, totalMembers: members.length });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Visits
  app.get("/api/visits", async (_req, res) => {
    try {
      const allVisits = await storage.getAllVisits();
      const members = await storage.getAllMembers();
      const enriched = allVisits.map((v) => {
        const member = members.find((m) => m.id === v.memberId);
        return {
          ...v,
          memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown",
          address: member ? `${member.city || ""}, ${member.state || ""}` : "",
        };
      });
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
      const tasks = await storage.getAllTasks();
      const members = await storage.getAllMembers();
      const enriched = tasks.map((t) => {
        const member = members.find((m) => m.id === t.memberId);
        return { ...t, memberName: member ? `${member.firstName} ${member.lastName}` : "" };
      });
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
      const reviewVisits = await storage.getVisitsForReview();
      const allVisits = await storage.getAllVisits();
      const finalizedVisits = allVisits.filter((v) => v.status === "ready_for_review" || v.status === "finalized");
      const members = await storage.getAllMembers();
      const users = await storage.getAllUsers();

      const enriched = finalizedVisits.map((v) => {
        const member = members.find((m) => m.id === v.memberId);
        const np = users.find((u) => u.id === v.npUserId);
        return {
          ...v,
          memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown",
          npName: np?.fullName || "Unknown",
          reviewStatus: null as string | null,
        };
      });

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
