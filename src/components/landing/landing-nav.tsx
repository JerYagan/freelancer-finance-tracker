"use client";

import Link from "next/link";
import { TallyLogo } from "@/components/brand/tally-logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#DDD7C8] bg-[#F3F1E8]/90 backdrop-blur-md dark:border-[#2B3B32] dark:bg-[#0E1411]/90 transition-colors">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <TallyLogo size="md" />

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#17211B]/80 dark:text-[#F3F1E8]/80">
            <a
              href="#features"
              className="transition-colors hover:text-[#5E8C61] dark:hover:text-[#A7C8A3]"
            >
              Features
            </a>
            <a
              href="#preview"
              className="transition-colors hover:text-[#5E8C61] dark:hover:text-[#A7C8A3]"
            >
              Product Tour
            </a>
            <a
              href="#calculator"
              className="transition-colors hover:text-[#5E8C61] dark:hover:text-[#A7C8A3]"
            >
              Tax Calculator
            </a>
            <a
              href="#faq"
              className="transition-colors hover:text-[#5E8C61] dark:hover:text-[#A7C8A3]"
            >
              FAQ
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            asChild
            className="text-[#17211B] hover:bg-[#E6EDE4] dark:text-[#F3F1E8] dark:hover:bg-[#212E27] font-semibold"
          >
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button
            asChild
            className="bg-[#5E8C61] hover:bg-[#4E7651] text-[#FFFFEF] shadow-sm font-bold rounded-full px-5 transition-transform hover:scale-[1.02]"
          >
            <Link href="/sign-up">Start Tracking Free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
