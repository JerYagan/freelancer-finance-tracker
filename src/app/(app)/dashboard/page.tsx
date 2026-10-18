import { getSessionUser } from "@/server/auth";
import { DashboardView } from "@/components/features/dashboard-view";
import {
  getMonthSummary,
  getQuarterlyTaxSummary,
  getTrend,
} from "@/server/services/reports";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  let initialSummary;
  let initialTrend;
  let initialTaxSummary;

  try {
    const [summary, trend, taxSummary] = await Promise.all([
      getMonthSummary(user.id),
      getTrend(user.id, { months: 6 }),
      getQuarterlyTaxSummary(user.id),
    ]);
    initialSummary = summary;
    initialTrend = trend;
    initialTaxSummary = taxSummary;
  } catch {
    // If initial server load encounters missing data or error, client view will handle/retry
  }

  return (
    <DashboardView
      initialSummary={initialSummary}
      initialTrend={initialTrend}
      initialTaxSummary={initialTaxSummary}
    />
  );
}
