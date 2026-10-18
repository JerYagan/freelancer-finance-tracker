import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/hero-section";
import { InteractivePreview } from "@/components/landing/interactive-preview";
import { FeaturePillars } from "@/components/landing/feature-pillars";
import { TaxCalculator } from "@/components/landing/tax-calculator";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F3F1E8] text-[#17211B] dark:bg-[#0E1411] dark:text-[#F3F1E8] transition-colors selection:bg-[#A7C8A3] selection:text-[#17211B]">
      <LandingNav />
      <main>
        <HeroSection />
        <InteractivePreview />
        <FeaturePillars />
        <TaxCalculator />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  );
}
