import { Link } from "wouter";
import { ChevronLeft, Stethoscope, Shield, Lock, Eye, FileText, Users, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const sections = [
  {
    icon: Shield,
    title: "Information We Collect",
    content: `Easy Health collects personal and clinical information necessary to provide in-home clinical visit services. This includes patient demographics, health records, assessment data, diagnoses, medication histories, vital signs, and visit documentation. We also collect practitioner credentials, login information, and usage analytics to maintain platform security and quality.`,
  },
  {
    icon: Lock,
    title: "HIPAA Compliance",
    content: `Easy Health is fully compliant with the Health Insurance Portability and Accountability Act (HIPAA). All Protected Health Information (PHI) is encrypted in transit using TLS 1.2+ and at rest using AES-256 encryption. We maintain strict access controls, audit logging, and breach notification procedures as required by federal and state regulations.`,
  },
  {
    icon: Eye,
    title: "How We Use Your Information",
    content: `Your information is used exclusively for clinical care delivery, care coordination, quality reporting, and regulatory compliance. This includes facilitating in-home visits, generating FHIR-compliant health records, tracking HEDIS quality measures, enabling supervisor reviews, and supporting care coordination workflows. We do not sell or share your data with third parties for marketing purposes.`,
  },
  {
    icon: Server,
    title: "Data Storage & Security",
    content: `Clinical data is stored in secure, HIPAA-compliant infrastructure with role-based access controls. We implement multi-factor authentication (MFA), session timeouts, biometric authentication for mobile devices, and comprehensive audit logging. All data transmissions are encrypted, and we maintain regular security assessments and penetration testing.`,
  },
  {
    icon: Users,
    title: "Data Sharing & Interoperability",
    content: `Easy Health supports FHIR R4 data exchange standards for authorized health information sharing with participating health plans, providers, and Health Information Exchanges (HIEs). Data is shared only with authorized parties for treatment, payment, or healthcare operations as permitted under HIPAA. Patients may request access to their records at any time.`,
  },
  {
    icon: FileText,
    title: "Your Rights",
    content: `You have the right to access, correct, or request deletion of your personal information. You may request a copy of your health records, restrict certain uses of your data, and receive an accounting of disclosures. To exercise these rights, contact our Privacy Officer at privacy@easyhealth.com. We will respond to all verified requests within 30 days.`,
  },
];

export default function PrivacyPolicy() {
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
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-privacy-title">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-1">Last updated: February 15, 2026</p>
        </div>

        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Easy Health ("we," "our," or "us") is committed to protecting the privacy and security of your personal and health information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our in-home clinical visit platform.
        </p>

        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-md shrink-0 mt-0.5 bg-primary/10">
                    <section.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold mb-1.5" data-testid={`text-privacy-section-${section.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      {section.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-muted-foreground leading-relaxed">
            For questions about this Privacy Policy or our data practices, contact our Privacy Officer at privacy@easyhealth.com or write to Easy Health Privacy Office, 123 Health Drive, Suite 400, Austin, TX 78701. This policy is subject to change; we will notify users of material updates via the platform.
          </p>
        </div>
      </main>
    </div>
  );
}
