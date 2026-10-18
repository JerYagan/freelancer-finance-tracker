"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { SignOutButton } from "@/components/features/sign-out-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { TallyLogo } from "@/components/brand/tally-logo";

interface AppHeaderProps {
  user: {
    name?: string | null;
    email: string;
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="border-border bg-surface/80 sticky top-0 z-30 border-b backdrop-blur-md">
      {/* Mobile Header (md:hidden) */}
      <div className="flex h-14 items-center justify-between px-4 md:hidden">
        <TallyLogo size="sm" href="/dashboard" />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>

      {/* Desktop Header (hidden md:flex) */}
      <div className="hidden h-16 items-center justify-between px-8 md:flex">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Tally
          </span>
          <span className="text-border text-xs">/</span>
          <span className="text-muted-foreground text-xs">
            Your freelance money, in motion.
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button asChild size="sm" className="gap-2 shadow-sm">
            <Link href="/transactions?action=new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Add Transaction</span>
            </Link>
          </Button>
          <div className="border-border hidden h-6 w-px border-r lg:block" />
          <ThemeToggle />
          <span className="text-muted-foreground hidden text-xs lg:inline-block">
            {user.email}
          </span>
        </div>
      </div>
    </header>
  );
}
