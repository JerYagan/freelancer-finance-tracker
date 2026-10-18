"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={
        isClient
          ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`
          : "Toggle theme"
      }
      className="text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] p-0 sm:h-8 sm:min-h-0 sm:w-8 sm:min-w-0"
    >
      {isClient && resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
