"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight, Calculator } from "lucide-react";

export function TaxCalculator() {
  const [currency, setCurrency] = useState<"PHP" | "USD">("USD");
  const [monthlyRevenue, setMonthlyRevenue] = useState(4500);
  const [taxRateBps, setTaxRateBps] = useState(1500); // 15%

  const currencySymbol = currency === "USD" ? "$" : "₱";
  const exchangeMultiplier = currency === "USD" ? 1 : 55;

  const adjustedRevenue = monthlyRevenue * exchangeMultiplier;
  const estimatedExpense = Math.round(adjustedRevenue * 0.18);
  const taxableProfit = Math.max(0, adjustedRevenue - estimatedExpense);

  const taxPercentage = taxRateBps / 10000;
  const monthlyTaxReserve = Math.round(taxableProfit * taxPercentage);
  const quarterlyTaxReserve = monthlyTaxReserve * 3;
  const safeToSpendMonthly = taxableProfit - monthlyTaxReserve;

  function formatMoney(amount: number) {
    return `${currencySymbol}${amount.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;
  }

  return (
    <section id="calculator" className="py-20 sm:py-28 bg-[#FFFFEF] dark:bg-[#17211B] border-y border-[#DDD7C8] dark:border-[#2B3B32]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Explainer */}
          <div className="lg:col-span-5 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#5E8C61]/30 bg-[#A7C8A3]/25 px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#17211B] dark:text-[#A7C8A3]">
              <Calculator className="h-3.5 w-3.5 text-[#5E8C61] dark:text-[#A7C8A3]" />
              <span>Free Freelancer Tool</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8]">
              Never worry about quarterly taxes again.
            </h2>

            <p className="text-base sm:text-lg text-[#5C665F] dark:text-[#8A9E90]">
              The #1 source of freelancer panic is spending revenue that actually belongs to the tax bureau. See how much to set aside safely each quarter.
            </p>

            <div className="rounded-2xl border border-[#DDD7C8] bg-[#F3F1E8] p-4 text-xs font-semibold text-[#17211B] dark:border-[#2B3B32] dark:bg-[#0E1411] dark:text-[#F3F1E8] flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-[#D97706] mt-0.5" />
              <span>
                In Tally, this calculation runs automatically on every payment you receive so you always know your exact Safe-to-Spend profit.
              </span>
            </div>

            <Button
              asChild
              className="rounded-full bg-[#5E8C61] hover:bg-[#4E7651] text-[#FFFFEF] font-bold px-7 py-5 text-sm shadow-sm"
            >
              <Link href="/sign-up">
                Track It Automatically in Tally
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Right Column: Interactive Card */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border-2 border-[#DDD7C8] bg-[#F3F1E8] p-6 sm:p-8 shadow-xl dark:border-[#2B3B32] dark:bg-[#0E1411] space-y-6">
              {/* Currency Toggle */}
              <div className="flex items-center justify-between border-b border-[#DDD7C8]/70 pb-4 dark:border-[#2B3B32]/70">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#5C665F] dark:text-[#8A9E90]">
                  Select Currency
                </span>
                <div className="inline-flex rounded-full bg-[#FFFFEF] p-1 border border-[#DDD7C8] dark:bg-[#17211B] dark:border-[#2B3B32]">
                  <button
                    onClick={() => setCurrency("USD")}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                      currency === "USD"
                        ? "bg-[#5E8C61] text-[#FFFFEF]"
                        : "text-[#5C665F] hover:text-[#17211B] dark:text-[#8A9E90]"
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    onClick={() => setCurrency("PHP")}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                      currency === "PHP"
                        ? "bg-[#5E8C61] text-[#FFFFEF]"
                        : "text-[#5C665F] hover:text-[#17211B] dark:text-[#8A9E90]"
                    }`}
                  >
                    PHP (₱)
                  </button>
                </div>
              </div>

              {/* Monthly Revenue Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="revenue-range" className="text-sm font-extrabold text-[#17211B] dark:text-[#F3F1E8]">
                    Estimated Monthly Income
                  </label>
                  <span className="font-sans text-xl font-extrabold text-[#5E8C61] dark:text-[#A7C8A3] tabular-nums">
                    {formatMoney(adjustedRevenue)}
                  </span>
                </div>
                <input
                  id="revenue-range"
                  type="range"
                  min="1000"
                  max="15000"
                  step="250"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                  className="w-full accent-[#5E8C61] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-semibold text-[#5C665F] dark:text-[#8A9E90]">
                  <span>{formatMoney(1000 * exchangeMultiplier)}</span>
                  <span>{formatMoney(15000 * exchangeMultiplier)}</span>
                </div>
              </div>

              {/* Tax Rate Selection */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#5C665F] dark:text-[#8A9E90]">
                  Tax Set-Aside Rate
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "8%", bps: 800 },
                    { label: "15% (Recommended)", bps: 1500 },
                    { label: "20%", bps: 2000 },
                    { label: "30%", bps: 3000 },
                  ].map((rate) => (
                    <button
                      key={rate.bps}
                      onClick={() => setTaxRateBps(rate.bps)}
                      className={`rounded-xl border p-2 text-center text-xs font-bold transition-all ${
                        taxRateBps === rate.bps
                          ? "border-[#5E8C61] bg-[#5E8C61] text-[#FFFFEF] shadow-xs"
                          : "border-[#DDD7C8] bg-[#FFFFEF] text-[#17211B] hover:bg-[#E8EDE6] dark:border-[#2B3B32] dark:bg-[#17211B] dark:text-[#F3F1E8]"
                      }`}
                    >
                      {rate.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results Breakdown Box */}
              <div className="rounded-2xl border border-[#DDD7C8] bg-[#FFFFEF] p-5 shadow-xs dark:border-[#2B3B32] dark:bg-[#17211B] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#F3F1E8] p-3.5 dark:bg-[#0E1411]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#D97706]">
                      Quarterly Tax to Set Aside
                    </span>
                    <p className="mt-1 font-sans text-2xl font-extrabold text-[#D97706] tabular-nums">
                      {formatMoney(quarterlyTaxReserve)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#5C665F] dark:text-[#8A9E90]">
                      ({formatMoney(monthlyTaxReserve)} / month)
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F3F1E8] p-3.5 dark:bg-[#0E1411]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2E7D32] dark:text-[#4ADE80]">
                      Safe-to-Spend Monthly Profit
                    </span>
                    <p className="mt-1 font-sans text-2xl font-extrabold text-[#2E7D32] dark:text-[#4ADE80] tabular-nums">
                      {formatMoney(safeToSpendMonthly)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#5C665F] dark:text-[#8A9E90]">
                      After estimated expenses & taxes
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-medium text-[#5C665F] dark:text-[#8A9E90] pt-1 border-t border-[#DDD7C8]/70 dark:border-[#2B3B32]/70">
                  <span>Estimated business expenses: {formatMoney(estimatedExpense)}/mo</span>
                  <span className="font-bold text-[#5E8C61] dark:text-[#A7C8A3]">
                    Net Margin: {Math.round((safeToSpendMonthly / adjustedRevenue) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
