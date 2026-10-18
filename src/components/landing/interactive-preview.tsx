"use client";

import { useState } from "react";
import { TallyLogo } from "@/components/brand/tally-logo";
import { BrandIcon } from "@/components/brand/brand-icon";
import {
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

export function InteractivePreview() {
  const [activeTab, setActiveTab] = useState<"overview" | "invoices" | "tax">(
    "overview",
  );

  return (
    <section id="preview" className="py-20 sm:py-28 bg-[#FFFFEF] dark:bg-[#17211B] border-y border-[#DDD7C8] dark:border-[#2B3B32]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#5E8C61]/30 bg-[#A7C8A3]/25 px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#17211B] dark:text-[#A7C8A3]">
            <Sparkles className="h-3.5 w-3.5 text-[#5E8C61] dark:text-[#A7C8A3]" />
            <span>Interactive Experience</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8]">
            Your freelance money, in motion.
          </h2>

          <p className="text-base sm:text-lg text-[#5C665F] dark:text-[#8A9E90]">
            Experience how Tally turns messy bank statements into crystalline cash flow and automated tax reserves.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full bg-[#E8EDE6] p-1.5 dark:bg-[#212E27] border border-[#DDD7C8] dark:border-[#2B3B32]">
            <button
              onClick={() => setActiveTab("overview")}
              className={`rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "overview"
                  ? "bg-[#5E8C61] text-[#FFFFEF] shadow-xs"
                  : "text-[#5C665F] hover:text-[#17211B] dark:text-[#8A9E90] dark:hover:text-[#F3F1E8]"
              }`}
            >
              Live Dashboard
            </button>
            <button
              onClick={() => setActiveTab("invoices")}
              className={`rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "invoices"
                  ? "bg-[#5E8C61] text-[#FFFFEF] shadow-xs"
                  : "text-[#5C665F] hover:text-[#17211B] dark:text-[#8A9E90] dark:hover:text-[#F3F1E8]"
              }`}
            >
              Invoices & Retainers
            </button>
            <button
              onClick={() => setActiveTab("tax")}
              className={`rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "tax"
                  ? "bg-[#5E8C61] text-[#FFFFEF] shadow-xs"
                  : "text-[#5C665F] hover:text-[#17211B] dark:text-[#8A9E90] dark:hover:text-[#F3F1E8]"
              }`}
            >
              15% Tax Set-Aside
            </button>
          </div>
        </div>

        {/* Mockup Frame */}
        <div className="mt-12 flex justify-center">
          <div className="w-full max-w-md sm:max-w-lg overflow-hidden rounded-[2.5rem] border-4 border-[#17211B] bg-[#F3F1E8] shadow-2xl dark:border-[#2B3B32] dark:bg-[#0E1411]">
            {/* Top Phone Speaker notch */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-16 rounded-full bg-[#17211B]/20 dark:bg-[#F3F1E8]/20" />
            </div>

            {/* App Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD7C8]/70 dark:border-[#2B3B32]/70">
              <TallyLogo size="sm" />
              <button
                aria-label="Notifications"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8EDE6] text-[#17211B] dark:bg-[#212E27] dark:text-[#F3F1E8]"
              >
                <Bell className="h-4 w-4" />
              </button>
            </div>

            {/* Main Interactive Screen Content */}
            <div className="p-6 space-y-5">
              {/* Total Balance Card */}
              <div className="rounded-2xl border border-[#DDD7C8] bg-[#FFFFEF] p-5 shadow-xs dark:border-[#2B3B32] dark:bg-[#17211B]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5C665F] dark:text-[#8A9E90]">
                    Total Balance
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#A7C8A3]/30 px-2 py-0.5 text-[11px] font-extrabold text-[#2E7D32] dark:text-[#4ADE80]">
                    <ArrowUpRight className="h-3 w-3" />
                    +12% vs last month
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8] tabular-nums">
                    $4,320.50
                  </span>
                  {/* Ascending Tally Bar graphic */}
                  <div className="flex items-end gap-1.5 h-7">
                    <span className="w-1.5 h-3 rounded-full bg-[#A7C8A3]" />
                    <span className="w-1.5 h-5 rounded-full bg-[#5E8C61]" />
                    <span className="w-1.5 h-7 rounded-full bg-[#17211B] dark:bg-[#A7C8A3]" />
                  </div>
                </div>
              </div>

              {/* Split Income vs Expense Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#DDD7C8] bg-[#FFFFEF] p-4 shadow-xs dark:border-[#2B3B32] dark:bg-[#17211B]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#5C665F] dark:text-[#8A9E90]">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2E7D32]/15 text-[#2E7D32] dark:bg-[#4ADE80]/20 dark:text-[#4ADE80]">
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                    <span>Income</span>
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-[#17211B] dark:text-[#F3F1E8] tabular-nums">
                    $5,230.00
                  </p>
                </div>

                <div className="rounded-2xl border border-[#DDD7C8] bg-[#FFFFEF] p-4 shadow-xs dark:border-[#2B3B32] dark:bg-[#17211B]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#5C665F] dark:text-[#8A9E90]">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#D95D50]/15 text-[#D95D50] dark:bg-[#F87171]/20 dark:text-[#F87171]">
                      <ArrowDownRight className="h-3 w-3" />
                    </span>
                    <span>Expenses</span>
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-[#17211B] dark:text-[#F3F1E8] tabular-nums">
                    $909.50
                  </p>
                </div>
              </div>

              {/* Dynamic View by Selected Tab */}
              {activeTab === "overview" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#17211B] dark:text-[#F3F1E8]">
                      Recent Transactions
                    </span>
                    <span className="text-xs font-bold text-[#5E8C61] dark:text-[#A7C8A3]">
                      See all
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-[#DDD7C8]/70 bg-[#FFFFEF] p-3 shadow-2xs dark:border-[#2B3B32] dark:bg-[#17211B]">
                      <div className="flex items-center gap-3">
                        <BrandIcon name="wallet" variant="badge" size="sm" />
                        <div>
                          <p className="text-xs font-bold text-[#17211B] dark:text-[#F3F1E8]">
                            Client Payment (Acme Corp)
                          </p>
                          <p className="text-[10px] text-[#5C665F] dark:text-[#8A9E90]">
                            Design System Delivery
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-[#2E7D32] dark:text-[#4ADE80] tabular-nums">
                        +$1,200.00
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-[#DDD7C8]/70 bg-[#FFFFEF] p-3 shadow-2xs dark:border-[#2B3B32] dark:bg-[#17211B]">
                      <div className="flex items-center gap-3">
                        <BrandIcon name="receipt" variant="badge" size="sm" />
                        <div>
                          <p className="text-xs font-bold text-[#17211B] dark:text-[#F3F1E8]">
                            Software Subscription
                          </p>
                          <p className="text-[10px] text-[#5C665F] dark:text-[#8A9E90]">
                            Adobe Creative Cloud
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-[#D95D50] dark:text-[#F87171] tabular-nums">
                        -$29.99
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-[#DDD7C8]/70 bg-[#FFFFEF] p-3 shadow-2xs dark:border-[#2B3B32] dark:bg-[#17211B]">
                      <div className="flex items-center gap-3">
                        <BrandIcon name="sprout" variant="badge" size="sm" />
                        <div>
                          <p className="text-xs font-bold text-[#17211B] dark:text-[#F3F1E8]">
                            Creative Retainer (Starlight)
                          </p>
                          <p className="text-[10px] text-[#5C665F] dark:text-[#8A9E90]">
                            Monthly Retainer Deposit
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-[#2E7D32] dark:text-[#4ADE80] tabular-nums">
                        +$800.00
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "invoices" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#17211B] dark:text-[#F3F1E8]">
                      Active Client Invoices
                    </span>
                    <span className="text-xs font-bold text-[#5E8C61] dark:text-[#A7C8A3]">
                      New Invoice
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-xl border border-[#DDD7C8] bg-[#FFFFEF] p-3.5 shadow-xs dark:border-[#2B3B32] dark:bg-[#17211B]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#17211B] dark:text-[#F3F1E8]">
                          INV-2026-001
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/15 px-2 py-0.5 text-[10px] font-bold text-[#D97706]">
                          <Clock className="h-3 w-3" />
                          Sent (Due Oct 24)
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#5C665F] dark:text-[#8A9E90]">
                        Acme Global Corp — Design System Overhaul
                      </p>
                      <p className="mt-2 text-sm font-extrabold text-[#17211B] dark:text-[#F3F1E8] tabular-nums">
                        $1,200.00
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#DDD7C8] bg-[#FFFFEF] p-3.5 shadow-xs dark:border-[#2B3B32] dark:bg-[#17211B]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#17211B] dark:text-[#F3F1E8]">
                          INV-2026-002
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#2E7D32]/15 px-2 py-0.5 text-[10px] font-bold text-[#2E7D32] dark:text-[#4ADE80]">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#5C665F] dark:text-[#8A9E90]">
                        Starlight Media — Brand & Motion Identity
                      </p>
                      <p className="mt-2 text-sm font-extrabold text-[#17211B] dark:text-[#F3F1E8] tabular-nums">
                        $800.00
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "tax" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#17211B] dark:text-[#F3F1E8]">
                      Quarterly Tax Set-Aside
                    </span>
                    <span className="text-xs font-bold text-[#5E8C61] dark:text-[#A7C8A3]">
                      Rate: 15.00%
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#DDD7C8] bg-[#FFFFEF] p-4 shadow-xs dark:border-[#2B3B32] dark:bg-[#17211B] space-y-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C665F] dark:text-[#8A9E90]">
                        Reserved for Taxes (Q4)
                      </span>
                      <p className="font-sans text-2xl font-extrabold text-[#D97706] tabular-nums">
                        $784.50
                      </p>
                    </div>

                    <div className="h-2 w-full rounded-full bg-[#E8EDE6] dark:bg-[#212E27] overflow-hidden">
                      <div className="h-full bg-[#5E8C61] rounded-full" style={{ width: "65%" }} />
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold text-[#5C665F] dark:text-[#8A9E90]">
                      <span>Safe-to-Spend Profit:</span>
                      <span className="font-extrabold text-[#2E7D32] dark:text-[#4ADE80] tabular-nums">
                        $4,445.50
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Tab Bar Mockup */}
            <div className="flex items-center justify-around border-t border-[#DDD7C8]/70 bg-[#FFFFEF] py-3.5 px-4 dark:border-[#2B3B32]/70 dark:bg-[#17211B]">
              <div className="flex flex-col items-center gap-1 text-[#5E8C61] dark:text-[#A7C8A3]">
                <BrandIcon name="home" variant="minimal" size="sm" />
                <span className="text-[10px] font-extrabold">Home</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-[#5C665F] dark:text-[#8A9E90]">
                <BrandIcon name="analytics" variant="minimal" size="sm" />
                <span className="text-[10px] font-medium">Analytics</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5E8C61] text-[#FFFFEF] shadow-md -mt-4">
                <span className="text-xl font-bold leading-none">+</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-[#5C665F] dark:text-[#8A9E90]">
                <BrandIcon name="receipt" variant="minimal" size="sm" />
                <span className="text-[10px] font-medium">Invoices</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-[#5C665F] dark:text-[#8A9E90]">
                <BrandIcon name="user" variant="minimal" size="sm" />
                <span className="text-[10px] font-medium">Profile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
