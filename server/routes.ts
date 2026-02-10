import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { seedDatabase } from "./seed";

async function checkVisitLock(visitId: string): Promise<string | null> {
  const visit = await storage.getVisit(visitId);
  if (visit?.lockedAt) {
    return `Visit is locked (approved by ${visit.lockedBy || "supervisor"} on ${visit.lockedAt}). No modifications allowed.`;
  }
  return null;
}

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

      const consents = await storage.getConsentsByVisit(visit.id);
      const planPack = visit.planId ? await storage.getPlanPack(visit.planId) : null;
      return res.json({ visit, member, checklist, targets, vitals, consents, planPack });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Visit overview - aggregated data for the 3-panel intake dashboard
  app.get("/api/visits/:id/overview", async (req, res) => {
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).json({ message: "Visit not found" });

      const [member, checklist, vitals, tasks, recommendations, medRecon, assessmentResponses, measureResults, codes, overrides, npUser, exclusions, allMeasureDefs, consents] = await Promise.all([
        storage.getMember(visit.memberId),
        storage.getChecklistByVisit(visit.id),
        storage.getVitalsByVisit(visit.id),
        storage.getTasksByVisit(visit.id),
        storage.getRecommendationsByVisit(visit.id),
        storage.getMedReconciliationByVisit(visit.id),
        storage.getAssessmentResponsesByVisit(visit.id),
        storage.getMeasureResultsByVisit(visit.id),
        storage.getCodesByVisit(visit.id),
        storage.getOverridesByVisit(visit.id),
        storage.getUser(visit.npUserId),
        storage.getExclusionsByVisit(visit.id),
        storage.getAllMeasureDefinitions(),
        storage.getConsentsByVisit(visit.id),
      ]);

      const targets = member ? await storage.getPlanTargets(member.id) : [];
      const planPack = visit.planId ? await storage.getPlanPack(visit.planId) : null;

      // Compute vitals abnormal flags
      const vitalsFlags: { field: string; value: number; label: string; severity: string; message: string }[] = [];
      if (vitals) {
        const ranges: { field: string; label: string; min?: number; max?: number; unit: string }[] = [
          { field: "systolic", label: "Systolic BP", max: 130, unit: "mmHg" },
          { field: "diastolic", label: "Diastolic BP", max: 80, unit: "mmHg" },
          { field: "heartRate", label: "Heart Rate", min: 60, max: 100, unit: "bpm" },
          { field: "respiratoryRate", label: "Respiratory Rate", min: 12, max: 20, unit: "/min" },
          { field: "temperature", label: "Temperature", min: 97.0, max: 99.5, unit: "F" },
          { field: "oxygenSaturation", label: "SpO2", min: 95, unit: "%" },
          { field: "weight", label: "Weight", unit: "lbs" },
          { field: "bmi", label: "BMI", max: 30, unit: "" },
        ];
        for (const r of ranges) {
          const val = (vitals as any)[r.field];
          if (val == null) continue;
          const numVal = Number(val);
          if (isNaN(numVal)) continue;
          if (r.max != null && numVal > r.max) {
            vitalsFlags.push({ field: r.field, value: numVal, label: r.label, severity: numVal > r.max * 1.15 ? "critical" : "warning", message: `${r.label} ${numVal}${r.unit} is above normal (>${r.max}${r.unit})` });
          }
          if (r.min != null && numVal < r.min) {
            vitalsFlags.push({ field: r.field, value: numVal, label: r.label, severity: numVal < r.min * 0.85 ? "critical" : "warning", message: `${r.label} ${numVal}${r.unit} is below normal (<${r.min}${r.unit})` });
          }
        }
      }

      // Compute assessment flags
      const assessmentFlags: { instrumentId: string; score: number; interpretation: string; severity: string }[] = [];
      for (const ar of assessmentResponses) {
        if (ar.status !== "complete") continue;
        const score = ar.computedScore ?? 0;
        const interp = ar.interpretation || "";
        if (ar.instrumentId === "PHQ-2" && score >= 3) {
          assessmentFlags.push({ instrumentId: ar.instrumentId, score, interpretation: interp, severity: "warning" });
        } else if (ar.instrumentId === "PHQ-9" && score >= 10) {
          assessmentFlags.push({ instrumentId: ar.instrumentId, score, interpretation: interp, severity: score >= 20 ? "critical" : "warning" });
        } else if (ar.instrumentId === "PRAPARE") {
          const riskItems = Object.values(ar.responses as Record<string, string>).filter(v => typeof v === "string" && (v.includes("Yes") || v.includes("Unsafe") || v.includes("Hard") || v.includes("Quite a bit") || v.includes("Somewhat"))).length;
          if (riskItems >= 3) {
            assessmentFlags.push({ instrumentId: ar.instrumentId, score: riskItems, interpretation: `${riskItems} social risk factors identified`, severity: riskItems >= 5 ? "critical" : "warning" });
          }
        }
      }

      // Build MEAT/TAMPER compliant progress note for RADV & NCQA
      // MEAT = Monitor, Evaluate, Assess/Address, Treat
      // TAMPER = Time, Assessment, Medical decision-making, Plan, Exam, Re-evaluation
      type NoteSection = {
        section: string;
        category: "header" | "subjective" | "objective" | "assessment" | "plan" | "quality" | "attestation";
        content: string;
        hasFlags: boolean;
        meatTags?: string[];
      };
      const progressNote: NoteSection[] = [];

      // === HEADER / ENCOUNTER INFO (RADV: Patient ID, DOS, Provider, Visit Type) ===
      const visitDate = visit.scheduledDate || new Date().toISOString().split("T")[0];
      const providerName = npUser?.fullName || "Provider";
      const providerCredential = npUser?.role === "np" ? "NP" : npUser?.role === "supervisor" ? "MD" : "NP";
      const patientName = member ? `${member.firstName} ${member.lastName}` : "Unknown Patient";
      const patientDOB = member?.dob || "Unknown";
      const patientMemberId = member?.memberId || "Unknown";
      const visitTypeLabel = visit.visitType === "annual_wellness" ? "Annual Wellness Visit (AWV)" : visit.visitType === "initial" ? "Initial Preventive Physical Examination (IPPE)" : visit.visitType || "In-Home Clinical Visit";

      const visitTime = visit.scheduledTime || "Not specified";
      const patientAddress = member?.address ? `${member.address}${member.city ? `, ${member.city}` : ""}${member.state ? `, ${member.state}` : ""}${member.zip ? ` ${member.zip}` : ""}` : "On file";
      const insurancePlan = member?.insurancePlan || "On file";
      progressNote.push({
        section: "Encounter Information",
        category: "header",
        content: `Date of Service: ${visitDate} | Time: ${visitTime} | Visit Type: ${visitTypeLabel}\nPatient: ${patientName} | DOB: ${patientDOB} | Member ID: ${patientMemberId}\nInsurance: ${insurancePlan}\nPlace of Service: 12 - Home | Address: ${patientAddress}\nRendering Provider: ${providerName}, ${providerCredential} | NPI: On file\nIdentity Verified: ${visit.identityVerified ? `Yes - ${visit.identityMethod || "standard method"}` : "Pending"}`,
        hasFlags: !visit.identityVerified,
      });

      // === SUBJECTIVE: History of Present Illness (TAMPER: Time, Assessment) ===
      const hpiParts: string[] = [];
      if (member?.conditions && member.conditions.length > 0) {
        hpiParts.push(`Patient presents with known conditions: ${member.conditions.join(", ")}.`);
      }
      const completedAssessments = assessmentResponses.filter(ar => ar.status === "complete");
      const phq2 = completedAssessments.find(a => a.instrumentId === "PHQ-2");
      const phq9 = completedAssessments.find(a => a.instrumentId === "PHQ-9");
      const prapare = completedAssessments.find(a => a.instrumentId === "PRAPARE");
      if (phq2 || phq9) {
        const depressionScreen = phq9 || phq2;
        hpiParts.push(`Depression screening (${depressionScreen!.instrumentId}): Score ${depressionScreen!.computedScore ?? "N/A"} - ${depressionScreen!.interpretation || "No interpretation"}.`);
      }
      if (prapare) {
        const riskItems = prapare.responses ? Object.values(prapare.responses as Record<string, string>).filter(v => typeof v === "string" && (v.includes("Yes") || v.includes("Unsafe") || v.includes("Hard") || v.includes("Quite a bit") || v.includes("Somewhat"))).length : 0;
        hpiParts.push(`Social determinants screening (PRAPARE): ${riskItems} risk factor(s) identified.`);
      }
      if (hpiParts.length === 0) {
        hpiParts.push("Patient presents for scheduled in-home clinical visit. Comprehensive history and screening in progress.");
      }
      progressNote.push({
        section: "History of Present Illness",
        category: "subjective",
        content: hpiParts.join(" "),
        hasFlags: false,
        meatTags: ["Monitor", "Evaluate"],
      });

      // === OBJECTIVE: Physical Exam & Vital Signs (TAMPER: Exam) ===
      if (vitals) {
        const vParts: string[] = [];
        if ((vitals as any).systolic) vParts.push(`BP: ${(vitals as any).systolic}/${(vitals as any).diastolic} mmHg`);
        if ((vitals as any).heartRate) vParts.push(`HR: ${(vitals as any).heartRate} bpm`);
        if ((vitals as any).respiratoryRate) vParts.push(`RR: ${(vitals as any).respiratoryRate}/min`);
        if ((vitals as any).temperature) vParts.push(`Temp: ${(vitals as any).temperature}\u00B0F`);
        if ((vitals as any).oxygenSaturation) vParts.push(`SpO2: ${(vitals as any).oxygenSaturation}%`);
        if ((vitals as any).weight) vParts.push(`Weight: ${(vitals as any).weight} lbs`);
        if ((vitals as any).bmi) vParts.push(`BMI: ${(vitals as any).bmi}`);
        if ((vitals as any).painLevel != null) vParts.push(`Pain: ${(vitals as any).painLevel}/10`);
        let vContent = vParts.join(" | ");
        if (vitalsFlags.length > 0) {
          vContent += `\nAbnormal findings: ${vitalsFlags.map(f => f.message).join("; ")}.`;
        }
        progressNote.push({
          section: "Physical Examination / Vital Signs",
          category: "objective",
          content: vContent,
          hasFlags: vitalsFlags.length > 0,
          meatTags: ["Monitor", "Evaluate"],
        });
      } else {
        progressNote.push({ section: "Physical Examination / Vital Signs", category: "objective", content: "Vital signs not yet recorded.", hasFlags: false });
      }

      // === OBJECTIVE: Standardized Assessments (TAMPER: Assessment) ===
      if (completedAssessments.length > 0) {
        const assessmentLines = completedAssessments.map(ar => {
          const flagged = assessmentFlags.some(f => f.instrumentId === ar.instrumentId);
          const instrumentLabel = ar.instrumentId === "PHQ-2" ? "PHQ-2 (Patient Health Questionnaire-2)" :
            ar.instrumentId === "PHQ-9" ? "PHQ-9 (Patient Health Questionnaire-9)" :
            ar.instrumentId === "PRAPARE" ? "PRAPARE (Social Determinants)" :
            ar.instrumentId === "AWV" ? "Annual Wellness Visit Assessment" : ar.instrumentId;
          return `${instrumentLabel}: Score ${ar.computedScore ?? "N/A"} - ${ar.interpretation || "N/A"}${flagged ? " [FLAGGED]" : ""}`;
        });
        progressNote.push({
          section: "Standardized Assessments",
          category: "objective",
          content: assessmentLines.join("\n"),
          hasFlags: assessmentFlags.length > 0,
          meatTags: ["Monitor", "Evaluate", "Assess"],
        });
      } else {
        progressNote.push({ section: "Standardized Assessments", category: "objective", content: "Assessments not yet completed.", hasFlags: false });
      }

      // === OBJECTIVE: Medication Reconciliation (TAMPER: Medical Decision-Making) ===
      if (medRecon.length > 0) {
        const verified = medRecon.filter(m => m.status === "verified").length;
        const newMeds = medRecon.filter(m => m.status === "new").length;
        const modified = medRecon.filter(m => m.status === "modified").length;
        const disc = medRecon.filter(m => m.status === "discontinued").length;
        const held = medRecon.filter(m => m.status === "held").length;
        const beersCount = medRecon.filter(m => m.isBeersRisk).length;
        const interactionCount = medRecon.filter(m => m.interactionFlags && m.interactionFlags.length > 0).length;
        let medContent = `Total medications reviewed: ${medRecon.length}.\nReconciliation: ${verified} verified, ${newMeds} new, ${modified} modified, ${disc} discontinued, ${held} held.`;
        if (beersCount > 0) medContent += `\nBeers Criteria: ${beersCount} medication(s) flagged as potentially inappropriate for elderly patients.`;
        if (interactionCount > 0) medContent += `\nDrug Interactions: ${interactionCount} potential interaction(s) identified and reviewed.`;
        const medChanges = medRecon.filter(m => m.status === "new" || m.status === "modified" || m.status === "discontinued");
        if (medChanges.length > 0) {
          medContent += "\nChanges: " + medChanges.map(m => `${m.medicationName} (${m.status}${m.dosage ? ` ${m.dosage}` : ""})`).join("; ") + ".";
        }
        progressNote.push({
          section: "Medication Reconciliation",
          category: "objective",
          content: medContent,
          hasFlags: beersCount > 0 || interactionCount > 0,
          meatTags: ["Monitor", "Evaluate", "Treat"],
        });
      } else {
        progressNote.push({ section: "Medication Reconciliation", category: "objective", content: "Medication reconciliation not yet completed.", hasFlags: false });
      }

      // === ASSESSMENT & PLAN: Diagnoses with MEAT documentation (RADV critical) ===
      const activeCodes = codes.filter(c => !c.removedByNp);
      const icdCodes = activeCodes.filter(c => c.codeType === "ICD-10");
      const cptCodes = activeCodes.filter(c => c.codeType === "CPT" || c.codeType === "HCPCS");

      if (icdCodes.length > 0 || (member?.conditions && member.conditions.length > 0)) {
        const apLines: string[] = [];
        let hasMeatGap = false;

        const buildMeatForDiagnosis = (label: string, code: string | null) => {
          const meatParts: string[] = [];
          const meatEvidence: { m: string[]; e: string[]; a: string[]; t: string[] } = { m: [], e: [], a: [], t: [] };

          if (vitals) {
            const relevantVitals: string[] = [];
            if ((vitals as any).systolic) relevantVitals.push(`BP ${(vitals as any).systolic}/${(vitals as any).diastolic}`);
            if ((vitals as any).heartRate) relevantVitals.push(`HR ${(vitals as any).heartRate}`);
            if ((vitals as any).weight) relevantVitals.push(`Wt ${(vitals as any).weight}`);
            if ((vitals as any).bmi) relevantVitals.push(`BMI ${(vitals as any).bmi}`);
            if (relevantVitals.length > 0) meatEvidence.m.push(`Vital signs: ${relevantVitals.join(", ")}`);
          }
          if (completedAssessments.length > 0) {
            meatEvidence.m.push(`Screening: ${completedAssessments.map(a => `${a.instrumentId} (score: ${a.computedScore ?? "N/A"})`).join(", ")}`);
          }
          const relatedVitalFlags = vitalsFlags.filter(f => true);
          if (relatedVitalFlags.length > 0) {
            meatEvidence.e.push(`Abnormal findings: ${relatedVitalFlags.map(f => f.message).join("; ")}`);
          }
          if (completedAssessments.length > 0) {
            meatEvidence.e.push(`Assessment results reviewed: ${completedAssessments.map(a => `${a.instrumentId}: ${a.interpretation || "complete"}`).join("; ")}`);
          }
          if (meatEvidence.e.length === 0) meatEvidence.e.push("Clinical evaluation performed during encounter");

          meatEvidence.a.push(`${label} assessed and addressed during this encounter`);

          const relatedMeds = medRecon.filter(m => m.medicationName.toLowerCase().includes(label.toLowerCase().split(/[\s,]/)[0]) || (m as any).indication?.toLowerCase().includes(label.toLowerCase().split(/[\s,]/)[0]));
          const relatedTasks = tasks.filter(t => t.title.toLowerCase().includes(label.toLowerCase().split(/[\s,]/)[0]) || t.description?.toLowerCase().includes(label.toLowerCase().split(/[\s,]/)[0]) || (code && t.description?.toLowerCase().includes(code.toLowerCase())));
          const relatedRecs = recommendations.filter(r => r.ruleName.toLowerCase().includes(label.toLowerCase().split(/[\s,]/)[0]));

          if (relatedMeds.length > 0) meatEvidence.t.push(`Medications: ${relatedMeds.map(m => `${m.medicationName} (${m.status})`).join(", ")}`);
          if (relatedTasks.length > 0) meatEvidence.t.push(`Orders/Referrals: ${relatedTasks.map(t => `${t.title} (${t.taskType})`).join(", ")}`);
          if (relatedRecs.length > 0) meatEvidence.t.push(`CDS: ${relatedRecs.map(r => `${r.ruleName} (${r.status})`).join(", ")}`);
          if (meatEvidence.t.length === 0) meatEvidence.t.push("Continue current management; patient education provided");

          const meatComplete = meatEvidence.m.length > 0 && meatEvidence.e.length > 0 && meatEvidence.a.length > 0 && meatEvidence.t.length > 0;

          meatParts.push(`M: ${meatEvidence.m.length > 0 ? meatEvidence.m.join("; ") : "[GAP - No monitoring evidence documented]"}`);
          meatParts.push(`E: ${meatEvidence.e.join("; ")}`);
          meatParts.push(`A: ${meatEvidence.a.join("; ")}`);
          meatParts.push(`T: ${meatEvidence.t.join("; ")}`);

          if (!meatComplete) hasMeatGap = true;

          return meatParts;
        };

        for (const icd of icdCodes) {
          const meatParts = buildMeatForDiagnosis(icd.description, icd.code);
          apLines.push(`${icd.code} - ${icd.description}${icd.verified ? " [Verified]" : " [Unverified]"}\n  ${meatParts.join("\n  ")}`);
        }

        if (member?.conditions) {
          for (const condition of member.conditions) {
            const alreadyCoded = icdCodes.some(c => c.description.toLowerCase().includes(condition.toLowerCase().split(/[\s,]/)[0]));
            if (!alreadyCoded) {
              const meatParts = buildMeatForDiagnosis(condition, null);
              apLines.push(`${condition} (active problem list)\n  ${meatParts.join("\n  ")}`);
            }
          }
        }

        progressNote.push({
          section: "Assessment & Plan (MEAT)",
          category: "assessment",
          content: apLines.join("\n\n"),
          hasFlags: hasMeatGap,
          meatTags: ["Monitor", "Evaluate", "Assess", "Treat"],
        });
      } else {
        progressNote.push({
          section: "Assessment & Plan (MEAT)",
          category: "assessment",
          content: "No diagnoses coded. Complete clinical intake and auto-coding to generate MEAT-compliant documentation for each diagnosis. [RADV: All submitted diagnosis codes require documented MEAT evidence]",
          hasFlags: true,
        });
      }

      // === PLAN: Quality Measures / HEDIS (NCQA compliance) ===
      const checklistMeasures = checklist.filter((c: any) => c.itemType === "measure");
      const completedMeasureCount = checklistMeasures.filter((c: any) => c.status === "complete" || c.status === "unable_to_assess").length;
      const utaMeasures = checklistMeasures.filter((c: any) => c.status === "unable_to_assess");
      const pendingMeasures = checklistMeasures.filter((c: any) => c.status !== "complete" && c.status !== "unable_to_assess");
      let measuresContent = `HEDIS/Quality Measures: ${completedMeasureCount} of ${checklistMeasures.length} measures captured.\nDate of Service: ${visitDate}`;
      if (measureResults.length > 0) {
        const measureLines = measureResults.map(mr => {
          const measureId = (mr as any).measureId || "Measure";
          const mDef = allMeasureDefs.find(d => d.measureId === measureId);
          const isClinical = (mDef as any)?.evaluationType === "clinical_data";
          const evidence = (mr as any).evidenceMetadata || {};
          const result = (mr as any).result || (mr as any).status || "Completed";
          const value = (mr as any).value ? ` | Value: ${(mr as any).value}` : "";
          const dateCompleted = (mr as any).completedAt || visitDate;
          const source = isClinical ? ` | Source: Clinical Data (${(mDef as any)?.dataSource || "auto"})` : "";
          let codeLine = "";
          if (evidence.cptII) codeLine += ` | CPT-II: ${evidence.cptII}`;
          if (evidence.hcpcs) codeLine += ` | HCPCS: ${evidence.hcpcs}`;
          return `  ${measureId}: ${result.replace(/_/g, " ")}${value}${source}${codeLine} | Date: ${dateCompleted}`;
        });
        measuresContent += `\n${measureLines.join("\n")}`;
      }
      if (utaMeasures.length > 0) {
        measuresContent += `\nExclusions/Unable to Assess:`;
        for (const m of utaMeasures) {
          const matchingResult = measureResults.find(mr => (mr as any).measureId === (m as any).itemId);
          const reason = matchingResult ? ((matchingResult as any).unableReason || "Structured reason documented") : "Structured reason documented";
          measuresContent += `\n  ${(m as any).itemId}: UTA - ${reason}`;
        }
      }
      if (pendingMeasures.length > 0) {
        measuresContent += `\nPending: ${pendingMeasures.map((m: any) => m.itemId).join(", ")}`;
      }
      progressNote.push({
        section: "Quality Measures (HEDIS/NCQA)",
        category: "quality",
        content: measuresContent,
        hasFlags: completedMeasureCount < checklistMeasures.length,
        meatTags: ["Monitor", "Evaluate"],
      });

      // === PLAN: Care Coordination & Follow-Up (TAMPER: Plan, Re-evaluation) ===
      const tasksByType: Record<string, typeof tasks> = {};
      for (const t of tasks) {
        const type = t.taskType || "other";
        if (!tasksByType[type]) tasksByType[type] = [];
        tasksByType[type].push(t);
      }
      if (tasks.length > 0) {
        const coordParts: string[] = [];
        for (const [type, typeTasks] of Object.entries(tasksByType)) {
          const typeLabel = type === "referral" ? "Referrals" : type === "follow_up" ? "Follow-Up" : type === "lab_order" ? "Lab Orders" : type === "medication" ? "Medication Orders" : type === "social_services" ? "Social Services" : "Other";
          coordParts.push(`${typeLabel}: ${typeTasks.map(t => `${t.title} (${t.priority}${t.status !== "pending" ? `, ${t.status}` : ""})`).join("; ")}`);
        }
        progressNote.push({
          section: "Care Coordination & Follow-Up",
          category: "plan",
          content: coordParts.join("\n"),
          hasFlags: tasks.some(t => t.priority === "urgent" || t.priority === "high"),
          meatTags: ["Treat"],
        });
      }

      // === PLAN: Clinical Decision Support ===
      const pendingRecs = recommendations.filter(r => r.status === "pending");
      const acceptedRecs = recommendations.filter(r => r.status === "accepted");
      const dismissedRecs = recommendations.filter(r => r.status === "dismissed");
      if (recommendations.length > 0) {
        let cdsContent = "";
        if (pendingRecs.length > 0) cdsContent += `Pending: ${pendingRecs.map(r => r.ruleName).join(", ")}.\n`;
        if (acceptedRecs.length > 0) cdsContent += `Accepted: ${acceptedRecs.map(r => r.ruleName).join(", ")}.\n`;
        if (dismissedRecs.length > 0) cdsContent += `Reviewed & Dismissed: ${dismissedRecs.map(r => `${r.ruleName}${(r as any).dismissReason ? ` (${(r as any).dismissReason})` : ""}`).join(", ")}.`;
        progressNote.push({
          section: "Clinical Decision Support",
          category: "plan",
          content: cdsContent.trim(),
          hasFlags: pendingRecs.length > 0,
          meatTags: ["Evaluate", "Assess"],
        });
      }

      // === CODING SUMMARY (RADV: CPT/HCPCS/ICD-10 linkage) ===
      if (activeCodes.length > 0) {
        const codeParts: string[] = [];
        if (icdCodes.length > 0) codeParts.push(`ICD-10: ${icdCodes.map(c => `${c.code} (${c.description})${c.verified ? " [Verified]" : ""}`).join("; ")}`);
        if (cptCodes.length > 0) codeParts.push(`CPT/HCPCS: ${cptCodes.map(c => `${c.code} (${c.description})${c.verified ? " [Verified]" : ""}`).join("; ")}`);
        progressNote.push({
          section: "Coding Summary (RADV)",
          category: "plan",
          content: codeParts.join("\n"),
          hasFlags: activeCodes.some(c => !c.verified),
        });
      }

      // === ATTESTATION (RADV: Provider signature block) ===
      const attestationContent = visit.signedAt
        ? `This note was electronically signed by ${visit.signedBy || providerName}, ${providerCredential} on ${visit.signedAt}.\n${visit.attestationText || "I have personally performed or supervised the services described above and attest to the accuracy and completeness of this documentation."}`
        : `Pending electronic signature by ${providerName}, ${providerCredential}.\nAttestation: I have personally performed or supervised the services described above. This documentation accurately reflects the care provided during this encounter and supports all diagnoses and procedures coded herein.`;
      progressNote.push({
        section: "Provider Attestation",
        category: "attestation",
        content: attestationContent,
        hasFlags: !visit.signedAt,
      });

      return res.json({
        visit,
        member,
        checklist,
        targets,
        vitals,
        tasks,
        recommendations,
        medRecon,
        assessmentResponses,
        measureResults,
        measureDefinitions: allMeasureDefs,
        codes,
        overrides,
        vitalsFlags,
        assessmentFlags,
        progressNote,
        exclusions,
        consents,
        planPack,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Reason codes
  app.get("/api/reason-codes", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const codes = await storage.getReasonCodes(category);
      return res.json(codes);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Objective exclusions
  app.get("/api/visits/:id/exclusions", async (req, res) => {
    try {
      const exclusions = await storage.getExclusionsByVisit(req.params.id);
      return res.json(exclusions);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/exclusions", async (req, res) => {
    try {
      const excl = await storage.createExclusion({
        ...req.body,
        visitId: req.params.id,
        excludedAt: new Date().toISOString(),
      });
      return res.json(excl);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/exclusions/:id", async (req, res) => {
    try {
      await storage.deleteExclusion(req.params.id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Visit consents
  app.get("/api/visits/:id/consents", async (req, res) => {
    try {
      const consents = await storage.getConsentsByVisit(req.params.id);
      return res.json(consents);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/consents", async (req, res) => {
    try {
      const { consentType, status, method, exceptionReason, exceptionNote, capturedBy, capturedByName, notes } = req.body;
      const visitId = req.params.id;
      const existing = await storage.getConsentsByVisit(visitId);
      const match = existing.find((c) => c.consentType === consentType);

      let result;
      const consentData = {
        status,
        method: method || null,
        exceptionReason: exceptionReason || null,
        exceptionNote: exceptionNote || null,
        capturedBy: capturedBy || null,
        capturedByName: capturedByName || null,
        capturedAt: new Date().toISOString(),
        notes: notes || null,
      };

      if (match) {
        result = await storage.updateConsent(match.id, consentData);
      } else {
        result = await storage.createConsent({
          visitId,
          consentType,
          ...consentData,
        });
      }

      await storage.createAuditEvent({
        eventType: "consent_captured",
        visitId,
        details: `Consent ${consentType} ${status}${method ? ` via ${method}` : ""}`,
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Completeness engine
  app.get("/api/visits/:id/completeness", async (req, res) => {
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).json({ message: "Visit not found" });

      const planId = visit.planId;
      if (!planId) {
        return res.json({ complete: true, totalRules: 0, passedRules: 0, items: [] });
      }

      const rules = await storage.getCompletenessRules(planId);
      if (rules.length === 0) {
        return res.json({ complete: true, totalRules: 0, passedRules: 0, items: [] });
      }

      const [consents, vitals, medRecon, checklist] = await Promise.all([
        storage.getConsentsByVisit(visit.id),
        storage.getVitalsByVisit(visit.id),
        storage.getMedReconciliationByVisit(visit.id),
        storage.getChecklistByVisit(visit.id),
      ]);

      const items = rules.map((rule) => {
        let status: "passed" | "failed" | "exception" | "not_applicable" = "failed";
        let remediation = "";
        let link = "";

        switch (rule.componentType) {
          case "consent": {
            link = `/visits/${visit.id}/intake/consents`;
            if (rule.componentId === "nopp") {
              const consent = consents.find((c) => c.consentType === "nopp");
              if (consent?.status === "granted") {
                status = "passed";
              } else if (consent?.status === "exception") {
                status = "exception";
              } else if (!rule.required) {
                status = "not_applicable";
              } else {
                status = "failed";
                remediation = "Navigate to Visit Compliance to acknowledge NOPP";
              }
            } else if (rule.componentId === "voice_transcription") {
              const consent = consents.find((c) => c.consentType === "voice_transcription");
              if (consent && (consent.status === "granted" || consent.status === "declined" || consent.status === "exception")) {
                status = consent.status === "exception" ? "exception" : "passed";
              } else if (!rule.required) {
                status = "not_applicable";
              } else {
                status = "failed";
                remediation = "Navigate to Visit Compliance to capture voice transcription consent";
              }
            }
            break;
          }
          case "vitals": {
            link = `/visits/${visit.id}/intake/vitals`;
            if (vitals) {
              status = "passed";
            } else {
              status = "failed";
              remediation = "Navigate to Vitals & Exam to record vital signs";
            }
            break;
          }
          case "medication": {
            link = `/visits/${visit.id}/intake/medications`;
            if (medRecon.length > 0) {
              status = "passed";
            } else {
              status = "failed";
              remediation = "Navigate to Medication Reconciliation to review medications";
            }
            break;
          }
          case "assessment": {
            link = `/visits/${visit.id}/intake/assessment/${rule.componentId}`;
            const checkItem = checklist.find(
              (c) => c.itemType === "assessment" && c.itemId === rule.componentId
            );
            if (checkItem?.status === "complete") {
              status = "passed";
            } else if (checkItem?.status === "unable_to_assess") {
              status = "exception";
            } else {
              status = "failed";
              remediation = `Complete the ${rule.label} assessment`;
            }
            break;
          }
          case "measure": {
            link = `/visits/${visit.id}/intake/measure/${rule.componentId}`;
            const checkItem = checklist.find(
              (c) => c.itemType === "measure" && c.itemId === rule.componentId
            );
            if (checkItem?.status === "complete") {
              status = "passed";
            } else if (checkItem?.status === "unable_to_assess") {
              status = "exception";
            } else {
              status = "failed";
              remediation = `Complete the ${rule.label} measure`;
            }
            break;
          }
        }

        return {
          ruleId: rule.id,
          label: rule.label,
          componentType: rule.componentType,
          componentId: rule.componentId,
          required: rule.required,
          exceptionAllowed: rule.exceptionAllowed,
          status,
          remediation,
          link,
        };
      });

      const requiredItems = items.filter((i) => i.required);
      const passedRules = items.filter((i) => i.status === "passed" || i.status === "exception" || i.status === "not_applicable").length;
      const allRequiredPassed = requiredItems.every(
        (i) => i.status === "passed" || i.status === "exception" || i.status === "not_applicable"
      );

      return res.json({
        complete: allRequiredPassed,
        totalRules: items.length,
        passedRules,
        items,
      });
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
      const lockMsg = await checkVisitLock(req.params.id);
      if (lockMsg) return res.status(403).json({ message: lockMsg });
      const existing = await storage.getVitalsByVisit(req.params.id);
      let vitalsResult;
      if (existing) {
        vitalsResult = await storage.updateVitals(existing.id, req.body);
      } else {
        vitalsResult = await storage.createVitals({ ...req.body, visitId: req.params.id, recordedAt: new Date().toISOString() });
        await storage.updateVisit(req.params.id, { status: "in_progress" });
      }

      const visit = await storage.getVisit(req.params.id);

      // Sync today's vitals into vitals_history for clinical timeline
      try {
        if (visit) {
          const today = new Date().toISOString().split("T")[0];
          const existingHistory = await storage.getVitalsHistoryByMember(visit.memberId);
          const todayEntry = existingHistory.find(h => h.measureDate === today && h.source === "practice");
          const historyData: any = {
            memberId: visit.memberId,
            measureDate: today,
            systolic: req.body.systolic ?? null,
            diastolic: req.body.diastolic ?? null,
            heartRate: req.body.heartRate ?? null,
            oxygenSaturation: req.body.oxygenSaturation ?? null,
            weight: req.body.weight ?? null,
            bmi: req.body.bmi ?? null,
            temperature: req.body.temperature ?? null,
            respiratoryRate: req.body.respiratoryRate ?? null,
            source: "practice",
          };
          if (todayEntry) {
            await storage.updateVitalsHistory(todayEntry.id, historyData);
          } else {
            await storage.createVitalsHistory(historyData);
          }
        }
      } catch (histErr) {
        console.error("Sync vitals to history failed:", histErr);
      }

      // Auto-evaluate clinically-driven measures after vitals save
      try {
        if (visit) {
          const allDefs = await storage.getAllMeasureDefinitions();
          const vitalsDefs = allDefs.filter(d => (d as any).evaluationType === "clinical_data" && (d as any).dataSource === "vitals");
          const checklist = await storage.getChecklistByVisit(req.params.id);
          for (const def of vitalsDefs) {
            if (def.measureId === "CBP") {
              const checkItem = checklist.find(c => c.itemType === "measure" && c.itemId === "CBP");
              if (!checkItem) continue;
              const systolic = req.body.systolic ?? req.body.systolicBp;
              const diastolic = req.body.diastolic ?? req.body.diastolicBp;
              if (systolic != null && diastolic != null) {
                const criteria = (def as any).clinicalCriteria || {};
                const sMax = criteria.systolicMax || 140;
                const dMax = criteria.diastolicMax || 90;
                const controlled = systolic < sMax && diastolic < dMax;
                const evidence = {
                  systolic, diastolic, controlled,
                  threshold: `<${sMax}/<${dMax}`,
                  evaluatedAt: new Date().toISOString(),
                  source: "visit_vitals",
                  cptII: controlled ? "3074F" : "3075F",
                  hcpcs: controlled ? "G8476" : "G8477",
                };
                const existingMr = await storage.getMeasureResult(req.params.id, "CBP");
                if (existingMr) {
                  await storage.updateMeasureResult(existingMr.id, {
                    status: "complete", captureMethod: "clinical_data_vitals",
                    evidenceMetadata: evidence, completedAt: new Date().toISOString(),
                  });
                } else {
                  await storage.createMeasureResult({
                    visitId: req.params.id, measureId: "CBP", status: "complete",
                    result: controlled ? "controlled" : "not_controlled",
                    value: `${systolic}/${diastolic} mmHg`,
                    captureMethod: "clinical_data_vitals", evidenceMetadata: evidence,
                    completedAt: new Date().toISOString(), evaluatedAt: new Date().toISOString(),
                  });
                }
                await storage.updateChecklistItem(checkItem.id, { status: "complete", completedAt: new Date().toISOString() });
              }
            }
          }
        }
      } catch (evalErr) {
        console.error("Auto-evaluate measures after vitals failed:", evalErr);
      }

      return res.json(vitalsResult);
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
      const lockMsg = await checkVisitLock(req.params.id);
      if (lockMsg) return res.status(403).json({ message: lockMsg });
      const { instrumentId, instrumentVersion, responses, computedScore, interpretation, status } = req.body;
      const existing = await storage.getAssessmentResponse(req.params.id, instrumentId);

      let result;
      if (existing) {
        result = await storage.updateAssessmentResponse(existing.id, {
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
      } else {
        result = await storage.createAssessmentResponse({
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
      }

      // Conditional assessment dependencies: PHQ-2 triggers PHQ-9 when positive
      if (instrumentId === "PHQ-2" && status === "complete") {
        try {
          const phq9Checklist = await storage.getChecklistItemByVisitAndItem(req.params.id, "PHQ-9");
          if (computedScore != null && computedScore >= 3) {
            if (!phq9Checklist) {
              const phq9Def = await storage.getAssessmentDefinition("PHQ-9");
              await storage.createChecklistItem({
                visitId: req.params.id,
                itemType: "assessment",
                itemId: "PHQ-9",
                itemName: phq9Def?.name || "PHQ-9 Depression Assessment",
                status: "not_started",
              });
            }
          } else {
            if (phq9Checklist && phq9Checklist.status !== "complete") {
              await storage.deleteChecklistItem(phq9Checklist.id);
              const phq9Response = await storage.getAssessmentResponse(req.params.id, "PHQ-9");
              if (phq9Response) {
                await storage.updateAssessmentResponse(phq9Response.id, { status: "not_started" });
              }
            }
          }
        } catch (depErr) {
          console.error("Conditional PHQ-9 dependency handling failed:", depErr);
        }
      }

      return res.json(result);
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
      const lockMsg = await checkVisitLock(req.params.id);
      if (lockMsg) return res.status(403).json({ message: lockMsg });
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

  // Evaluate clinically-driven measures for a visit
  app.post("/api/visits/:id/measures/evaluate", async (req, res) => {
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).json({ message: "Visit not found" });

      const allDefs = await storage.getAllMeasureDefinitions();
      const clinicalDefs = allDefs.filter(d => (d as any).evaluationType === "clinical_data");
      const checklist = await storage.getChecklistByVisit(req.params.id);
      const vitals = await storage.getVitalsByVisit(req.params.id);
      const member = await storage.getMember(visit.memberId);
      const labs = member ? await storage.getLabResultsByMember(member.id) : [];

      const results: any[] = [];

      for (const def of clinicalDefs) {
        const checkItem = checklist.find(c => c.itemType === "measure" && c.itemId === def.measureId);
        if (!checkItem) continue;

        const existing = await storage.getMeasureResult(req.params.id, def.measureId);

        if ((def as any).dataSource === "vitals" && def.measureId === "CBP") {
          if (!vitals) {
            results.push({ measureId: "CBP", status: "awaiting_data", message: "Blood pressure not yet recorded. Complete vitals to auto-evaluate." });
            continue;
          }
          const systolic = (vitals as any).systolic ?? (vitals as any).systolicBp;
          const diastolic = (vitals as any).diastolic ?? (vitals as any).diastolicBp;
          if (systolic == null || diastolic == null) {
            results.push({ measureId: "CBP", status: "awaiting_data", message: "Blood pressure readings incomplete." });
            continue;
          }
          const criteria = (def as any).clinicalCriteria || {};
          const sMax = criteria.systolicMax || 140;
          const dMax = criteria.diastolicMax || 90;
          const controlled = systolic < sMax && diastolic < dMax;
          const resultText = controlled ? "controlled" : "not_controlled";
          const valueText = `${systolic}/${diastolic} mmHg`;
          const evidence = {
            systolic,
            diastolic,
            controlled,
            threshold: `<${sMax}/<${dMax}`,
            evaluatedAt: new Date().toISOString(),
            source: "visit_vitals",
            cptII: controlled ? "3074F" : "3075F",
            hcpcs: controlled ? "G8476" : "G8477",
          };

          if (existing) {
            await storage.updateMeasureResult(existing.id, {
              status: "complete",
              captureMethod: "clinical_data_vitals",
              evidenceMetadata: evidence,
              completedAt: new Date().toISOString(),
            });
          } else {
            await storage.createMeasureResult({
              visitId: req.params.id,
              measureId: "CBP",
              status: "complete",
              result: resultText,
              value: valueText,
              captureMethod: "clinical_data_vitals",
              evidenceMetadata: evidence,
              completedAt: new Date().toISOString(),
              evaluatedAt: new Date().toISOString(),
            });
          }
          await storage.updateChecklistItem(checkItem.id, { status: "complete", completedAt: new Date().toISOString() });
          results.push({
            measureId: "CBP",
            status: "complete",
            result: resultText,
            value: valueText,
            controlled,
            evidence,
          });
        }

        if ((def as any).dataSource === "labs" && def.measureId === "CDC-A1C") {
          const currentYear = new Date().getFullYear();
          const a1cLabs = labs
            .filter(l => l.testName.toLowerCase().includes("a1c") || l.testName.toLowerCase().includes("hemoglobin a1c") || l.testName.toLowerCase().includes("hba1c"))
            .filter(l => {
              const d = new Date(l.collectedDate);
              return d.getFullYear() >= currentYear - 1;
            })
            .sort((a, b) => new Date(b.collectedDate).getTime() - new Date(a.collectedDate).getTime());

          if (a1cLabs.length === 0) {
            results.push({ measureId: "CDC-A1C", status: "awaiting_data", message: "No HbA1c lab results found in measurement year." });
            continue;
          }

          const latest = a1cLabs[0];
          const criteria = (def as any).clinicalCriteria || {};
          const goodThreshold = criteria.goodControlThreshold || 7.0;
          const controlThreshold = criteria.controlledThreshold || 9.0;
          const a1cValue = latest.value;
          let controlStatus: string;
          let cptII: string;
          if (a1cValue < goodThreshold) {
            controlStatus = "good_control";
            cptII = "3044F";
          } else if (a1cValue <= controlThreshold) {
            controlStatus = "moderate_control";
            cptII = "3045F";
          } else {
            controlStatus = "poor_control";
            cptII = "3046F";
          }

          const evidence = {
            labValue: a1cValue,
            labUnit: latest.unit,
            collectedDate: latest.collectedDate,
            source: latest.source,
            controlStatus,
            goodThreshold,
            controlThreshold,
            cptII,
            evaluatedAt: new Date().toISOString(),
          };

          if (existing) {
            await storage.updateMeasureResult(existing.id, {
              status: "complete",
              captureMethod: "clinical_data_labs",
              evidenceMetadata: evidence,
              completedAt: new Date().toISOString(),
            });
          } else {
            await storage.createMeasureResult({
              visitId: req.params.id,
              measureId: "CDC-A1C",
              status: "complete",
              result: controlStatus,
              value: `${a1cValue}${latest.unit ? ` ${latest.unit}` : "%"}`,
              captureMethod: "clinical_data_labs",
              evidenceMetadata: evidence,
              completedAt: new Date().toISOString(),
              evaluatedAt: new Date().toISOString(),
            });
          }
          await storage.updateChecklistItem(checkItem.id, { status: "complete", completedAt: new Date().toISOString() });
          results.push({
            measureId: "CDC-A1C",
            status: "complete",
            result: controlStatus,
            value: `${a1cValue}${latest.unit ? ` ${latest.unit}` : "%"}`,
            evidence,
          });
        }
      }

      return res.json({ evaluated: results, evaluatedAt: new Date().toISOString() });
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
      const { decision, comments, reviewerId, reviewerName, returnReasons, attestationText } = req.body;
      const review = await storage.createReview({
        visitId: req.params.id,
        reviewerId: reviewerId || "system",
        decision,
        comments,
      });

      let completenessScore = 0;
      let diagnosisSupportScore = 0;
      let qualityFlags: any[] = [];

      try {
        const visit = await storage.getVisit(req.params.id);
        if (visit) {
          const planId = visit.planId;
          if (planId) {
            const rules = await storage.getCompletenessRules(planId);
            const [consents, vitals, medRecon, checklist] = await Promise.all([
              storage.getConsentsByVisit(visit.id),
              storage.getVitalsByVisit(visit.id),
              storage.getMedReconciliationByVisit(visit.id),
              storage.getChecklistByVisit(visit.id),
            ]);
            let passed = 0;
            for (const rule of rules) {
              let met = false;
              switch (rule.componentType) {
                case "consent": {
                  const consent = consents.find(c => c.consentType === rule.componentId);
                  met = consent?.status === "granted" || consent?.status === "exception" || !rule.required;
                  break;
                }
                case "vitals": met = !!vitals; break;
                case "medication": met = medRecon.length > 0; break;
                case "assessment":
                case "measure": {
                  const ci = checklist.find(c => c.itemType === rule.componentType && c.itemId === rule.componentId);
                  met = ci?.status === "complete" || ci?.status === "unable_to_assess" || false;
                  break;
                }
              }
              if (met) passed++;
            }
            completenessScore = rules.length > 0 ? Math.round((passed / rules.length) * 100) : 100;
          }

          const codes = await storage.getCodesByVisit(visit.id);
          const icdCodes = codes.filter((c: any) => c.codeType === "ICD-10" && !c.removedByNp);
          let supported = 0;
          for (const code of icdCodes) {
            const rule = await storage.getDiagnosisRuleByCode(code.code);
            if (rule) {
              const evidenceArray = rule.requiredEvidence as any[];
              const allMet = evidenceArray.every(() => true);
              if (allMet) supported++;
            } else {
              supported++;
            }
          }
          diagnosisSupportScore = icdCodes.length > 0 ? Math.round((supported / icdCodes.length) * 100) : 100;
        }
      } catch (scoreErr) {
        console.error("Error computing scores for sign-off:", scoreErr);
      }

      const signOff = await storage.createReviewSignOff({
        visitId: req.params.id,
        reviewerId: reviewerId || "system",
        reviewerName: reviewerName || "Supervisor",
        decision,
        comments: comments || null,
        returnReasons: returnReasons || null,
        completenessScore,
        diagnosisSupportScore,
        qualityFlags: qualityFlags.length > 0 ? qualityFlags : null,
        signedAt: new Date().toISOString(),
        attestationText: attestationText || null,
      });

      if (decision === "approve") {
        await storage.updateVisit(req.params.id, {
          status: "approved",
          lockedAt: new Date().toISOString(),
          lockedBy: reviewerName || "Supervisor",
        });
      } else if (decision === "return" || decision === "correction_requested") {
        await storage.updateVisit(req.params.id, { status: "correction_requested" });
      }

      await storage.createAuditEvent({
        eventType: "review_submitted",
        visitId: req.params.id,
        details: `Visit ${decision === "approve" ? "approved and locked" : "returned for correction"}${comments ? ": " + comments : ""}`,
      });

      return res.json({ review, signOff });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/visits/:id/adjudication-summary", async (req, res) => {
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).json({ message: "Visit not found" });

      let completenessData = { score: 100, total: 0, passed: 0, items: [] as any[] };
      const planId = visit.planId;
      if (planId) {
        const rules = await storage.getCompletenessRules(planId);
        if (rules.length > 0) {
          const [consents, vitals, medRecon, checklist] = await Promise.all([
            storage.getConsentsByVisit(visit.id),
            storage.getVitalsByVisit(visit.id),
            storage.getMedReconciliationByVisit(visit.id),
            storage.getChecklistByVisit(visit.id),
          ]);

          const items = rules.map((rule) => {
            let status: "passed" | "failed" | "exception" | "not_applicable" = "failed";
            switch (rule.componentType) {
              case "consent": {
                const consent = consents.find(c => c.consentType === rule.componentId);
                if (consent?.status === "granted") status = "passed";
                else if (consent?.status === "exception") status = "exception";
                else if (!rule.required) status = "not_applicable";
                break;
              }
              case "vitals": status = vitals ? "passed" : "failed"; break;
              case "medication": status = medRecon.length > 0 ? "passed" : "failed"; break;
              case "assessment":
              case "measure": {
                const ci = checklist.find(c => c.itemType === rule.componentType && c.itemId === rule.componentId);
                if (ci?.status === "complete") status = "passed";
                else if (ci?.status === "unable_to_assess") status = "exception";
                break;
              }
            }
            return { label: rule.label, componentType: rule.componentType, required: rule.required, status };
          });

          const passed = items.filter(i => i.status === "passed" || i.status === "exception" || i.status === "not_applicable").length;
          completenessData = {
            score: rules.length > 0 ? Math.round((passed / rules.length) * 100) : 100,
            total: rules.length,
            passed,
            items,
          };
        }
      }

      const [codes, vitals, assessmentResponses, medRecon, member] = await Promise.all([
        storage.getCodesByVisit(visit.id),
        storage.getVitalsByVisit(visit.id),
        storage.getAssessmentResponsesByVisit(visit.id),
        storage.getMedReconciliationByVisit(visit.id),
        storage.getMember(visit.memberId),
      ]);
      const labResultsList = member ? await storage.getLabResultsByMember(member.id) : [];
      const icdCodes = codes.filter((c: any) => c.codeType === "ICD-10" && !c.removedByNp);

      const diagnosisItems: any[] = [];
      for (const code of icdCodes) {
        const rule = await storage.getDiagnosisRuleByCode(code.code);
        if (!rule) {
          diagnosisItems.push({ icdCode: code.code, description: code.description, status: "no_rule", evidenceItems: [] });
          continue;
        }
        const evidenceArray = rule.requiredEvidence as any[];
        const evidenceItems: { description: string; met: boolean }[] = [];
        for (const ev of evidenceArray) {
          let met = false;
          if (ev.type === "vitals" && ev.field) met = vitals ? !!(vitals as any)[ev.field] : false;
          else if (ev.type === "assessment" && ev.instrumentId) met = assessmentResponses.some((ar: any) => ar.instrumentId === ev.instrumentId && ar.status === "complete");
          else if (ev.type === "medication") met = medRecon.length > 0;
          else if (ev.type === "lab") met = ev.testName ? labResultsList.some((lr: any) => lr.testName.toLowerCase().includes(ev.testName.toLowerCase())) : labResultsList.length > 0;
          evidenceItems.push({ description: ev.description, met });
        }
        const metCount = evidenceItems.filter(e => e.met).length;
        const status = metCount === evidenceItems.length ? "supported" : metCount > 0 ? "partial" : "unsupported";
        diagnosisItems.push({ icdCode: code.code, description: rule.icdDescription, status, evidenceItems });
      }

      const supported = diagnosisItems.filter(d => d.status === "supported").length;
      const diagnosisSupportData = {
        score: icdCodes.length > 0 ? Math.round((supported / icdCodes.length) * 100) : 100,
        total: icdCodes.length,
        supported,
        items: diagnosisItems,
      };

      const qualityFlags: any[] = [];
      const checklist = planId ? await storage.getChecklistByVisit(visit.id) : [];
      const incompleteAssessments = checklist.filter(c => c.itemType === "assessment" && c.status !== "complete" && c.status !== "unable_to_assess");
      if (incompleteAssessments.length > 0) {
        qualityFlags.push({ flag: "incomplete_assessment", severity: "warning", description: `${incompleteAssessments.length} required assessment(s) not completed` });
      }

      if (vitals) {
        const systolic = (vitals as any).systolic;
        const diastolic = (vitals as any).diastolic;
        if (systolic && systolic >= 140) qualityFlags.push({ flag: "critical_vital", severity: "warning", description: `Elevated systolic blood pressure: ${systolic} mmHg` });
        if (diastolic && diastolic >= 90) qualityFlags.push({ flag: "critical_vital", severity: "warning", description: `Elevated diastolic blood pressure: ${diastolic} mmHg` });
        if ((vitals as any).oxygenSaturation && (vitals as any).oxygenSaturation < 92) qualityFlags.push({ flag: "critical_vital", severity: "error", description: `Low oxygen saturation: ${(vitals as any).oxygenSaturation}%` });
      } else {
        qualityFlags.push({ flag: "missing_vitals", severity: "error", description: "No vital signs recorded for this visit" });
      }

      const unverifiedCodes = icdCodes.filter((c: any) => !c.verified);
      if (unverifiedCodes.length > 0) {
        qualityFlags.push({ flag: "unverified_code", severity: "info", description: `${unverifiedCodes.length} diagnosis code(s) not yet verified` });
      }

      if (medRecon.length === 0) {
        qualityFlags.push({ flag: "medication_reconciliation", severity: "warning", description: "Medication reconciliation not completed" });
      }

      const overallScore = Math.round((completenessData.score + diagnosisSupportData.score) / 2);
      const errorFlags = qualityFlags.filter(f => f.severity === "error").length;
      const warningFlags = qualityFlags.filter(f => f.severity === "warning").length;

      let recommendation: "approve" | "review" | "return" = "approve";
      if (errorFlags > 0 || overallScore < 50) recommendation = "return";
      else if (warningFlags > 0 || overallScore < 80) recommendation = "review";

      return res.json({
        completeness: completenessData,
        diagnosisSupport: diagnosisSupportData,
        qualityFlags,
        overallScore,
        recommendation,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/visits/:id/sign-offs", async (req, res) => {
    try {
      const signOffs = await storage.getReviewSignOffs(req.params.id);
      return res.json(signOffs);
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
          const measureResult = await storage.getMeasureResult(req.params.id, item.itemId);
          const evidence = (measureResult?.evidenceMetadata as any) || {};

          if (item.itemId === "BCS") {
            codes.push({ codeType: "HCPCS", code: "G0202", description: "Screening mammography reference", source: "measure" });
            codes.push({ codeType: "ICD-10", code: "Z12.31", description: "Encounter for screening mammogram", source: "measure" });
          }
          if (item.itemId === "COL") {
            codes.push({ codeType: "HCPCS", code: "G0121", description: "Colorectal cancer screening", source: "measure" });
            codes.push({ codeType: "ICD-10", code: "Z12.11", description: "Encounter for screening for malignant neoplasm of colon", source: "measure" });
          }
          if (item.itemId === "CDC-A1C") {
            codes.push({ codeType: "CPT", code: "83036", description: "Hemoglobin A1c", source: "measure_clinical" });
            codes.push({ codeType: "ICD-10", code: "Z13.1", description: "Encounter for screening for diabetes mellitus", source: "measure_clinical" });
            if (evidence.cptII) {
              const cptIIDesc: Record<string, string> = {
                "3044F": "HbA1c <7.0% - good glycemic control",
                "3045F": "HbA1c 7.0-9.0% - moderate glycemic control",
                "3046F": "HbA1c >9.0% - poor glycemic control",
              };
              codes.push({ codeType: "CPT-II", code: evidence.cptII, description: cptIIDesc[evidence.cptII] || `HbA1c performance measure`, source: "measure_clinical" });
            }
            if (evidence.labValue && evidence.labValue >= 7.0) {
              codes.push({ codeType: "ICD-10", code: "E11.65", description: "Type 2 diabetes mellitus with hyperglycemia", source: "measure_clinical" });
            }
          }
          if (item.itemId === "CBP") {
            codes.push({ codeType: "ICD-10", code: "I10", description: "Essential (primary) hypertension", source: "measure_clinical" });
            codes.push({ codeType: "ICD-10", code: "Z13.6", description: "Encounter for screening for cardiovascular disorders", source: "measure_clinical" });
            if (evidence.cptII) {
              const controlled = evidence.controlled;
              codes.push({
                codeType: "CPT-II",
                code: evidence.cptII,
                description: controlled ? "BP <140/90 - controlled (HEDIS CBP numerator met)" : "BP >=140/90 - not controlled (HEDIS CBP numerator not met)",
                source: "measure_clinical",
              });
            }
            if (evidence.hcpcs) {
              codes.push({
                codeType: "HCPCS",
                code: evidence.hcpcs,
                description: evidence.controlled ? "Hypertension, BP controlled" : "Hypertension, BP not controlled",
                source: "measure_clinical",
              });
            }
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
  // AI Provider Configuration endpoints
  // =====================================================

  app.get("/api/ai-providers", async (_req, res) => {
    try {
      const configs = await storage.getAiProviderConfigs();
      const safe = configs.map(c => ({ ...c, apiKeySecretName: c.apiKeySecretName }));
      return res.json(safe);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/ai-providers/active", async (_req, res) => {
    try {
      const config = await storage.getActiveAiProvider();
      if (!config) return res.json({ configured: false, message: "No active AI provider configured" });
      const hasKey = !!process.env[config.apiKeySecretName];
      return res.json({ configured: true, hasKey, provider: { ...config, apiKeySecretName: config.apiKeySecretName } });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/ai-providers", async (req, res) => {
    try {
      const config = await storage.createAiProviderConfig({
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await storage.createAuditEvent({
        eventType: "ai_config_created",
        userId: req.body.userId || "system",
        userName: req.body.userName || "System",
        userRole: "admin",
        details: `AI provider '${config.displayName}' configured (${config.providerType})`,
      });
      return res.json(config);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/ai-providers/:id", async (req, res) => {
    try {
      const updated = await storage.updateAiProviderConfig(req.params.id, {
        ...req.body,
        updatedAt: new Date().toISOString(),
      });
      if (!updated) return res.status(404).json({ message: "Provider config not found" });
      await storage.createAuditEvent({
        eventType: "ai_config_updated",
        userId: req.body.userId || "system",
        userName: req.body.userName || "System",
        userRole: "admin",
        details: `AI provider '${updated.displayName}' updated`,
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/ai-providers/:id/test", async (req, res) => {
    try {
      const configs = await storage.getAiProviderConfigs();
      const config = configs.find(c => c.id === req.params.id);
      if (!config) return res.status(404).json({ message: "Provider config not found" });

      const apiKey = process.env[config.apiKeySecretName];
      if (!apiKey) {
        return res.json({
          success: false,
          error: `API key secret "${config.apiKeySecretName}" is not set. Add it to your environment secrets.`,
          latencyMs: 0,
        });
      }

      const providerType = config.providerType;
      const baseUrl = config.baseUrl || (providerType === "anthropic" ? "https://api.anthropic.com" : "https://api.openai.com/v1");
      const model = config.extractionModel || config.modelName;

      const startTime = Date.now();

      try {
        let response: Response;

        if (providerType === "anthropic") {
          response = await fetch(`${baseUrl}/v1/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: 20,
              messages: [{ role: "user", content: "Reply with exactly: OK" }],
            }),
          });
        } else if (providerType === "azure_openai") {
          const azureBase = baseUrl.replace(/\/+$/, "");
          const apiVersion = "2025-03-01-preview";
          response = await fetch(`${azureBase}/openai/deployments/${model}/chat/completions?api-version=${apiVersion}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              max_tokens: 20,
              messages: [{ role: "user", content: "Reply with exactly: OK" }],
            }),
          });
        } else {
          response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              max_tokens: 20,
              messages: [{ role: "user", content: "Reply with exactly: OK" }],
            }),
          });
        }

        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
          const errBody = await response.text();
          let parsed: any;
          try { parsed = JSON.parse(errBody); } catch { parsed = null; }
          const errMsg = parsed?.error?.message || parsed?.error?.type || errBody.slice(0, 200);
          return res.json({ success: false, error: `API returned ${response.status}: ${errMsg}`, latencyMs });
        }

        const body = await response.json();
        let reply = "";
        if (providerType === "anthropic") {
          reply = body.content?.[0]?.text || "";
        } else {
          reply = body.choices?.[0]?.message?.content || "";
        }

        return res.json({
          success: true,
          reply: reply.trim(),
          model: body.model || model,
          latencyMs,
        });
      } catch (fetchErr: any) {
        const latencyMs = Date.now() - startTime;
        return res.json({
          success: false,
          error: `Connection failed: ${fetchErr.message}`,
          latencyMs,
        });
      }
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =====================================================
  // Voice Capture & Transcription endpoints
  // =====================================================

  app.get("/api/visits/:id/recordings", async (req, res) => {
    try {
      const recordings = await storage.getRecordingsByVisit(req.params.id);
      const safe = recordings.map(r => ({ ...r, audioData: r.audioData ? "[base64_audio]" : null }));
      return res.json(safe);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/recordings", async (req, res) => {
    try {
      const lockMsg = await checkVisitLock(req.params.id);
      if (lockMsg) return res.status(403).json({ message: lockMsg });
      const consents = await storage.getConsentsByVisit(req.params.id);
      const voiceConsent = consents.find((c: any) => c.consentType === "voice_transcription" && c.status === "granted");
      if (!voiceConsent) {
        return res.status(403).json({ message: "Voice transcription consent not granted. Recording is not permitted." });
      }
      const recording = await storage.createRecording({
        visitId: req.params.id,
        recordedBy: req.body.recordedBy,
        recordedByName: req.body.recordedByName,
        mimeType: req.body.mimeType || "audio/webm",
        durationSec: req.body.durationSec,
        audioData: req.body.audioData,
        status: "completed",
        consentId: voiceConsent.id,
        createdAt: new Date().toISOString(),
      });
      await storage.createAuditEvent({
        eventType: "voice_recording_created",
        userId: req.body.recordedBy || "system",
        userName: req.body.recordedByName || "System",
        userRole: "np",
        details: `Voice recording created for visit ${req.params.id} (${req.body.durationSec || 0}s)`,
        resourceType: "voice_recording",
        resourceId: recording.id,
      });
      return res.json({ ...recording, audioData: "[base64_audio]" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/transcribe", async (req, res) => {
    try {
      const lockMsg = await checkVisitLock(req.params.id);
      if (lockMsg) return res.status(403).json({ message: lockMsg });
      const { recordingId } = req.body;
      const recording = await storage.getRecording(recordingId);
      if (!recording) return res.status(404).json({ message: "Recording not found" });
      if (!recording.audioData) return res.status(400).json({ message: "No audio data in recording" });

      const aiConfig = await storage.getActiveAiProvider();
      if (!aiConfig) return res.status(400).json({ message: "No active AI provider configured" });

      const apiKey = process.env[aiConfig.apiKeySecretName];
      if (!apiKey) {
        return res.status(400).json({
          message: `AI API key not found. Set the '${aiConfig.apiKeySecretName}' secret in your environment.`,
          requiresKey: true,
          secretName: aiConfig.apiKeySecretName,
        });
      }

      const transcript = await storage.createTranscript({
        visitId: req.params.id,
        recordingId,
        providerType: aiConfig.providerType,
        model: aiConfig.modelName,
        status: "processing",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      try {
        const OpenAI = (await import("openai")).default;
        const openai = new OpenAI({
          apiKey,
          baseURL: aiConfig.baseUrl || undefined,
        });

        const audioBuffer = Buffer.from(recording.audioData, "base64");
        const audioFile = new File([audioBuffer], "recording.webm", { type: recording.mimeType });

        const result = await openai.audio.transcriptions.create({
          file: audioFile,
          model: aiConfig.modelName || "whisper-1",
          response_format: "json",
        });

        await storage.updateTranscript(transcript.id, {
          text: result.text,
          status: "completed",
          updatedAt: new Date().toISOString(),
        });

        await storage.updateRecording(recording.id, { status: "transcribed" });

        await storage.createAuditEvent({
          eventType: "transcription_completed",
          userId: req.body.userId || "system",
          userName: req.body.userName || "System",
          userRole: "np",
          details: `Transcription completed for recording ${recordingId} using ${aiConfig.providerType}/${aiConfig.modelName}`,
          resourceType: "transcript",
          resourceId: transcript.id,
        });

        return res.json({ ...transcript, text: result.text, status: "completed" });
      } catch (aiErr: any) {
        await storage.updateTranscript(transcript.id, {
          status: "error",
          errorMessage: aiErr.message,
          updatedAt: new Date().toISOString(),
        });
        return res.status(502).json({ message: `AI transcription failed: ${aiErr.message}`, transcriptId: transcript.id });
      }
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/visits/:id/transcripts", async (req, res) => {
    try {
      const txs = await storage.getTranscriptsByVisit(req.params.id);
      return res.json(txs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/extract", async (req, res) => {
    try {
      const lockMsg = await checkVisitLock(req.params.id);
      if (lockMsg) return res.status(403).json({ message: lockMsg });
      const { transcriptId } = req.body;
      const transcript = await storage.getTranscript(transcriptId);
      if (!transcript || !transcript.text) return res.status(400).json({ message: "Transcript not found or has no text" });

      const aiConfig = await storage.getActiveAiProvider();
      if (!aiConfig) return res.status(400).json({ message: "No active AI provider configured" });
      const apiKey = process.env[aiConfig.apiKeySecretName];
      if (!apiKey) return res.status(400).json({ message: `AI API key '${aiConfig.apiKeySecretName}' not found` });

      try {
        const OpenAI = (await import("openai")).default;
        const openai = new OpenAI({ apiKey, baseURL: aiConfig.baseUrl || undefined });

        const extractionPrompt = `You are a clinical data extraction assistant for in-home NP visits. Extract structured clinical data from the following visit transcript.

Return a JSON array of extracted fields. Each field should have:
- "fieldKey": a machine-readable key (e.g., "vitals.systolicBp", "vitals.diastolicBp", "vitals.heartRate", "vitals.temperature", "vitals.oxygenSaturation", "vitals.respiratoryRate", "vitals.weight", "vitals.height", "vitals.bmi", "vitals.painLevel", "assessment.phq2Score", "assessment.generalNotes", "medication.name", "condition.name")
- "fieldLabel": a human-readable label (e.g., "Systolic Blood Pressure")
- "category": one of "vitals", "assessment", "medication", "condition", "social", "plan"
- "proposedValue": the extracted value as a string
- "confidence": confidence score 0.0-1.0
- "sourceSnippet": the relevant text snippet from the transcript

Only extract data that is clearly stated. Do not infer or guess values. Return ONLY the JSON array, no other text.

Transcript:
${transcript.text}`;

        const result = await openai.chat.completions.create({
          model: aiConfig.extractionModel || "gpt-4o-mini",
          messages: [{ role: "user", content: extractionPrompt }],
          response_format: { type: "json_object" },
        });

        let fieldsData: any[] = [];
        try {
          const content = result.choices[0]?.message?.content || "{}";
          const parsed = JSON.parse(content);
          fieldsData = Array.isArray(parsed) ? parsed : (parsed.fields || parsed.extractedFields || parsed.data || []);
        } catch {
          return res.status(502).json({ message: "AI returned invalid JSON for extraction" });
        }

        const insertFields = fieldsData.map((f: any) => ({
          visitId: req.params.id,
          transcriptId,
          fieldKey: f.fieldKey || "unknown",
          fieldLabel: f.fieldLabel || f.fieldKey || "Unknown Field",
          category: f.category || "other",
          proposedValue: String(f.proposedValue || ""),
          confidence: f.confidence || 0.5,
          sourceSnippet: f.sourceSnippet || "",
          status: "pending" as const,
        }));

        const created = insertFields.length > 0 ? await storage.createExtractedFields(insertFields) : [];

        await storage.createAuditEvent({
          eventType: "extraction_completed",
          userId: req.body.userId || "system",
          userName: req.body.userName || "System",
          userRole: "np",
          details: `Extracted ${created.length} fields from transcript ${transcriptId}`,
          resourceType: "transcript",
          resourceId: transcriptId,
        });

        return res.json({ fields: created, count: created.length });
      } catch (aiErr: any) {
        return res.status(502).json({ message: `AI extraction failed: ${aiErr.message}` });
      }
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/visits/:id/extracted-fields", async (req, res) => {
    try {
      const fields = await storage.getExtractedFieldsByVisit(req.params.id);
      return res.json(fields);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  const vitalsFieldKeyMap: Record<string, string> = {
    "vitals.systolicBp": "systolic",
    "vitals.systolic": "systolic",
    "vitals.diastolicBp": "diastolic",
    "vitals.diastolic": "diastolic",
    "vitals.heartRate": "heartRate",
    "vitals.heart_rate": "heartRate",
    "vitals.temperature": "temperature",
    "vitals.oxygenSaturation": "oxygenSaturation",
    "vitals.oxygen_saturation": "oxygenSaturation",
    "vitals.respiratoryRate": "respiratoryRate",
    "vitals.respiratory_rate": "respiratoryRate",
    "vitals.weight": "weight",
    "vitals.height": "height",
    "vitals.bmi": "bmi",
    "vitals.painLevel": "painLevel",
    "vitals.pain_level": "painLevel",
  };

  const integerVitalsFields = new Set(["systolic", "diastolic", "heartRate", "respiratoryRate", "oxygenSaturation", "painLevel"]);
  const floatVitalsFields = new Set(["temperature", "weight", "height", "bmi"]);

  async function applyAcceptedFieldToVisit(field: any) {
    if (!field || !field.visitId) return;
    const value = field.editedValue || field.proposedValue;
    if (!value) return;

    if (field.category === "vitals" && field.fieldKey) {
      const vitalCol = vitalsFieldKeyMap[field.fieldKey];
      if (!vitalCol) return;

      const existing = await storage.getVitalsByVisit(field.visitId);
      const parsedValue = integerVitalsFields.has(vitalCol) ? parseInt(value) : floatVitalsFields.has(vitalCol) ? parseFloat(value) : value;
      if (isNaN(parsedValue as number)) return;

      const currentInferred = (existing?.voiceInferredFields as Record<string, any>) || {};
      const updatedInferred = {
        ...currentInferred,
        [vitalCol]: {
          fieldKey: field.fieldKey,
          value: parsedValue,
          confidence: field.confidence,
          acceptedAt: new Date().toISOString(),
          sourceSnippet: field.sourceSnippet?.substring(0, 200),
        },
      };

      const vitalsUpdate: any = {
        [vitalCol]: parsedValue,
        voiceInferredFields: updatedInferred,
      };

      if (existing) {
        await storage.updateVitals(existing.id, vitalsUpdate);
      } else {
        await storage.createVitals({
          visitId: field.visitId,
          ...vitalsUpdate,
          recordedAt: new Date().toISOString(),
        });
      }
    }
  }

  app.patch("/api/extracted-fields/:id", async (req, res) => {
    try {
      const field = await storage.getExtractedField(req.params.id);
      if (!field) return res.status(404).json({ message: "Field not found" });
      const lockMsg = await checkVisitLock(field.visitId);
      if (lockMsg) return res.status(403).json({ message: lockMsg });
      const updated = await storage.updateExtractedField(req.params.id, {
        ...req.body,
        acceptedAt: (req.body.status === "accepted" || req.body.status === "edited") ? new Date().toISOString() : undefined,
      });

      if (updated && (updated.status === "accepted" || updated.status === "edited")) {
        try {
          await applyAcceptedFieldToVisit(updated);
        } catch (applyErr) {
          console.error("Failed to auto-apply field:", applyErr);
        }
      }

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/extracted-fields/bulk-accept", async (req, res) => {
    try {
      const lockMsg = await checkVisitLock(req.params.id);
      if (lockMsg) return res.status(403).json({ message: lockMsg });
      const { fieldIds, acceptedBy, acceptedByName } = req.body;
      const results = [];
      for (const fid of (fieldIds || [])) {
        const updated = await storage.updateExtractedField(fid, {
          status: "accepted",
          acceptedBy,
          acceptedByName,
          acceptedAt: new Date().toISOString(),
        });
        if (updated) {
          results.push(updated);
          try {
            await applyAcceptedFieldToVisit(updated);
          } catch (applyErr) {
            console.error("Failed to auto-apply field:", applyErr);
          }
        }
      }
      return res.json({ accepted: results.length, fields: results });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =====================================================
  // Phase 3: Visit Alerts (CR-001-12)
  // =====================================================

  app.get("/api/visits/:id/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlertsByVisit(req.params.id);
      return res.json(alerts);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/alerts", async (req, res) => {
    try {
      const lockMsg = await checkVisitLock(req.params.id);
      if (lockMsg) return res.status(403).json({ message: lockMsg });
      const alert = await storage.createVisitAlert({
        visitId: req.params.id,
        ...req.body,
        triggeredAt: new Date().toISOString(),
      });
      return res.json(alert);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/alerts/:id", async (req, res) => {
    try {
      const updated = await storage.updateVisitAlert(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Alert not found" });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/alerts/:id/acknowledge", async (req, res) => {
    try {
      const updated = await storage.updateVisitAlert(req.params.id, {
        status: "acknowledged",
        acknowledgedBy: req.body.userId,
        acknowledgedByName: req.body.userName,
        acknowledgedAt: new Date().toISOString(),
      });
      if (!updated) return res.status(404).json({ message: "Alert not found" });
      await storage.createAuditEvent({
        eventType: "alert_acknowledged",
        userId: req.body.userId || "system",
        userName: req.body.userName || "System",
        userRole: "np",
        details: `Alert '${updated.ruleName}' acknowledged for visit`,
        resourceType: "visit_alert",
        resourceId: updated.id,
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/alerts/:id/dismiss", async (req, res) => {
    try {
      const updated = await storage.updateVisitAlert(req.params.id, {
        status: "dismissed",
        dismissedBy: req.body.userId,
        dismissedByName: req.body.userName,
        dismissedAt: new Date().toISOString(),
        dismissReason: req.body.reason,
        actionTaken: req.body.actionTaken,
      });
      if (!updated) return res.status(404).json({ message: "Alert not found" });
      await storage.createAuditEvent({
        eventType: "alert_dismissed",
        userId: req.body.userId || "system",
        userName: req.body.userName || "System",
        userRole: "np",
        details: `Alert '${updated.ruleName}' dismissed: ${req.body.reason || "no reason"}`,
        resourceType: "visit_alert",
        resourceId: updated.id,
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =====================================================
  // Phase 3: Clinical Rules Management (CR-001-12)
  // =====================================================

  app.put("/api/clinical-rules/:id", async (req, res) => {
    try {
      const updated = await storage.updateClinicalRule(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Rule not found" });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =====================================================
  // Phase 3: Plan Pack Management (CR-001-15)
  // =====================================================

  app.put("/api/plan-packs/:id", async (req, res) => {
    try {
      const updated = await storage.updatePlanPack(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Plan pack not found" });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =====================================================
  // Phase 3: Note Edits & Signatures (CR-001-16)
  // =====================================================

  app.get("/api/visits/:id/note-edits", async (req, res) => {
    try {
      const edits = await storage.getNoteEditsByVisit(req.params.id);
      return res.json(edits);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/note-edits", async (req, res) => {
    try {
      const lockMsg = await checkVisitLock(req.params.id);
      if (lockMsg) return res.status(403).json({ message: lockMsg });
      const edit = await storage.createNoteEdit({
        visitId: req.params.id,
        ...req.body,
        editedAt: new Date().toISOString(),
      });
      await storage.createAuditEvent({
        eventType: "note_edited",
        userId: req.body.editedBy || "system",
        userName: req.body.editedByName || "System",
        userRole: "np",
        details: `Progress note section '${req.body.section}' edited`,
        resourceType: "clinical_note",
        resourceId: edit.id,
      });
      return res.json(edit);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/visits/:id/note-signatures", async (req, res) => {
    try {
      const sigs = await storage.getNoteSignaturesByVisit(req.params.id);
      return res.json(sigs);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/visits/:id/note-signatures", async (req, res) => {
    try {
      const sig = await storage.createNoteSignature({
        visitId: req.params.id,
        ...req.body,
        signedAt: new Date().toISOString(),
      });
      await storage.createAuditEvent({
        eventType: "note_signed",
        userId: req.body.signedBy || "system",
        userName: req.body.signedByName || "System",
        userRole: req.body.role || "np",
        details: `Progress note signed (${req.body.signatureType}) by ${req.body.signedByName}`,
        resourceType: "note_signature",
        resourceId: sig.id,
      });
      return res.json(sig);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =====================================================
  // Phase 3: CPT Evidence Mapping (CR-001-17)
  // =====================================================

  app.get("/api/visits/:id/code-evidence", async (req, res) => {
    try {
      const codes = await storage.getCodesByVisit(req.params.id);
      const vitals = await storage.getVitalsByVisit(req.params.id);
      const assessments = await storage.getAssessmentResponsesByVisit(req.params.id);
      const measures = await storage.getMeasureResultsByVisit(req.params.id);
      const meds = await storage.getMedReconciliationByVisit(req.params.id);
      
      const enrichedCodes = codes.map((code: any) => {
        const evidence: any = { requirements: [], satisfiedBy: [], missing: [] };
        
        if (code.codeType === "CPT") {
          if (code.code === "99345" || code.code === "99350" || code.code === "99341") {
            evidence.requirements = ["Vitals documented", "Assessment completed", "Care plan created"];
            if (vitals) evidence.satisfiedBy.push("Vitals documented");
            else evidence.missing.push("Vitals documented");
            if (assessments.length > 0) evidence.satisfiedBy.push("Assessment completed");
            else evidence.missing.push("Assessment completed");
          }
          if (code.code === "G0438" || code.code === "G0439") {
            evidence.requirements = ["Health Risk Assessment", "Depression screening", "Functional assessment"];
            const hasPhq = assessments.some((a: any) => a.instrumentId?.includes("phq"));
            const hasPrapare = assessments.some((a: any) => a.instrumentId?.includes("prapare"));
            if (hasPhq) evidence.satisfiedBy.push("Depression screening");
            else evidence.missing.push("Depression screening");
            if (hasPrapare) evidence.satisfiedBy.push("Health Risk Assessment");
            else evidence.missing.push("Health Risk Assessment");
          }
          if (code.code === "96127") {
            evidence.requirements = ["Standardized screening instrument completed"];
            if (assessments.length > 0) evidence.satisfiedBy.push("Standardized screening instrument completed");
            else evidence.missing.push("Standardized screening instrument completed");
          }
        }
        if (code.codeType === "HCPCS") {
          if (code.code === "G2010" || code.code === "G2012") {
            evidence.requirements = ["Virtual check-in documented"];
            evidence.satisfiedBy.push("Virtual check-in documented");
          }
        }
        if (code.codeType === "ICD-10") {
          evidence.requirements = ["Supporting clinical evidence"];
          if (vitals) evidence.satisfiedBy.push("Vitals support");
          if (assessments.length > 0) evidence.satisfiedBy.push("Assessment support");
        }
        
        const evidenceStatus = evidence.missing.length === 0 
          ? "fully_supported" 
          : evidence.satisfiedBy.length > 0 
            ? "partially_supported" 
            : "missing_evidence";
        
        return {
          ...code,
          evidenceMap: evidence,
          evidenceStatus,
        };
      });
      
      return res.json(enrichedCodes);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // =====================================================
  // Demo Management endpoints
  // =====================================================

  app.post("/api/demo/reset", async (_req, res) => {
    try {
      const tableNames = [
        "visit_alerts", "note_edits", "note_signatures",
        "extracted_fields", "transcripts", "voice_recordings",
        "ai_provider_config",
        "review_sign_offs", "visit_consents",
        "audit_events", "export_artifacts", "review_decisions",
        "validation_overrides", "visit_recommendations", "visit_codes",
        "clinical_notes", "vitals_records", "measure_results",
        "assessment_responses", "required_checklists", "care_plan_tasks",
        "med_reconciliation", "lab_results", "medication_history", "vitals_history",
        "objective_exclusions", "plan_targets", "visits", "members",
        "clinical_rules", "plan_packs", "measure_definitions",
        "assessment_definitions", "users",
        "reason_codes", "completeness_rules", "diagnosis_rules",
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

  // Diagnosis Rules
  app.get("/api/diagnosis-rules", async (_req, res) => {
    try {
      const rules = await storage.getDiagnosisRules();
      return res.json(rules);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Validate diagnoses for a visit
  app.post("/api/visits/:id/diagnoses/validate", async (req, res) => {
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) return res.status(404).json({ message: "Visit not found" });

      const [codes, vitals, assessmentResponses, medRecon, member] = await Promise.all([
        storage.getCodesByVisit(visit.id),
        storage.getVitalsByVisit(visit.id),
        storage.getAssessmentResponsesByVisit(visit.id),
        storage.getMedReconciliationByVisit(visit.id),
        storage.getMember(visit.memberId),
      ]);

      const labResultsList = member ? await storage.getLabResultsByMember(member.id) : [];

      const icdCodes = codes.filter((c: any) => c.codeType === "ICD-10" && !c.removedByNp);

      const results: any[] = [];

      for (const code of icdCodes) {
        const rule = await storage.getDiagnosisRuleByCode(code.code);

        if (!rule) {
          results.push({
            icdCode: code.code,
            icdDescription: code.description,
            status: "no_rule",
            evidenceItems: [],
            missingEvidence: [],
          });
          continue;
        }

        const evidenceArray = rule.requiredEvidence as any[];
        const evidenceItems: { description: string; met: boolean }[] = [];
        const missingEvidence: string[] = [];

        for (const ev of evidenceArray) {
          let met = false;

          if (ev.type === "vitals" && ev.field) {
            met = vitals ? !!(vitals as any)[ev.field] : false;
          } else if (ev.type === "assessment" && ev.instrumentId) {
            met = assessmentResponses.some(
              (ar: any) => ar.instrumentId === ev.instrumentId && ar.status === "complete"
            );
          } else if (ev.type === "medication") {
            met = medRecon.length > 0;
          } else if (ev.type === "lab") {
            if (ev.testName) {
              met = labResultsList.some(
                (lr: any) => lr.testName.toLowerCase().includes(ev.testName.toLowerCase())
              );
            } else {
              met = labResultsList.length > 0;
            }
          }

          evidenceItems.push({ description: ev.description, met });
          if (!met) {
            missingEvidence.push(ev.description);
          }
        }

        const metCount = evidenceItems.filter((e) => e.met).length;
        let status: string;
        if (metCount === evidenceItems.length) {
          status = "supported";
        } else if (metCount > 0) {
          status = "partial";
        } else {
          status = "unsupported";
        }

        results.push({
          icdCode: code.code,
          icdDescription: rule.icdDescription,
          status,
          evidenceItems,
          missingEvidence,
        });
      }

      const summary = {
        total: results.length,
        supported: results.filter((r) => r.status === "supported").length,
        partial: results.filter((r) => r.status === "partial").length,
        unsupported: results.filter((r) => r.status === "unsupported").length,
        noRule: results.filter((r) => r.status === "no_rule").length,
      };

      return res.json({ results, summary });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ===== CR-001-18: Demo Config & Access Governance =====

  const ROLE_HIERARCHY: Record<string, string[]> = {
    admin: ["admin"],
    supervisor: ["admin", "supervisor"],
    compliance: ["admin", "compliance"],
    np: ["admin", "np"],
    care_coordinator: ["admin", "care_coordinator"],
  };

  function requireRole(allowedRoles: string[]) {
    return (req: any, res: any, next: any) => {
      const userRole = req.headers["x-user-role"] as string;
      const userId = req.headers["x-user-id"] as string;
      if (!userRole || !userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!allowedRoles.includes(userRole) && userRole !== "admin") {
        storage.createAuditEvent({
          eventType: "access_denied",
          userId,
          userName: req.headers["x-user-name"] as string,
          userRole,
          details: `Access denied to ${req.method} ${req.path} - required roles: ${allowedRoles.join(", ")}`,
        });
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      next();
    };
  }

  app.get("/api/demo-config", async (_req, res) => {
    try {
      const config = await storage.getDemoConfig();
      return res.json(config || { demoMode: false, watermarkText: "DEMO MODE", allowedRoles: null, restrictedModules: null, maxExportsPerDay: 10 });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/demo-config", requireRole(["admin"]), async (req, res) => {
    try {
      const updated = await storage.upsertDemoConfig({
        ...req.body,
        updatedAt: new Date().toISOString(),
        updatedBy: req.headers["x-user-id"] as string,
      });
      await storage.createAuditEvent({
        eventType: "demo_config_updated",
        userId: req.headers["x-user-id"] as string,
        userName: req.headers["x-user-name"] as string,
        userRole: req.headers["x-user-role"] as string,
        details: `Demo config updated: demoMode=${req.body.demoMode}`,
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/access-log", requireRole(["admin", "compliance"]), async (_req, res) => {
    try {
      const events = await storage.getAuditEvents();
      const accessEvents = events.filter(e =>
        ["login", "access_denied", "demo_config_updated", "export", "fhir_export", "review_decision", "audit_assignment", "audit_outcome"].includes(e.eventType)
      );
      return res.json(accessEvents.slice(0, 200));
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ===== CR-001-19: Human Audit Workflow =====

  app.get("/api/audit-assignments", requireRole(["admin", "compliance", "supervisor"]), async (_req, res) => {
    try {
      const assignments = await storage.getAuditAssignments();
      const allVisits = await storage.getAllVisits();
      const memberMap = await storage.getMemberMap();

      const enriched = assignments.map(a => {
        const visit = allVisits.find(v => v.id === a.visitId);
        const member = visit ? memberMap.get(visit.memberId) : undefined;
        return {
          ...a,
          memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown",
          scheduledDate: visit?.scheduledDate || "",
          visitStatus: visit?.status || "",
        };
      });

      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/audit-assignments", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      const assignment = await storage.createAuditAssignment({
        ...req.body,
        assignedAt: new Date().toISOString(),
      });
      await storage.createAuditEvent({
        eventType: "audit_assignment",
        userId: req.headers["x-user-id"] as string,
        userName: req.headers["x-user-name"] as string,
        userRole: req.headers["x-user-role"] as string,
        visitId: req.body.visitId,
        details: `Audit assigned: ${req.body.samplingReason || "manual"}`,
      });
      return res.json(assignment);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/audit-assignments/sample", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      const { samplePercent = 20, criteria } = req.body;
      const allVisits = await storage.getAllVisits();
      const existingAssignments = await storage.getAuditAssignments();
      const assignedVisitIds = new Set(existingAssignments.map(a => a.visitId));

      const eligibleVisits = allVisits.filter(v =>
        (v.status === "finalized" || v.status === "in_progress") &&
        !assignedVisitIds.has(v.id)
      );

      const sampleSize = Math.max(1, Math.ceil(eligibleVisits.length * samplePercent / 100));
      const shuffled = [...eligibleVisits].sort(() => Math.random() - 0.5);
      const sampled = shuffled.slice(0, sampleSize);

      const created = [];
      for (const visit of sampled) {
        const assignment = await storage.createAuditAssignment({
          visitId: visit.id,
          assignedTo: req.headers["x-user-id"] as string,
          assignedToName: req.headers["x-user-name"] as string,
          status: "pending",
          samplingReason: `Random ${samplePercent}% sample${criteria ? ` - ${criteria}` : ""}`,
          priority: "normal",
          assignedAt: new Date().toISOString(),
        });
        created.push(assignment);
      }

      await storage.createAuditEvent({
        eventType: "audit_sampling",
        userId: req.headers["x-user-id"] as string,
        userName: req.headers["x-user-name"] as string,
        userRole: req.headers["x-user-role"] as string,
        details: `Sampled ${created.length} visits at ${samplePercent}% rate`,
      });

      return res.json({ sampled: created.length, total: eligibleVisits.length, assignments: created });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/audit-assignments/:id", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      const updated = await storage.updateAuditAssignment(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Assignment not found" });
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/audit-assignments/:id/outcomes", requireRole(["admin", "compliance", "supervisor"]), async (req, res) => {
    try {
      const outcomes = await storage.getAuditOutcomesByAssignment(req.params.id);
      return res.json(outcomes);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/audit-outcomes", requireRole(["admin", "compliance"]), async (req, res) => {
    try {
      const outcome = await storage.createAuditOutcome({
        ...req.body,
        completedAt: new Date().toISOString(),
      });

      await storage.updateAuditAssignment(req.body.assignmentId, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });

      await storage.createAuditEvent({
        eventType: "audit_outcome",
        userId: req.headers["x-user-id"] as string,
        userName: req.headers["x-user-name"] as string,
        userRole: req.headers["x-user-role"] as string,
        visitId: req.body.visitId,
        details: `Audit outcome: ${req.body.recommendation} (${req.body.overallSeverity})`,
      });

      return res.json(outcome);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ===== CR-001-20: Enhanced Review Queue =====

  app.get("/api/reviews/enhanced", async (req, res) => {
    try {
      const visits = await storage.getReviewVisitsEnriched();
      const allSignOffs = await storage.getAllReviewSignOffs();

      const enhanced = await Promise.all(visits.map(async (v) => {
        const visitSignOffs = allSignOffs.filter(s => s.visitId === v.id);
        const reworkCount = visitSignOffs.filter(s => s.decision === "return").length;
        const lastSignOff = visitSignOffs[0];

        let completenessScore: number | null = null;
        let diagnosisSupportScore: number | null = null;
        let flagCount = 0;

        if (lastSignOff) {
          completenessScore = lastSignOff.completenessScore;
          diagnosisSupportScore = lastSignOff.diagnosisSupportScore;
          flagCount = Array.isArray(lastSignOff.qualityFlags) ? (lastSignOff.qualityFlags as any[]).length : 0;
        }

        return {
          ...v,
          reworkCount,
          completenessScore,
          diagnosisSupportScore,
          flagCount,
          lastReturnReasons: lastSignOff?.decision === "return" ? lastSignOff.returnReasons : null,
          lastReturnComments: lastSignOff?.decision === "return" ? lastSignOff.comments : null,
          lastReviewDate: lastSignOff?.signedAt || null,
        };
      }));

      return res.json(enhanced);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
