import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  FileText,
  GitBranch,
  ArrowRight,
  Users,
  Server,
  Database,
  FileJson,
  ChevronDown,
  ChevronRight,
  Shield,
  Activity,
  ClipboardCheck,
  Stethoscope,
  Send,
  Download,
  Upload,
} from "lucide-react";

const BRAND = {
  darkBlue: "#2E456B",
  orange: "#FEA002",
  teal: "#277493",
  tan: "#F3DBB1",
};

function DiagramBox({ x, y, w, h, label, sublabel, color, icon }: {
  x: number; y: number; w: number; h: number; label: string; sublabel?: string; color: string; icon?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={color + "18"} stroke={color} strokeWidth={1.5} />
      {icon && (
        <text x={x + 12} y={y + (sublabel ? h/2 - 4 : h/2 + 1)} fontSize={12} fill={color} dominantBaseline="middle">{icon}</text>
      )}
      <text x={x + (icon ? 28 : w/2)} y={y + (sublabel ? h/2 - 4 : h/2 + 1)} fontSize={11} fontWeight={600} fill={color} dominantBaseline="middle" textAnchor={icon ? "start" : "middle"}>{label}</text>
      {sublabel && (
        <text x={x + (icon ? 28 : w/2)} y={y + h/2 + 10} fontSize={9} fill={color + "B0"} dominantBaseline="middle" textAnchor={icon ? "start" : "middle"}>{sublabel}</text>
      )}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, label, color = "#64748b" }: {
  x1: number; y1: number; x2: number; y2: number; label?: string; color?: string;
}) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowLen = 7;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} markerEnd="url(#arrowhead)" />
      <polygon
        points={`${x2},${y2} ${x2 - arrowLen * Math.cos(angle - 0.4)},${y2 - arrowLen * Math.sin(angle - 0.4)} ${x2 - arrowLen * Math.cos(angle + 0.4)},${y2 - arrowLen * Math.sin(angle + 0.4)}`}
        fill={color}
      />
      {label && (
        <text x={midX} y={midY - 6} fontSize={8} fill={color} textAnchor="middle" fontStyle="italic">{label}</text>
      )}
    </g>
  );
}

function EndToEndWorkflowDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 900 520" className="w-full min-w-[700px]" style={{ maxHeight: 520 }}>
        <text x={450} y={22} fontSize={14} fontWeight={700} fill={BRAND.darkBlue} textAnchor="middle">End-to-End Workflow: Member List Ingestion to FHIR Export</text>

        <DiagramBox x={20} y={45} w={170} h={50} label="Member List Input" sublabel="CSV / FHIR / Manual" color={BRAND.darkBlue} />
        <Arrow x1={190} y1={70} x2={230} y2={70} color={BRAND.darkBlue} />
        <DiagramBox x={230} y={45} w={150} h={50} label="Patient Registration" sublabel="Demographics, Insurance" color={BRAND.darkBlue} />
        <Arrow x1={380} y1={70} x2={420} y2={70} color={BRAND.darkBlue} />
        <DiagramBox x={420} y={45} w={160} h={50} label="Plan Pack Assignment" sublabel="MA/ACA Assessments" color={BRAND.darkBlue} />
        <Arrow x1={580} y1={70} x2={620} y2={70} color={BRAND.darkBlue} />
        <DiagramBox x={620} y={45} w={160} h={50} label="Visit Scheduling" sublabel="NP Assignment" color={BRAND.darkBlue} />

        <rect x={20} y={120} width={860} height={3} rx={1} fill={BRAND.orange} opacity={0.4} />
        <text x={450} y={145} fontSize={12} fontWeight={700} fill={BRAND.orange} textAnchor="middle">CLINICAL VISIT LIFECYCLE</text>

        <DiagramBox x={20} y={160} w={130} h={44} label="Pre-Visit Summary" sublabel="HIE Data Review" color={BRAND.teal} />
        <Arrow x1={150} y1={182} x2={170} y2={182} color={BRAND.teal} />
        <DiagramBox x={170} y={160} w={120} h={44} label="Identity Verify" sublabel="4-Point Check" color={BRAND.teal} />
        <Arrow x1={290} y1={182} x2={310} y2={182} color={BRAND.teal} />
        <DiagramBox x={310} y={160} w={120} h={44} label="Vitals & Exam" sublabel="BP, HR, SpO2, BMI" color={BRAND.teal} />
        <Arrow x1={430} y1={182} x2={450} y2={182} color={BRAND.teal} />
        <DiagramBox x={450} y={160} w={120} h={44} label="Assessments" sublabel="PHQ, PRAPARE, AWV" color={BRAND.teal} />
        <Arrow x1={570} y1={182} x2={590} y2={182} color={BRAND.teal} />
        <DiagramBox x={590} y={160} w={140} h={44} label="Med Reconciliation" sublabel="Beers & Interactions" color={BRAND.teal} />
        <Arrow x1={730} y1={182} x2={750} y2={182} color={BRAND.teal} />
        <DiagramBox x={750} y={160} w={130} h={44} label="HEDIS Measures" sublabel="Quality Gaps" color={BRAND.teal} />

        <Arrow x1={450} y1={204} x2={450} y2={230} color={BRAND.teal} />

        <DiagramBox x={100} y={230} w={140} h={44} label="CDS Engine" sublabel="8 Clinical Rules" color="#6366f1" />
        <Arrow x1={240} y1={252} x2={310} y2={252} color="#6366f1" />
        <DiagramBox x={310} y={230} w={140} h={44} label="Auto-Coding" sublabel="ICD-10, CPT, HCPCS" color="#6366f1" />
        <Arrow x1={450} y1={252} x2={510} y2={252} color="#6366f1" />
        <DiagramBox x={510} y={230} w={160} h={44} label="Progress Note" sublabel="MEAT/TAMPER Compliant" color="#6366f1" />
        <Arrow x1={670} y1={252} x2={720} y2={252} color="#6366f1" />
        <DiagramBox x={720} y={230} w={160} h={44} label="Care Plan Tasks" sublabel="Orders & Referrals" color="#6366f1" />

        <rect x={20} y={300} width={860} height={3} rx={1} fill={BRAND.orange} opacity={0.4} />
        <text x={450} y={325} fontSize={12} fontWeight={700} fill={BRAND.orange} textAnchor="middle">FINALIZATION & REVIEW</text>

        <DiagramBox x={40} y={340} w={170} h={50} label="Gating Validation" sublabel="All steps complete?" color="#dc2626" />
        <Arrow x1={210} y1={365} x2={250} y2={365} color="#dc2626" label="Pass" />
        <DiagramBox x={250} y={340} w={160} h={50} label="NP Signature" sublabel="Attestation & Lock" color={BRAND.darkBlue} />
        <Arrow x1={410} y1={365} x2={450} y2={365} color={BRAND.darkBlue} />
        <DiagramBox x={450} y={340} w={170} h={50} label="Supervisor Review" sublabel="Approve / Request Edits" color={BRAND.orange} />
        <Arrow x1={620} y1={365} x2={660} y2={365} color={BRAND.orange} />
        <DiagramBox x={660} y={340} w={200} h={50} label="Care Coordination" sublabel="Task Dispatch to Team" color={BRAND.teal} />

        <rect x={20} y={415} width={860} height={3} rx={1} fill={BRAND.orange} opacity={0.4} />
        <text x={450} y={440} fontSize={12} fontWeight={700} fill={BRAND.orange} textAnchor="middle">DATA OUTPUT</text>

        <DiagramBox x={80} y={455} w={180} h={48} label="FHIR R4 Bundle" sublabel="Patient, Encounter, Obs, Conditions" color={BRAND.darkBlue} />
        <Arrow x1={260} y1={479} x2={310} y2={479} color={BRAND.darkBlue} />
        <DiagramBox x={310} y={455} w={160} h={48} label="EHR Integration" sublabel="Outbound HL7/FHIR" color={BRAND.darkBlue} />
        <Arrow x1={470} y1={479} x2={520} y2={479} color={BRAND.darkBlue} />
        <DiagramBox x={520} y={455} w={160} h={48} label="Payer Submission" sublabel="HEDIS, RADV, HCC" color={BRAND.darkBlue} />
        <Arrow x1={680} y1={479} x2={720} y2={479} color={BRAND.darkBlue} />
        <DiagramBox x={720} y={455} w={160} h={48} label="Analytics / Reporting" sublabel="Population Health" color={BRAND.darkBlue} />
      </svg>
    </div>
  );
}

function ActivityDiagram() {
  const lanes = [
    { label: "Admin / Ops", color: BRAND.darkBlue, x: 0 },
    { label: "Nurse Practitioner", color: BRAND.teal, x: 210 },
    { label: "Supervisor", color: BRAND.orange, x: 420 },
    { label: "Care Coordinator", color: "#6366f1", x: 630 },
  ];

  const steps = [
    { lane: 0, y: 70, label: "Import member list", sub: "(CSV/FHIR)" },
    { lane: 0, y: 120, label: "Create patients", sub: "(demographics)" },
    { lane: 0, y: 170, label: "Assign plan packs", sub: "(MA/ACA)" },
    { lane: 0, y: 220, label: "Schedule visits", sub: "(assign NP)" },
    { lane: 1, y: 280, label: "Review pre-visit summary", sub: "(HIE data)" },
    { lane: 1, y: 330, label: "Verify identity", sub: "(4-point)" },
    { lane: 1, y: 380, label: "Capture vitals & exam", sub: "(clinical)" },
    { lane: 1, y: 430, label: "Run assessments", sub: "(PHQ, AWV)" },
    { lane: 1, y: 480, label: "Reconcile medications", sub: "(safety)" },
    { lane: 1, y: 530, label: "Complete HEDIS measures", sub: "(quality)" },
    { lane: 1, y: 580, label: "Review CDS alerts", sub: "(clinical rules)" },
    { lane: 1, y: 630, label: "Sign & finalize visit", sub: "(attestation)" },
    { lane: 2, y: 690, label: "Review visit", sub: "(approve/reject)" },
    { lane: 2, y: 740, label: "Cosign attestation", sub: "(if approved)" },
    { lane: 3, y: 800, label: "Receive care tasks", sub: "(referrals, orders)" },
    { lane: 3, y: 850, label: "Execute coordination", sub: "(follow-up)" },
    { lane: 0, y: 910, label: "Export FHIR bundle", sub: "(R4 document)" },
    { lane: 0, y: 960, label: "Submit to payer", sub: "(HEDIS/RADV)" },
  ];

  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 850 1010" className="w-full min-w-[650px]" style={{ maxHeight: 1010 }}>
        <text x={425} y={22} fontSize={14} fontWeight={700} fill={BRAND.darkBlue} textAnchor="middle">Activity Diagram: Role Handoffs in Visit Lifecycle</text>

        {lanes.map((lane) => (
          <g key={lane.label}>
            <rect x={lane.x + 10} y={38} width={195} height={960} rx={6} fill={lane.color + "08"} stroke={lane.color + "30"} strokeWidth={1} strokeDasharray="4,3" />
            <rect x={lane.x + 10} y={38} width={195} height={28} rx={6} fill={lane.color + "20"} />
            <text x={lane.x + 107} y={56} fontSize={11} fontWeight={700} fill={lane.color} textAnchor="middle">{lane.label}</text>
          </g>
        ))}

        {steps.map((step, i) => {
          const lane = lanes[step.lane];
          const bx = lane.x + 20;
          const bw = 175;
          return (
            <g key={i}>
              <rect x={bx} y={step.y} width={bw} height={36} rx={5} fill={lane.color + "15"} stroke={lane.color} strokeWidth={1.2} />
              <text x={bx + bw/2} y={step.y + 15} fontSize={10} fontWeight={600} fill={lane.color} textAnchor="middle">{step.label}</text>
              <text x={bx + bw/2} y={step.y + 27} fontSize={8} fill={lane.color + "90"} textAnchor="middle">{step.sub}</text>
            </g>
          );
        })}

        {steps.slice(0, -1).map((step, i) => {
          const next = steps[i + 1];
          const curLane = lanes[step.lane];
          const nextLane = lanes[next.lane];
          const x1 = curLane.x + 107;
          const y1 = step.y + 36;
          const x2 = nextLane.x + 107;
          const y2 = next.y;

          if (step.lane === next.lane) {
            return <Arrow key={`a${i}`} x1={x1} y1={y1} x2={x2} y2={y2} color={curLane.color + "80"} />;
          }

          const midY = (y1 + y2) / 2;
          const isHandoff = step.lane !== next.lane;
          return (
            <g key={`a${i}`}>
              <path d={`M${x1},${y1} L${x1},${midY} L${x2},${midY} L${x2},${y2 - 7}`} fill="none" stroke={isHandoff ? BRAND.orange : "#64748b"} strokeWidth={1.5} strokeDasharray={isHandoff ? "5,3" : "none"} />
              <polygon
                points={`${x2},${y2} ${x2 - 5},${y2 - 8} ${x2 + 5},${y2 - 8}`}
                fill={isHandoff ? BRAND.orange : "#64748b"}
              />
              {isHandoff && (
                <text x={(x1 + x2) / 2} y={midY - 5} fontSize={8} fill={BRAND.orange} textAnchor="middle" fontWeight={600}>HANDOFF</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardHeader
        className="flex flex-row items-center gap-3 cursor-pointer select-none p-4"
        onClick={() => setOpen(!open)}
        data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
        <span className="font-semibold flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </CardHeader>
      {open && <CardContent className="pt-0 px-4 pb-4">{children}</CardContent>}
    </Card>
  );
}

function InterfaceTable({ rows }: { rows: Array<{ field: string; type: string; required: boolean; description: string }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-semibold">Field</th>
            <th className="text-left py-2 px-3 font-semibold">Type</th>
            <th className="text-left py-2 px-3 font-semibold">Req</th>
            <th className="text-left py-2 px-3 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.field} className="border-b last:border-0">
              <td className="py-1.5 px-3 font-mono text-xs">{r.field}</td>
              <td className="py-1.5 px-3"><Badge variant="secondary" className="font-mono text-xs">{r.type}</Badge></td>
              <td className="py-1.5 px-3">{r.required ? <Badge variant="default" className="text-xs">Yes</Badge> : <span className="text-muted-foreground text-xs">No</span>}</td>
              <td className="py-1.5 px-3 text-muted-foreground">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApiEndpoint({ method, path, description, request, response }: {
  method: string; path: string; description: string; request?: string; response?: string;
}) {
  const methodColors: Record<string, string> = {
    GET: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PUT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    PATCH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${methodColors[method] || ""}`}>{method}</span>
        <code className="text-sm font-mono">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {request && (
        <div>
          <span className="text-xs font-semibold text-muted-foreground">Request Body:</span>
          <pre className="mt-1 text-xs bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">{request}</pre>
        </div>
      )}
      {response && (
        <div>
          <span className="text-xs font-semibold text-muted-foreground">Response:</span>
          <pre className="mt-1 text-xs bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">{response}</pre>
        </div>
      )}
    </div>
  );
}

function WorkflowTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" style={{ color: BRAND.darkBlue }} />
            <span className="font-semibold">System Workflow Overview</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Complete data flow from member list ingestion through clinical visit execution to FHIR R4 output
          </p>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <EndToEndWorkflowDiagram />
        </CardContent>
      </Card>

      <CollapsibleSection title="Phase 1: Member Ingestion & Scheduling" icon={Upload} defaultOpen>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Target members are loaded into the system via one of three input methods. Each member record creates a patient profile and triggers plan pack assignment based on their insurance plan type (Medicare Advantage or ACA).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2">CSV Upload</h4>
                <p className="text-xs text-muted-foreground">Bulk member list with MBI, demographics, insurance plan ID, and PCP information. Mapped to patient schema on import.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2">FHIR R4 Inbound</h4>
                <p className="text-xs text-muted-foreground">POST /api/fhir/Patient or POST /api/fhir/Bundle with Patient + Encounter resources. Creates patient and optionally a pending visit.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2">Manual Entry</h4>
                <p className="text-xs text-muted-foreground">Admin creates patient record through Admin Console with full demographic, insurance, and clinical history fields.</p>
              </CardContent>
            </Card>
          </div>
          <div className="text-sm space-y-1">
            <p className="font-semibold">Plan Pack Assignment Logic:</p>
            <p className="text-xs text-muted-foreground">
              Once a patient is registered, the system assigns the appropriate assessment & measure pack based on their insurance plan. 
              Each plan pack defines which standardized assessments (PHQ-2, PHQ-9, PRAPARE, AWV) and HEDIS quality measures 
              (A1C, Breast Cancer Screening, Colorectal Screening, Fall Risk, etc.) are required for the visit.
              The NP sees these as required checklist items during the intake workflow.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Phase 2: Clinical Visit Execution" icon={Stethoscope}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The NP conducts the in-home visit following the structured intake workflow. The intake dashboard provides a 2-panel layout with objectives on the left and clinical decision support, tasks, and progress note on the right.
          </p>
          <div className="space-y-2">
            {[
              { step: "1", title: "Pre-Visit Summary", desc: "NP reviews HIE data, prior visit history, active medications, allergies, and longitudinal vitals/lab trends before arriving at the member's home." },
              { step: "2", title: "Identity Verification", desc: "4-point identity check (name match, DOB match, photo ID, Medicare Beneficiary Identifier) to confirm member identity per CMS requirements." },
              { step: "3", title: "Vitals & Physical Exam", desc: "Capture systolic/diastolic BP, heart rate, respiratory rate, SpO2, temperature, height, weight (auto-calculated BMI), pain scale, and general appearance notes." },
              { step: "4", title: "Standardized Assessments", desc: "Complete plan-required assessments: PHQ-2 (depression screen, auto-triggers PHQ-9 if score >= 3), PRAPARE (social determinants), Annual Wellness Visit, with deterministic scoring and interpretation bands." },
              { step: "5", title: "Medication Reconciliation", desc: "Review current medications from HIE, verify/modify/discontinue/hold. Quick-add from patient history. Automatic Beers Criteria screening (10 categories) and drug interaction checking (10 pairs)." },
              { step: "6", title: "HEDIS Quality Measures", desc: "Complete plan-required HEDIS measures (A1C screening, breast/colorectal cancer screening, fall risk, etc.) with structured unable-to-assess reasons and exclusion documentation." },
              { step: "7", title: "CDS & Auto-Coding", desc: "Real-time Clinical Decision Support evaluates 8 rules (PHQ-2 escalation, BP ranges, BMI, O2 sat, pain, heart rate). Auto-generates ICD-10, CPT, and HCPCS codes based on visit activities." },
              { step: "8", title: "Progress Note Generation", desc: "Auto-composed MEAT/TAMPER compliant progress note with per-diagnosis evidence mapping, HEDIS per-measure detail, encounter metadata (POS-12, NPI, insurance), and provider attestation block." },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 text-xs font-bold" style={{ backgroundColor: BRAND.teal + "20", color: BRAND.teal }}>{item.step}</div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Phase 3: Finalization, Review & Handoff" icon={ClipboardCheck}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            After the NP completes all clinical activities, the visit goes through a gating validation, signature, supervisor review, and care coordination dispatch workflow.
          </p>
          <div className="space-y-3">
            <div className="border rounded-md p-3">
              <h4 className="text-sm font-semibold mb-1">Gating Validation</h4>
              <p className="text-xs text-muted-foreground mb-2">The system enforces completion of all required steps before the NP can sign:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {["Identity verified", "Vitals recorded", "All assessments complete or UTA", "All HEDIS measures complete or UTA", "Medications reconciled", "At least 1 diagnosis coded"].map((g) => (
                  <div key={g} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: BRAND.teal }} />
                    {g}
                  </div>
                ))}
              </div>
            </div>
            <div className="border rounded-md p-3">
              <h4 className="text-sm font-semibold mb-1">Supervisor Review</h4>
              <p className="text-xs text-muted-foreground">
                Supervisors review the finalized visit, verify MEAT documentation completeness, and either approve (cosign) or request edits.
                Requested edits unlock the visit for the NP to modify specific sections. The review queue shows pending visits with urgency indicators.
              </p>
            </div>
            <div className="border rounded-md p-3">
              <h4 className="text-sm font-semibold mb-1">Care Coordination Dispatch</h4>
              <p className="text-xs text-muted-foreground">
                Approved visits generate care coordination tasks dispatched to the care team. Task types include referrals, lab orders, DME orders, 
                medication changes, and follow-up scheduling. Each task tracks status (pending, in-progress, completed) and assigned coordinator.
              </p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Phase 4: FHIR Export & Data Output" icon={Send}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Completed visit data is exported as a FHIR R4 Bundle document containing all clinical observations, conditions, and encounter details. 
            This bundle can be transmitted to EHRs, payers, or population health systems.
          </p>
          <div className="border rounded-md p-3">
            <h4 className="text-sm font-semibold mb-2">FHIR R4 Bundle Contents</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { res: "Patient", desc: "Demographics, MBI, insurance, address, contact" },
                { res: "Encounter", desc: "Visit dates, type, status, provider reference, POS code" },
                { res: "Observation (Vitals)", desc: "Individual LOINC-coded vitals (BP, HR, SpO2, Temp, BMI)" },
                { res: "Observation (Assessments)", desc: "PHQ-2/9, PRAPARE, AWV scores with interpretation" },
                { res: "Condition", desc: "ICD-10 coded diagnoses with onset, category, evidence" },
                { res: "MedicationStatement", desc: "Reconciled medications with status and Beers flags" },
                { res: "Procedure", desc: "CPT-coded procedures performed during visit" },
                { res: "DocumentReference", desc: "MEAT/TAMPER progress note as base64 attachment" },
              ].map((item) => (
                <div key={item.res} className="flex items-start gap-2 text-xs">
                  <Badge variant="secondary" className="font-mono shrink-0">{item.res}</Badge>
                  <span className="text-muted-foreground">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border rounded-md p-3">
            <h4 className="text-sm font-semibold mb-2">Output Destinations</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-semibold">EHR Integration</p>
                <p className="text-xs text-muted-foreground">FHIR Bundle POST to downstream EHR FHIR endpoint for clinical record continuity</p>
              </div>
              <div>
                <p className="text-xs font-semibold">Payer Submission</p>
                <p className="text-xs text-muted-foreground">HEDIS measure data, HCC risk adjustment codes, and RADV-ready documentation</p>
              </div>
              <div>
                <p className="text-xs font-semibold">Analytics Pipeline</p>
                <p className="text-xs text-muted-foreground">Population health dashboards, quality gap reports, and visit volume metrics</p>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

function ActivityTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: BRAND.orange }} />
            <span className="font-semibold">Role-Based Activity Diagram</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Swim-lane view of handoffs between Admin, NP, Supervisor, and Care Coordinator roles throughout the visit lifecycle
          </p>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <ActivityDiagram />
        </CardContent>
      </Card>

      <CollapsibleSection title="Handoff Details" icon={ArrowRight} defaultOpen>
        <div className="space-y-4">
          {[
            {
              from: "Admin / Ops",
              to: "Nurse Practitioner",
              trigger: "Visit scheduled and assigned",
              data: "Patient demographics, insurance plan, plan pack (assessments + measures), prior visit history, HIE data, medication history",
              validation: "Patient must have valid MBI, assigned plan pack, and scheduling window confirmed",
            },
            {
              from: "Nurse Practitioner",
              to: "Supervisor",
              trigger: "Visit signed and finalized (gating passed)",
              data: "Complete visit record: vitals, assessment scores, HEDIS measures, medication reconciliation, progress note with MEAT documentation, ICD-10/CPT codes, care plan tasks",
              validation: "All gating checks must pass: identity verified, vitals recorded, all assessments complete/UTA, all measures complete/UTA, medications reconciled, diagnosis coded",
            },
            {
              from: "Supervisor",
              to: "Care Coordinator",
              trigger: "Supervisor approves and cosigns visit",
              data: "Approved care plan tasks: referral orders, lab orders, DME orders, medication changes, follow-up scheduling, and any supervisor-added tasks",
              validation: "Supervisor must approve visit (cannot dispatch care tasks from rejected visits)",
            },
            {
              from: "Care Coordinator",
              to: "Admin / Ops",
              trigger: "All care tasks completed or escalated",
              data: "Task completion statuses, coordination notes, external provider confirmations, patient follow-up outcomes",
              validation: "Task completion requires documented outcome and coordinator sign-off",
            },
          ].map((h, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{h.from}</Badge>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">{h.to}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-semibold mb-0.5">Trigger</p>
                  <p className="text-xs text-muted-foreground">{h.trigger}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-0.5">Data Transferred</p>
                  <p className="text-xs text-muted-foreground">{h.data}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-0.5">Validation Rules</p>
                  <p className="text-xs text-muted-foreground">{h.validation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}

function InterfacesTab() {
  return (
    <div className="space-y-6">
      <CollapsibleSection title="Inbound Interfaces: Member Ingestion" icon={Download} defaultOpen>
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">FHIR R4 Patient Import</h4>
          <ApiEndpoint
            method="POST"
            path="/api/fhir/Patient"
            description="Create or update a patient record from a FHIR R4 Patient resource. If a patient with matching MBI exists, updates the record."
            request={`{
  "resourceType": "Patient",
  "identifier": [{ "system": "http://hl7.org/fhir/sid/us-mbi", "value": "1EG4-TE5-MK72" }],
  "name": [{ "family": "Smith", "given": ["John", "A"] }],
  "gender": "male",
  "birthDate": "1945-03-15",
  "address": [{ "line": ["123 Main St"], "city": "Springfield", "state": "IL", "postalCode": "62701" }],
  "telecom": [{ "system": "phone", "value": "555-123-4567" }]
}`}
            response={`{
  "resourceType": "OperationOutcome",
  "issue": [{ "severity": "information", "code": "informational", "diagnostics": "Patient created: <id>" }]
}`}
          />

          <h4 className="text-sm font-semibold mt-4">FHIR R4 Bundle Import</h4>
          <ApiEndpoint
            method="POST"
            path="/api/fhir/Bundle"
            description="Import a FHIR R4 Bundle containing Patient and optionally Encounter resources. Creates patient records and pending visits."
            request={`{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    { "resource": { "resourceType": "Patient", ... } },
    { "resource": { "resourceType": "Encounter", "status": "planned", "class": { "code": "HH" }, ... } }
  ]
}`}
            response={`{
  "resourceType": "OperationOutcome",
  "issue": [
    { "severity": "information", "diagnostics": "Patient created: <id>" },
    { "severity": "information", "diagnostics": "Visit created: <id>" }
  ]
}`}
          />

          <h4 className="text-sm font-semibold mt-4">CSV Member List Schema</h4>
          <InterfaceTable rows={[
            { field: "mbi", type: "string", required: true, description: "Medicare Beneficiary Identifier (11-char alphanumeric)" },
            { field: "first_name", type: "string", required: true, description: "Patient first name" },
            { field: "last_name", type: "string", required: true, description: "Patient last name" },
            { field: "date_of_birth", type: "date", required: true, description: "YYYY-MM-DD format" },
            { field: "gender", type: "enum", required: true, description: "male | female | other | unknown" },
            { field: "address_line", type: "string", required: false, description: "Street address for home visit" },
            { field: "city", type: "string", required: false, description: "City" },
            { field: "state", type: "string", required: false, description: "2-letter state code" },
            { field: "zip", type: "string", required: false, description: "5-digit ZIP code" },
            { field: "phone", type: "string", required: false, description: "Primary phone number" },
            { field: "plan_id", type: "string", required: true, description: "Insurance plan identifier for pack assignment" },
            { field: "pcp_name", type: "string", required: false, description: "Primary care provider name" },
            { field: "pcp_npi", type: "string", required: false, description: "PCP National Provider Identifier" },
            { field: "preferred_language", type: "string", required: false, description: "ISO 639-1 language code (default: en)" },
          ]} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Internal Interfaces: Visit Data Model" icon={Database}>
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Core Visit Record</h4>
          <InterfaceTable rows={[
            { field: "id", type: "uuid", required: true, description: "Primary key, auto-generated UUIDv4" },
            { field: "patientId", type: "uuid", required: true, description: "FK to patients table" },
            { field: "npUserId", type: "uuid", required: true, description: "Assigned Nurse Practitioner user ID" },
            { field: "planPackId", type: "uuid", required: true, description: "FK to plan_packs (assessment + measure bundle)" },
            { field: "status", type: "enum", required: true, description: "scheduled | in_progress | completed | supervisor_review | approved | needs_revision" },
            { field: "scheduledDate", type: "date", required: true, description: "Planned visit date" },
            { field: "visitDate", type: "date", required: false, description: "Actual visit date (set when started)" },
            { field: "identityVerified", type: "boolean", required: false, description: "4-point identity verification completed" },
            { field: "diagnoses", type: "jsonb", required: false, description: "Array of { icd10, description, type } objects" },
            { field: "supervisorId", type: "uuid", required: false, description: "Assigned supervisor for review" },
            { field: "reviewStatus", type: "enum", required: false, description: "pending | approved | needs_revision" },
            { field: "reviewNotes", type: "text", required: false, description: "Supervisor review comments" },
            { field: "signedAt", type: "timestamp", required: false, description: "NP signature timestamp" },
            { field: "signedBy", type: "uuid", required: false, description: "Signing NP user ID" },
          ]} />

          <h4 className="text-sm font-semibold mt-4">Vitals Record</h4>
          <InterfaceTable rows={[
            { field: "visitId", type: "uuid", required: true, description: "FK to visits table" },
            { field: "systolic", type: "integer", required: false, description: "Systolic blood pressure (mmHg)" },
            { field: "diastolic", type: "integer", required: false, description: "Diastolic blood pressure (mmHg)" },
            { field: "heartRate", type: "integer", required: false, description: "Heart rate (bpm)" },
            { field: "respiratoryRate", type: "integer", required: false, description: "Respiratory rate (breaths/min)" },
            { field: "oxygenSaturation", type: "decimal", required: false, description: "SpO2 percentage" },
            { field: "temperature", type: "decimal", required: false, description: "Temperature (Fahrenheit)" },
            { field: "height", type: "decimal", required: false, description: "Height (inches)" },
            { field: "weight", type: "decimal", required: false, description: "Weight (lbs)" },
            { field: "bmi", type: "decimal", required: false, description: "Auto-calculated Body Mass Index" },
            { field: "painScale", type: "integer", required: false, description: "Pain scale 0-10" },
            { field: "generalAppearance", type: "text", required: false, description: "Free-text clinical observation" },
          ]} />

          <h4 className="text-sm font-semibold mt-4">Assessment Result</h4>
          <InterfaceTable rows={[
            { field: "visitId", type: "uuid", required: true, description: "FK to visits table" },
            { field: "assessmentId", type: "uuid", required: true, description: "FK to assessment_definitions" },
            { field: "status", type: "enum", required: true, description: "not_started | in_progress | completed | unable_to_assess" },
            { field: "responses", type: "jsonb", required: false, description: "Array of { questionId, value, text } responses" },
            { field: "score", type: "integer", required: false, description: "Deterministic total score" },
            { field: "interpretation", type: "string", required: false, description: "Score interpretation band (e.g., 'Moderate depression')" },
            { field: "utaReason", type: "text", required: false, description: "Structured unable-to-assess reason" },
          ]} />

          <h4 className="text-sm font-semibold mt-4">Medication Reconciliation</h4>
          <InterfaceTable rows={[
            { field: "visitId", type: "uuid", required: true, description: "FK to visits table" },
            { field: "medicationName", type: "string", required: true, description: "Drug name (brand or generic)" },
            { field: "dosage", type: "string", required: false, description: "Dosage (e.g., '10mg')" },
            { field: "frequency", type: "string", required: false, description: "Frequency (e.g., 'BID', 'QD')" },
            { field: "route", type: "string", required: false, description: "Route of administration (PO, IM, IV, etc.)" },
            { field: "status", type: "enum", required: true, description: "verified | new | modified | discontinued | held" },
            { field: "source", type: "enum", required: true, description: "patient_reported | hie | provider_added" },
            { field: "isBeersRisk", type: "boolean", required: false, description: "Flagged by Beers Criteria screening" },
            { field: "interactionFlags", type: "text[]", required: false, description: "Drug interaction warning messages" },
            { field: "notes", type: "text", required: false, description: "Reconciliation notes" },
          ]} />

          <h4 className="text-sm font-semibold mt-4">HEDIS Measure Result</h4>
          <InterfaceTable rows={[
            { field: "visitId", type: "uuid", required: true, description: "FK to visits table" },
            { field: "measureId", type: "uuid", required: true, description: "FK to measure_definitions" },
            { field: "status", type: "enum", required: true, description: "not_started | completed | unable_to_assess" },
            { field: "value", type: "string", required: false, description: "Measure result value" },
            { field: "numericValue", type: "decimal", required: false, description: "Numeric value for trending" },
            { field: "notes", type: "text", required: false, description: "Clinical notes" },
            { field: "utaReason", type: "text", required: false, description: "Unable-to-assess exclusion reason" },
          ]} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Outbound Interfaces: FHIR R4 Export" icon={Upload}>
        <div className="space-y-4">
          <ApiEndpoint
            method="GET"
            path="/api/fhir/Patient/:patientId"
            description="Export a single patient as a FHIR R4 Patient resource with demographics, identifiers (MBI), and contact information."
            response={`{
  "resourceType": "Patient",
  "id": "<patientId>",
  "identifier": [{ "system": "http://hl7.org/fhir/sid/us-mbi", "value": "<MBI>" }],
  "name": [{ "use": "official", "family": "<lastName>", "given": ["<firstName>"] }],
  "gender": "<gender>",
  "birthDate": "<DOB>",
  "address": [...],
  "telecom": [...]
}`}
          />

          <ApiEndpoint
            method="GET"
            path="/api/fhir/Encounter/:visitId"
            description="Export a visit as a FHIR R4 Encounter resource with status, class, period, and participant references."
            response={`{
  "resourceType": "Encounter",
  "id": "<visitId>",
  "status": "finished",
  "class": { "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "HH", "display": "home health" },
  "type": [{ "coding": [{ "system": "http://www.ama-assn.org/go/cpt", "code": "99345" }] }],
  "subject": { "reference": "Patient/<patientId>" },
  "participant": [{ "individual": { "reference": "Practitioner/<npId>", "display": "<npName>" } }],
  "period": { "start": "<visitDate>", "end": "<visitDate>" },
  "diagnosis": [{ "condition": { "display": "<icd10> - <description>" } }]
}`}
          />

          <ApiEndpoint
            method="GET"
            path="/api/fhir/Observation/:visitId"
            description="Export vitals and assessment results as FHIR R4 Observation resources, each coded with appropriate LOINC codes."
            response={`[
  {
    "resourceType": "Observation",
    "status": "final",
    "code": { "coding": [{ "system": "http://loinc.org", "code": "85354-9", "display": "Blood pressure panel" }] },
    "valueQuantity": { "value": 130, "unit": "mmHg" },
    "component": [
      { "code": { "coding": [{ "code": "8480-6" }] }, "valueQuantity": { "value": 130, "unit": "mmHg" } },
      { "code": { "coding": [{ "code": "8462-4" }] }, "valueQuantity": { "value": 85, "unit": "mmHg" } }
    ]
  },
  {
    "resourceType": "Observation",
    "code": { "coding": [{ "system": "http://loinc.org", "code": "44249-1", "display": "PHQ-9 total score" }] },
    "valueQuantity": { "value": 7, "unit": "{score}" },
    "interpretation": [{ "text": "Mild depression" }]
  }
]`}
          />

          <ApiEndpoint
            method="GET"
            path="/api/fhir/Condition/:visitId"
            description="Export visit diagnoses as FHIR R4 Condition resources with ICD-10 coding."
            response={`[
  {
    "resourceType": "Condition",
    "clinicalStatus": { "coding": [{ "code": "active" }] },
    "code": { "coding": [{ "system": "http://hl7.org/fhir/sid/icd-10-cm", "code": "E11.9", "display": "Type 2 diabetes mellitus without complications" }] },
    "subject": { "reference": "Patient/<patientId>" },
    "encounter": { "reference": "Encounter/<visitId>" }
  }
]`}
          />

          <ApiEndpoint
            method="GET"
            path="/api/fhir/Bundle/:patientId"
            description="Export a complete FHIR R4 Document Bundle for a patient containing all resources: Patient, Encounters, Observations (vitals + assessments), and Conditions."
            response={`{
  "resourceType": "Bundle",
  "type": "document",
  "entry": [
    { "resource": { "resourceType": "Patient", ... } },
    { "resource": { "resourceType": "Encounter", ... } },
    { "resource": { "resourceType": "Observation", ... } },
    { "resource": { "resourceType": "Condition", ... } }
  ]
}`}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Internal API Endpoints" icon={Server}>
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Visit Management</h4>
          <div className="space-y-2">
            <ApiEndpoint method="GET" path="/api/visits" description="List all visits (filtered by role: NP sees own, others see all)" />
            <ApiEndpoint method="GET" path="/api/visits/:id" description="Get visit details including patient info, plan pack, assigned NP" />
            <ApiEndpoint method="GET" path="/api/visits/:id/overview" description="Aggregated visit overview with vitals, assessments, meds, measures, tasks, CDS, and auto-generated progress note" />
            <ApiEndpoint method="PATCH" path="/api/visits/:id/status" description="Update visit status (start, finalize, etc.)" request={`{ "status": "in_progress" | "completed" | "supervisor_review" }`} />
            <ApiEndpoint method="POST" path="/api/visits/:id/sign" description="Sign and lock the visit (requires all gating checks to pass)" />
          </div>

          <h4 className="text-sm font-semibold mt-4">Clinical Data</h4>
          <div className="space-y-2">
            <ApiEndpoint method="GET" path="/api/visits/:id/vitals" description="Get vitals for a visit" />
            <ApiEndpoint method="POST" path="/api/visits/:id/vitals" description="Save vitals (creates or updates)" />
            <ApiEndpoint method="GET" path="/api/visits/:id/assessments" description="List assessment results for a visit" />
            <ApiEndpoint method="POST" path="/api/visits/:id/assessments/:aid" description="Save assessment responses and score" />
            <ApiEndpoint method="GET" path="/api/visits/:id/measures" description="List HEDIS measure results for a visit" />
            <ApiEndpoint method="POST" path="/api/visits/:id/measures/:mid" description="Save measure result" />
            <ApiEndpoint method="GET" path="/api/visits/:id/medications" description="List reconciled medications for a visit" />
            <ApiEndpoint method="POST" path="/api/visits/:id/medications" description="Add a medication reconciliation entry" />
            <ApiEndpoint method="PATCH" path="/api/visits/:id/medications/:medId" description="Update medication reconciliation entry" />
            <ApiEndpoint method="DELETE" path="/api/visits/:id/medications/:medId" description="Remove medication reconciliation entry" />
          </div>

          <h4 className="text-sm font-semibold mt-4">CDS & Coding</h4>
          <div className="space-y-2">
            <ApiEndpoint method="GET" path="/api/visits/:id/recommendations" description="Get CDS recommendations for a visit (evaluated from clinical rules)" />
            <ApiEndpoint method="PATCH" path="/api/visits/:id/recommendations/:recId" description="Dismiss or acknowledge a CDS recommendation" />
            <ApiEndpoint method="GET" path="/api/visits/:id/codes" description="Get auto-generated ICD-10/CPT/HCPCS codes" />
            <ApiEndpoint method="PATCH" path="/api/visits/:id/codes/:codeId" description="Verify or remove an auto-generated code" />
          </div>

          <h4 className="text-sm font-semibold mt-4">Care Coordination & Review</h4>
          <div className="space-y-2">
            <ApiEndpoint method="GET" path="/api/visits/:id/tasks" description="List care plan tasks for a visit" />
            <ApiEndpoint method="POST" path="/api/visits/:id/tasks" description="Create a care plan task" />
            <ApiEndpoint method="PATCH" path="/api/visits/:id/tasks/:taskId" description="Update task status" />
            <ApiEndpoint method="GET" path="/api/reviews" description="List visits pending supervisor review" />
            <ApiEndpoint method="POST" path="/api/visits/:id/review" description="Submit supervisor review (approve or request revision)" />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Data Validation & Business Rules" icon={Shield}>
        <div className="space-y-4">
          <div className="border rounded-md p-3">
            <h4 className="text-sm font-semibold mb-2">Clinical Decision Support Rules</h4>
            <div className="space-y-1">
              {[
                { rule: "PHQ-2 Escalation", condition: "PHQ-2 score >= 3", action: "Recommend PHQ-9 full assessment" },
                { rule: "Hypertension Alert", condition: "Systolic >= 140 or Diastolic >= 90", action: "Flag for provider review, recommend BP recheck" },
                { rule: "Hypotension Alert", condition: "Systolic < 90 or Diastolic < 60", action: "Urgent flag, recommend vitals recheck" },
                { rule: "Obesity Screen", condition: "BMI >= 30", action: "Recommend nutrition counseling referral" },
                { rule: "Hypoxemia Alert", condition: "SpO2 < 92%", action: "Urgent flag, recommend pulse oximetry recheck" },
                { rule: "Pain Management", condition: "Pain scale >= 7", action: "Recommend pain management plan review" },
                { rule: "SDOH Referral", condition: "PRAPARE identifies social needs", action: "Recommend community resource referral" },
                { rule: "Tachycardia Alert", condition: "Heart rate > 100 bpm", action: "Flag for cardiac evaluation" },
              ].map((r) => (
                <div key={r.rule} className="grid grid-cols-3 gap-2 text-xs py-1 border-b last:border-0">
                  <span className="font-semibold">{r.rule}</span>
                  <span className="text-muted-foreground">{r.condition}</span>
                  <span className="text-muted-foreground">{r.action}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-md p-3">
            <h4 className="text-sm font-semibold mb-2">Assessment Scoring Algorithms</h4>
            <div className="space-y-2">
              {[
                { name: "PHQ-2", scoring: "Sum of 2 items (0-3 each), range 0-6", bands: "0-2: Negative screen | 3-6: Positive (triggers PHQ-9)" },
                { name: "PHQ-9", scoring: "Sum of 9 items (0-3 each), range 0-27", bands: "0-4: Minimal | 5-9: Mild | 10-14: Moderate | 15-19: Mod-Severe | 20-27: Severe" },
                { name: "PRAPARE", scoring: "Count of identified social risk factors across 15 domains", bands: "0: No risks | 1-3: Low | 4-7: Moderate | 8+: High social risk" },
                { name: "AWV", scoring: "Checklist completion percentage across preventive care domains", bands: "All items reviewed and documented" },
              ].map((a) => (
                <div key={a.name} className="text-xs space-y-0.5">
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-muted-foreground">Scoring: {a.scoring}</p>
                  <p className="text-muted-foreground">Bands: {a.bands}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-md p-3">
            <h4 className="text-sm font-semibold mb-2">Medication Safety Checks</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold mb-1">Beers Criteria Categories (10)</p>
                <p className="text-xs text-muted-foreground">
                  Anticholinergics, Benzodiazepines, NSAIDs (chronic), Opioids (chronic), 
                  First-gen antihistamines, Barbiturates, Meprobamate, Muscle relaxants, 
                  Antipsychotics (dementia), Sulfonylureas (long-acting)
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1">Drug Interaction Pairs (10)</p>
                <p className="text-xs text-muted-foreground">
                  Warfarin + NSAIDs, ACE-I + K-sparing diuretics, SSRIs + MAOIs, 
                  Metformin + contrast dye, Digoxin + amiodarone, Statins + fibrates,
                  Lithium + NSAIDs, Theophylline + fluoroquinolones, 
                  Clopidogrel + PPIs, Methotrexate + TMP-SMX
                </p>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

export default function TechDocs() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold" data-testid="text-techdocs-title">Technical Documentation</h1>
          <Badge variant="outline" className="text-xs">Admin Only</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          System architecture, workflow diagrams, role handoff activity diagrams, and interface technical specifications
        </p>
      </div>

      <Tabs defaultValue="workflow" data-testid="tabs-techdocs">
        <TabsList className="flex-wrap">
          <TabsTrigger value="workflow" data-testid="tab-workflow">
            <GitBranch className="w-3 h-3 mr-1" /> Workflow
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">
            <Activity className="w-3 h-3 mr-1" /> Activity Diagram
          </TabsTrigger>
          <TabsTrigger value="interfaces" data-testid="tab-interfaces">
            <Server className="w-3 h-3 mr-1" /> Interface Specs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="mt-4">
          <WorkflowTab />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab />
        </TabsContent>
        <TabsContent value="interfaces" className="mt-4">
          <InterfacesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}