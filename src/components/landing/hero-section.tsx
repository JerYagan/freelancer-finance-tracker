import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandIcon } from "@/components/brand/brand-icon";
import { ArrowUpRight, ArrowDownRight, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
      {/* Background warm radial tint */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[500px] w-[600px] rounded-full bg-[#A7C8A3]/20 blur-3xl dark:bg-[#5E8C61]/10" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Copy & CTAs */}
          <div className="space-y-6 text-center lg:col-span-6 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#5E8C61]/30 bg-[#A7C8A3]/25 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#17211B] dark:border-[#5E8C61]/40 dark:bg-[#5E8C61]/20 dark:text-[#A7C8A3]">
              <BrandIcon name="sprout" variant="minimal" size="sm" />
              <span>Track it. Earn it. Grow it.</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-[-0.03em] text-[#17211B] sm:text-5xl lg:text-6xl dark:text-[#F3F1E8] leading-[1.08]">
              Freelance finances,{" "}
              <span className="block text-[#5E8C61] dark:text-[#A7C8A3]">
                simplified.
              </span>
            </h1>

            <p className="mx-auto max-w-xl text-lg font-medium text-[#5C665F] sm:text-xl lg:mx-0 dark:text-[#8A9E90]">
              Track income, manage expenses, and see your growth — all in one place,
              purpose-built for solo freelancers.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row lg:justify-start">
              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto rounded-full bg-[#5E8C61] px-8 py-6 text-base font-bold text-[#FFFFEF] shadow-md transition-all hover:bg-[#4E7651] hover:shadow-lg hover:scale-[1.02]"
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
                className="w-full sm:w-auto rounded-full border-2 border-[#DDD7C8] bg-[#FFFFEF] px-7 py-6 text-base font-semibold text-[#17211B] hover:bg-[#E6EDE4] dark:border-[#2B3B32] dark:bg-[#17211B] dark:text-[#F3F1E8] dark:hover:bg-[#212E27]"
              >
                <a href="#preview">Explore Live Tour</a>
              </Button>
            </div>

            {/* Social proof & reassurance */}
            <div className="flex items-center justify-center gap-3 pt-4 text-xs font-semibold text-[#5C665F] lg:justify-start dark:text-[#8A9E90]">
              <div className="flex -space-x-1">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#A7C8A3] text-[10px] font-bold text-[#17211B]">
                  AR
                </span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#5E8C61] text-[10px] font-bold text-[#FFFFEF]">
                  SM
                </span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#17211B] text-[10px] font-bold text-[#FFFFEF] dark:bg-[#2B3B32]">
                  AC
                </span>
              </div>
              <span>Trusted by designers, developers, & solo consultants</span>
            </div>
          </div>

          {/* Right Column: Hero Artwork + Floating Cards */}
          <div className="relative lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-lg lg:max-w-none">
              {/* Main character illustration */}
              <div className="overflow-hidden rounded-3xl border-2 border-[#DDD7C8] bg-[#FFFFEF] shadow-xl dark:border-[#2B3B32] dark:bg-[#17211B]">
                <Image
                  src="/brand/hero-illustration.jpg"
                  alt="Freelancer organizing finances with Tally at a cozy plant-filled desk"
                  width={1024}
                  height={683}
                  priority
                  className="h-auto w-full object-cover transition-transform duration-700 hover:scale-[1.01]"
                />
              </div>

              {/* Floating Card 1: Income Pill (Top Left) */}
              <div className="absolute -top-4 -left-4 sm:-left-6 rounded-2xl border border-[#DDD7C8] bg-[#FFFFEF]/95 p-3 sm:p-4 shadow-lg backdrop-blur-sm dark:border-[#2B3B32] dark:bg-[#17211B]/95 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E7D32]/15 text-[#2E7D32] dark:bg-[#4ADE80]/20 dark:text-[#4ADE80]">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C665F] dark:text-[#8A9E90]">
                      Income Received
                    </span>
                    <p className="font-sans text-base font-extrabold text-[#17211B] dark:text-[#F3F1E8] tabular-nums">
                      +$1,200.00
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Card 2: Expense Pill (Bottom Left) */}
              <div className="absolute -bottom-6 -left-2 sm:-left-4 rounded-2xl border border-[#DDD7C8] bg-[#FFFFEF]/95 p-3 sm:p-4 shadow-lg backdrop-blur-sm dark:border-[#2B3B32] dark:bg-[#17211B]/95 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D95D50]/15 text-[#D95D50] dark:bg-[#F87171]/20 dark:text-[#F87171]">
                    <ArrowDownRight className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C665F] dark:text-[#8A9E90]">
                      Software & Tools
                    </span>
                    <p className="font-sans text-base font-extrabold text-[#17211B] dark:text-[#F3F1E8] tabular-nums">
                      -$29.99
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Card 3: Brand Receipt Checklist (Bottom Right) */}
              <div className="hidden sm:block absolute -bottom-6 -right-4 rounded-2xl border border-[#DDD7C8] bg-[#FFFFEF] p-4 shadow-xl dark:border-[#2B3B32] dark:bg-[#17211B] animate-in fade-in slide-in-from-right-4 duration-700">
                <div className="flex items-center gap-2 border-b border-[#DDD7C8] pb-2 text-xs font-extrabold tracking-tight text-[#17211B] dark:border-[#2B3B32] dark:text-[#F3F1E8]">
                  <BrandIcon name="receipt" variant="minimal" size="sm" />
                  <span>Tally Receipt</span>
                </div>
                <div className="space-y-1.5 pt-2 text-xs font-semibold text-[#17211B] dark:text-[#F3F1E8]">
                  <div className="flex items-center gap-2 text-[#5E8C61] dark:text-[#A7C8A3]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Track it.</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#5E8C61] dark:text-[#A7C8A3]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Earn it.</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#5E8C61] dark:text-[#A7C8A3]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Grow it.</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#A7C8A3]/25 px-2.5 py-1 text-[10px] font-bold text-[#17211B] dark:bg-[#5E8C61]/30 dark:text-[#A7C8A3]">
                  <Sparkles className="h-3 w-3 shrink-0 text-[#5E8C61] dark:text-[#A7C8A3]" />
                  <span>Good Numbers, Brighter Days.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
