import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TallyIcon } from "@/components/brand/tally-icon";
import { TallyLogo } from "@/components/brand/tally-logo";
import { BrandIcon } from "@/components/brand/brand-icon";

describe("Tally Brand Components", () => {
  it("renders TallyIcon SVG mark with default size", () => {
    const { container } = render(<TallyIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 1086.98 1236.59");
    expect(svg).toHaveAttribute("width", "32");
  });

  it("renders TallyLogo with mark and typography without subtitle", () => {
    render(<TallyLogo size="lg" />);
    expect(screen.getByText("Tally")).toBeInTheDocument();
    expect(screen.queryByText("Track it. Earn it. Grow it.")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Tally — Home/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders BrandIcon using lucide-react and no emojis", () => {
    const { container } = render(<BrandIcon name="wallet" variant="badge" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // Confirm text content has zero emoji characters
    expect(container.textContent).toBe("");
  });

  it("supports all brand icon variants", () => {
    const { container: c1 } = render(<BrandIcon name="analytics" variant="pill" />);
    const { container: c2 } = render(<BrandIcon name="sprout" variant="solid" />);
    const { container: c3 } = render(<BrandIcon name="receipt" variant="minimal" />);

    expect(c1.querySelector("svg")).toBeInTheDocument();
    expect(c2.querySelector("svg")).toBeInTheDocument();
    expect(c3.querySelector("svg")).toBeInTheDocument();
  });
});
