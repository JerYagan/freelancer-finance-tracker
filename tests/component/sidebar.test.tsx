import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "@/components/layout/sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Sidebar Component", () => {
  const user = {
    name: "Alex Doe",
    email: "alex@example.com",
  };

  it("renders branding and all main navigation links", () => {
    render(<Sidebar user={user} />);

    expect(screen.getByText("Tally")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /dashboard/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /transactions/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clients/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /categories/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });

  it("marks active link with aria-current='page'", () => {
    render(<Sidebar user={user} />);

    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("aria-current", "page");

    const settingsLink = screen.getByRole("link", { name: /settings/i });
    expect(settingsLink).not.toHaveAttribute("aria-current");
  });

  it("displays user information in the footer", () => {
    render(<Sidebar user={user} />);

    expect(screen.getByText("Alex Doe")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });
});
