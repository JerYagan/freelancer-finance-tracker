import type { Metadata } from "next";
import Link from "next/link";
import { TallyLogo } from "@/components/brand/tally-logo";
import { Sparkles, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Authentication | Tally — Freelance Finances, Simplified",
  description: "Secure sign in and account management for solo freelancers.",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#F3F1E8] text-[#17211B] dark:bg-[#0E1411] dark:text-[#F3F1E8] transition-colors flex flex-col justify-between">
      {/* Top Header */}
      <header className="px-6 py-6 sm:px-8 border-b border-[#DDD7C8]/70 dark:border-[#2B3B32]/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <TallyLogo size="md" />
          <Link
            href="/"
            className="text-xs font-bold text-[#5E8C61] hover:text-[#4E7651] dark:text-[#A7C8A3] transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Sidebar (Visible on Desktop) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col space-y-6 pr-4">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#5E8C61]/30 bg-[#A7C8A3]/25 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#17211B] dark:text-[#A7C8A3]">
                <Sparkles className="h-3.5 w-3.5 text-[#5E8C61] dark:text-[#A7C8A3]" />
                <span>Freelance Peace of Mind</span>
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8] leading-tight">
                Track your money without spreadsheets.
              </h2>
              <p className="text-sm text-[#5C665F] dark:text-[#8A9E90] leading-relaxed">
                Log income, attach camera receipts, and automatically reserve taxes for a calmer, brighter freelance business.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border-2 border-[#DDD7C8] bg-[#FFFFEF] p-5 shadow-xs dark:border-[#2B3B32] dark:bg-[#17211B]">
              <div className="flex items-center gap-2.5 text-xs font-bold text-[#17211B] dark:text-[#F3F1E8]">
                <CheckCircle2 className="h-4 w-4 text-[#5E8C61] dark:text-[#A7C8A3] shrink-0" />
                <span>15% automatic quarterly tax calculation</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-[#17211B] dark:text-[#F3F1E8]">
                <CheckCircle2 className="h-4 w-4 text-[#5E8C61] dark:text-[#A7C8A3] shrink-0" />
                <span>Zero complex double-entry accounting</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-[#17211B] dark:text-[#F3F1E8]">
                <CheckCircle2 className="h-4 w-4 text-[#5E8C61] dark:text-[#A7C8A3] shrink-0" />
                <span>Offline PWA support & photo receipts</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#5C665F] dark:text-[#8A9E90]">
              <Sparkles className="h-4 w-4 text-[#5E8C61] dark:text-[#A7C8A3]" />
              <span>Good Numbers, Brighter Days.</span>
            </div>
          </div>

          {/* Right Auth Card */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-4 text-center text-xs text-[#5C665F] dark:text-[#8A9E90] border-t border-[#DDD7C8]/70 dark:border-[#2B3B32]/70">
        © {new Date().getFullYear()} Tally. Track it. Earn it. Grow it.
      </footer>
    </div>
  );
}
