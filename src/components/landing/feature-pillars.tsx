import { BrandIcon } from "@/components/brand/brand-icon";
import { Check } from "lucide-react";

const pillars = [
  {
    icon: "analytics" as const,
    title: "Track your income",
    tagline: "Know your actual cash flow in real-time.",
    description:
      "Tie milestones, hourly sprints, and recurring retainers to clients and projects. See your monthly net profit clearly at a glance.",
    highlights: [
      "Client & project revenue attribution",
      "Recurring retainer rules & scheduled logging",
      "Multi-currency support with real-time conversion",
    ],
  },
  {
    icon: "wallet" as const,
    title: "Manage expenses",
    tagline: "Keep your operational spending in check.",
    description:
      "Log subscriptions, coworking fees, and equipment in seconds. Attach camera photo receipts directly from your phone while on the move.",
    highlights: [
      "One-tap receipt photo attachment",
      "Color-coded business expense categories",
      "30-day safety net with instant delete undo",
    ],
  },
  {
    icon: "sprout" as const,
    title: "Grow your freelance",
    tagline: "Zero surprises when quarterly taxes arrive.",
    description:
      "Configure your tax reserve rate (e.g., 15%) and let Tally automatically set aside exact tax obligations on every single paid invoice.",
    highlights: [
      "Automatic quarterly tax reserve calculations",
      "Instant safe-to-spend net profit balance",
      "1-Click accountant-ready CSV & JSON export",
    ],
  },
];

export function FeaturePillars() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#5E8C61]/30 bg-[#A7C8A3]/25 px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#17211B] dark:text-[#A7C8A3]">
            <BrandIcon name="check" variant="minimal" size="sm" />
            <span>Built Exclusively For Freelancers</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8]">
            Everything you need. Nothing you don’t.
          </h2>

          <p className="text-base sm:text-lg text-[#5C665F] dark:text-[#8A9E90]">
            No complex double-entry bookkeeping courses. No bloated enterprise software menus. Just fast, clear freelance finance clarity.
          </p>
        </div>

        {/* 3 Main Pillars Grid */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="group relative flex flex-col justify-between rounded-3xl border-2 border-[#DDD7C8] bg-[#FFFFEF] p-8 shadow-sm transition-all duration-300 hover:border-[#5E8C61] hover:shadow-xl dark:border-[#2B3B32] dark:bg-[#17211B] dark:hover:border-[#A7C8A3]"
            >
              <div className="space-y-5">
                <BrandIcon name={pillar.icon} variant="badge" size="lg" />

                <div>
                  <h3 className="text-2xl font-extrabold text-[#17211B] dark:text-[#F3F1E8]">
                    {pillar.title}
                  </h3>
                  <p className="mt-1 text-xs font-bold text-[#5E8C61] dark:text-[#A7C8A3]">
                    {pillar.tagline}
                  </p>
                </div>

                <p className="text-sm text-[#5C665F] dark:text-[#8A9E90] leading-relaxed">
                  {pillar.description}
                </p>
              </div>

              <div className="mt-8 border-t border-[#DDD7C8]/70 pt-6 dark:border-[#2B3B32]/70 space-y-2.5">
                {pillar.highlights.map((h) => (
                  <div
                    key={h}
                    className="flex items-center gap-2.5 text-xs font-semibold text-[#17211B] dark:text-[#F3F1E8]"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#A7C8A3]/40 text-[#2E7D32] dark:bg-[#5E8C61]/40 dark:text-[#A7C8A3]">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
