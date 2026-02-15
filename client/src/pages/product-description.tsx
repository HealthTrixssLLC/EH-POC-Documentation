import { Link } from "wouter";
import { ChevronLeft, Stethoscope, ClipboardList, Activity, ShieldCheck, Mic, Smartphone, BarChart3, HeartPulse, FileText, Users, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: ClipboardList,
    title: "Complete Visit Lifecycle",
    description: "Manage the full in-home visit workflow from pre-visit preparation and patient identity verification through clinical intake, assessments, and finalization with gating validation.",
    badges: ["Pre-Visit Summary", "Intake Dashboard", "Gating Validation"],
  },
  {
    icon: Activity,
    title: "Clinical Assessments & Scoring",
    description: "Built-in standardized clinical tools with deterministic scoring including PHQ-2/PHQ-9 for depression screening, PRAPARE for social determinants, and Annual Wellness Visit templates.",
    badges: ["PHQ-2", "PHQ-9", "PRAPARE", "AWV"],
  },
  {
    icon: BarChart3,
    title: "HEDIS Quality Measures",
    description: "Track and document Healthcare Effectiveness Data and Information Set (HEDIS) measures with age-range guidance, screening forms for BCS and COL, and real-time completeness monitoring.",
    badges: ["BCS", "COL", "Quality Tracking"],
  },
  {
    icon: HeartPulse,
    title: "Medication Reconciliation",
    description: "Comprehensive medication management with client-side drug interaction checking, Beers Criteria screening for older adults, and complete medication history documentation.",
    badges: ["Drug Interactions", "Beers Criteria"],
  },
  {
    icon: Mic,
    title: "Voice-to-Clinical Data",
    description: "Capture clinical notes hands-free with voice recording, automatic transcription via OpenAI Whisper or Azure Speech, and AI-powered structured field extraction for progress notes.",
    badges: ["Transcription", "AI Extraction", "HIPAA Consent"],
  },
  {
    icon: FileText,
    title: "FHIR R4 Interoperability",
    description: "Full bidirectional FHIR R4 interface with 12 endpoints covering Patient, Encounter, Observation, Condition, and comprehensive Bundles with 11 distinct resource types across 17 data categories.",
    badges: ["FHIR R4", "HIE Integration", "Export"],
  },
  {
    icon: Users,
    title: "Supervisor Review & Care Coordination",
    description: "Structured supervisor sign-off with adjudication scorecards, return reasons, and encounter locking. Integrated care coordination workflows for follow-up management and referrals.",
    badges: ["Sign-off", "Adjudication", "Referrals"],
  },
  {
    icon: ShieldCheck,
    title: "HIPAA Security & Compliance",
    description: "Enterprise-grade security with configurable multi-factor authentication, session timeouts, biometric authentication for iOS, role-based access control, and comprehensive audit logging.",
    badges: ["MFA", "RBAC", "Audit Trail"],
  },
  {
    icon: Smartphone,
    title: "Mobile-First & Offline-Ready",
    description: "Responsive PWA with iOS optimization via Capacitor for App Store distribution. Offline-first architecture with IndexedDB caching and automatic sync when connectivity returns.",
    badges: ["PWA", "iOS", "Offline Sync"],
  },
  {
    icon: Wifi,
    title: "HIE Pre-Visit Intelligence",
    description: "Health Information Exchange integration with FHIR R4 ingestion for medications, conditions, observations, and procedures. Includes condition suspecting, NP guidance, and care gap prioritization.",
    badges: ["HIE", "Care Gaps", "Pre-Visit"],
  },
];

const planTypes = [
  { name: "Medicare Advantage", description: "Annual wellness visits, chronic condition management, and HEDIS measure tracking for MA plan members." },
  { name: "ACA Plans", description: "Preventive care visits, health risk assessments, and quality measure documentation for ACA enrollees." },
];

export default function ProductDescription() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-[#2E456B] dark:bg-[#1a2a42]">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-4 h-14">
          <Link href="/login">
            <Button size="icon" variant="ghost" className="text-white shrink-0" data-testid="button-back-login">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#FEA002]">
              <Stethoscope className="w-4 h-4 text-[#2E456B]" />
            </div>
            <span className="text-white font-semibold text-sm">Easy Health</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-product-title">Easy Health Platform</h1>
          <p className="text-sm text-muted-foreground mt-1">In-Home Clinical Visit Management</p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-5">
            <p className="text-sm leading-relaxed" data-testid="text-product-overview">
              Easy Health is a comprehensive clinical platform designed for in-home Nurse Practitioner visits serving Medicare Advantage and ACA plan members. From pre-visit preparation through clinical intake, HEDIS tracking, and FHIR-compliant data exchange, Easy Health streamlines every step of the in-home visit lifecycle while maintaining full regulatory compliance.
            </p>
          </CardContent>
        </Card>

        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3" data-testid="text-supported-plans">Supported Plan Types</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {planTypes.map((plan) => (
              <Card key={plan.name}>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3" data-testid="text-platform-features">Platform Features</h2>
          <div className="space-y-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md shrink-0 mt-0.5 bg-primary/10">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold mb-1" data-testid={`text-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        {feature.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">{feature.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {feature.badges.map((badge) => (
                          <Badge key={badge} variant="secondary" className="text-[10px]">{badge}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/login">
            <Button data-testid="button-get-started">
              Get Started
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-muted-foreground leading-relaxed text-center">
            Easy Health is designed for clinical professionals delivering in-home healthcare services. For more information, contact us at info@easyhealth.com.
          </p>
        </div>
      </main>
    </div>
  );
}
