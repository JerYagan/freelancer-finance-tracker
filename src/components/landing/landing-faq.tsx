"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "How is Tally different from QuickBooks, FreshBooks, or Xero?",
    a: "Those legacy tools are built for enterprise accountants with double-entry ledgers, payroll tax matrices, and endless nested forms. Tally is designed from the ground up for independent solo freelancers: it takes 5 seconds to log money in or out, automatically attributes cash to clients, and calculates your safe-to-spend profit without requiring a bookkeeping degree.",
  },
  {
    q: "Can I use Tally on my phone and offline when traveling?",
    a: "Yes! Tally is a fully installable Progressive Web App (PWA). You can install it on iOS or Android directly from Safari/Chrome with one tap. If you take a client flight or enter a basement coworking space without signal, you can still quick-add expenses and attach photo receipts. They will automatically sync to your account the moment you reconnect.",
  },
  {
    q: "How does the quarterly tax set-aside work?",
    a: "In your settings, configure your target tax rate (e.g. 15% or 8%). Every time an invoice is marked paid or you log income, Tally calculates the exact portion of that payment you should hold in reserve. On your dashboard, you will see your total quarterly tax liability and your true safe-to-spend net profit.",
  },
  {
    q: "Can I export my data for my tax preparer or accountant?",
    a: "Absolutely. With one click, export your complete transaction history and invoice records into an RFC 4180-compliant CSV spreadsheet or full JSON archive. It includes category breakdowns, client names, dates, amounts in minor units, and receipts.",
  },
  {
    q: "Do you support foreign currency clients (e.g. USD, EUR, GBP, PHP)?",
    a: "Yes. Tally allows you to invoice and log transactions in any supported currency. Your dashboard report will organize by currency and convert into your chosen baseline display currency.",
  },
  {
    q: "Can I import my previous financial records from my old spreadsheet?",
    a: "Yes. Tally features a CSV importer with an intelligent column mapper. Simply upload your bank or spreadsheet export, map your date, amount, and description columns, review the interactive preview, and import with zero friction.",
  },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#5E8C61]/30 bg-[#A7C8A3]/25 px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#17211B] dark:text-[#A7C8A3]">
            <HelpCircle className="h-3.5 w-3.5 text-[#5E8C61] dark:text-[#A7C8A3]" />
            <span>Got Questions?</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8]">
            Frequently Asked Questions
          </h2>

          <p className="text-base sm:text-lg text-[#5C665F] dark:text-[#8A9E90]">
            Everything you need to know about tracking freelance finances with Tally.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-2xl border-2 border-[#DDD7C8] bg-[#FFFFEF] transition-all dark:border-[#2B3B32] dark:bg-[#17211B]"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E8C61]"
                >
                  <span className="text-base sm:text-lg font-bold text-[#17211B] dark:text-[#F3F1E8]">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#5E8C61] transition-transform duration-300 dark:text-[#A7C8A3] ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-[#DDD7C8]/70 px-6 pt-3 pb-6 text-sm text-[#5C665F] dark:border-[#2B3B32]/70 dark:text-[#8A9E90] leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
