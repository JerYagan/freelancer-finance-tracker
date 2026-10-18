"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const isDashboardActive = pathname === "/dashboard";
  const isTransactionsActive =
    pathname === "/transactions" || pathname.startsWith("/transactions/");
  const isClientsActive =
    pathname === "/clients" || pathname.startsWith("/clients/");
  const isSettingsActive =
    pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <nav
      aria-label="Mobile Navigation"
      className="border-border bg-surface/95 fixed right-0 bottom-0 left-0 z-40 border-t backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          aria-current={isDashboardActive ? "page" : undefined}
          className={cn(
            "focus-visible:ring-ring flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
            isDashboardActive
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          <span>Dashboard</span>
        </Link>

        {/* Transactions */}
        <Link
          href="/transactions"
          aria-current={isTransactionsActive ? "page" : undefined}
          className={cn(
            "focus-visible:ring-ring flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
            isTransactionsActive
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
          <span>Activity</span>
        </Link>

        {/* Center Prominent Add Button */}
        <div className="flex items-center justify-center">
          <Link
            href="/transactions?action=new"
            aria-label="Add transaction"
            className="bg-primary text-primary-foreground focus-visible:ring-ring flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:outline-none active:scale-95"
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
          </Link>
        </div>

        {/* Clients */}
        <Link
          href="/clients"
          aria-current={isClientsActive ? "page" : undefined}
          className={cn(
            "focus-visible:ring-ring flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
            isClientsActive
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="h-5 w-5" aria-hidden="true" />
          <span>Clients</span>
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          aria-current={isSettingsActive ? "page" : undefined}
          className={cn(
            "focus-visible:ring-ring flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
            isSettingsActive
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );
}
