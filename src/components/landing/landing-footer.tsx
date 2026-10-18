import Link from "next/link";
import { TallyLogo } from "@/components/brand/tally-logo";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#DDD7C8] bg-[#F3F1E8] dark:border-[#2B3B32] dark:bg-[#0E1411] transition-colors">
      {/* Call to action card banner */}
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border-2 border-[#17211B] bg-[#17211B] p-8 sm:p-12 text-[#FFFFEF] shadow-2xl dark:border-[#2B3B32] dark:bg-[#17211B]">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#5E8C61]/30 border border-[#5E8C61]/50 px-3.5 py-1 text-xs font-bold text-[#A7C8A3]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Get Started in 30 Seconds</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Take control of your freelance money today.
            </h2>

            <p className="text-base sm:text-lg text-[#DDD7C8] font-normal max-w-xl">
              Join freelancers who track earnings, manage expenses, and set aside taxes effortlessly. Free forever for solo freelancers.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto rounded-full bg-[#5E8C61] hover:bg-[#4E7651] text-[#FFFFEF] font-bold px-8 py-6 text-base shadow-md"
              >
                <Link href="/sign-up">
                  Start Tracking Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full sm:w-auto rounded-full border-2 border-[#DDD7C8]/40 bg-transparent text-[#FFFFEF] hover:bg-[#FFFFEF]/10 px-7 py-6 text-base font-semibold"
              >
                <Link href="/sign-in">Sign In to Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation & Brand Stamp */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-[#DDD7C8]/70 pb-8 dark:border-[#2B3B32]/70">
          <div className="flex flex-col items-center md:items-start gap-2">
            <TallyLogo size="md" />
            <p className="text-xs text-[#5C665F] dark:text-[#8A9E90] text-center md:text-left">
              The peaceful cash flow tracker for solo freelancers and independent creators.
            </p>
          </div>

          {/* Brand sticker badge from design board */}
          <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#DDD7C8] bg-[#FFFFEF] px-4 py-2 text-xs font-extrabold text-[#17211B] shadow-sm dark:border-[#2B3B32] dark:bg-[#17211B] dark:text-[#F3F1E8]">
            <Sparkles className="h-4 w-4 text-[#5E8C61] dark:text-[#A7C8A3]" />
            <span>Good Numbers, Brighter Days.</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-[#5C665F] dark:text-[#8A9E90]">
          <p>© {new Date().getFullYear()} Tally. Track it. Earn it. Grow it.</p>
          <div className="flex items-center gap-6">
            <Link href="/sign-in" className="hover:text-[#5E8C61] dark:hover:text-[#A7C8A3]">
              Sign In
            </Link>
            <Link href="/sign-up" className="hover:text-[#5E8C61] dark:hover:text-[#A7C8A3]">
              Create Account
            </Link>
            <a href="#features" className="hover:text-[#5E8C61] dark:hover:text-[#A7C8A3]">
              Features
            </a>
            <a href="#calculator" className="hover:text-[#5E8C61] dark:hover:text-[#A7C8A3]">
              Tax Calculator
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
