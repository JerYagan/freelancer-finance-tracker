"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOut();
      router.push("/sign-in");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={loading}
      aria-label="Sign out of account"
      className="min-h-[44px] sm:h-8 sm:min-h-0"
    >
      {loading ? "Signing out..." : "Sign Out"}
    </Button>
  );
}
