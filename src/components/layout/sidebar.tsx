"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { SignOutButton } from "@/components/features/sign-out-button";
import { TallyLogo } from "@/components/brand/tally-logo";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: {
    name?: string | null;
    email: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Desktop Sidebar"
      className="border-border bg-surface sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r md:flex"
    >
      {/* Brand Header */}
      <div className="border-border flex h-16 items-center px-6 border-b">
        <TallyLogo size="md" href="/dashboard" />
      </div>

      {/* Navigation Links */}
      <nav aria-label="Main Navigation" className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.matchExact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "focus-visible:ring-ring flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User & Sign Out Footer */}
      <div className="border-border border-t p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="bg-muted text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {(
              user.name?.charAt(0) ||
              user.email.charAt(0) ||
              "U"
            ).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-xs font-medium">
              {user.name || "Freelancer"}
            </p>
            <p className="text-muted-foreground truncate text-[11px]">
              {user.email}
            </p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
