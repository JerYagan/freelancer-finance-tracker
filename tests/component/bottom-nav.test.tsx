import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BottomNav } from "@/components/layout/bottom-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/transactions",
}));

describe("BottomNav Component", () => {
  it("renders mobile navigation items and prominent add button", () => {
    render(<BottomNav />);

    expect(
      screen.getByRole("navigation", { name: /mobile navigation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /activity/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /add transaction/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clients/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });

  it("marks active route with aria-current='page'", () => {
    render(<BottomNav />);

    const activityLink = screen.getByRole("link", { name: /activity/i });
    expect(activityLink).toHaveAttribute("aria-current", "page");

    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).not.toHaveAttribute("aria-current");
  });

  it("links add transaction button to quick add action", () => {
    render(<BottomNav />);

    const addLink = screen.getByRole("link", { name: /add transaction/i });
    expect(addLink).toHaveAttribute("href", "/transactions?action=new");
  });
});
