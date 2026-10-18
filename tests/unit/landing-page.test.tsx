import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HomePage from "@/app/page";
import { InteractivePreview } from "@/components/landing/interactive-preview";
import { TaxCalculator } from "@/components/landing/tax-calculator";
import { LandingFaq } from "@/components/landing/landing-faq";

describe("Tally Public Landing Page", () => {
  it("renders HomePage with brand headline, logo, and primary CTAs", () => {
    render(<HomePage />);

    // Brand lockup
    expect(screen.getAllByText("Tally").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Track it\. Earn it\. Grow it\./i).length).toBeGreaterThan(0);

    // Hero title
    expect(
      screen.getByRole("heading", { name: /Freelance finances,\s*simplified\./i }),
    ).toBeInTheDocument();

    // CTA links
    const getStartedLinks = screen.getAllByRole("link", { name: /Start Tracking Free/i });
    expect(getStartedLinks.length).toBeGreaterThan(0);
    expect(getStartedLinks[0]).toHaveAttribute("href", "/sign-up");
  });

  it("supports interactive preview tab switching", () => {
    render(<InteractivePreview />);

    // Default overview tab
    expect(screen.getByText(/Recent Transactions/i)).toBeInTheDocument();

    // Switch to invoices tab
    const invoicesBtn = screen.getByRole("button", { name: /Invoices & Retainers/i });
    fireEvent.click(invoicesBtn);
    expect(screen.getByText(/Active Client Invoices/i)).toBeInTheDocument();
    expect(screen.getByText("INV-2026-001")).toBeInTheDocument();

    // Switch to tax tab
    const taxBtn = screen.getByRole("button", { name: /15% Tax Set-Aside/i });
    fireEvent.click(taxBtn);
    expect(screen.getByText(/Quarterly Tax Set-Aside/i)).toBeInTheDocument();
    expect(screen.getByText("$784.50")).toBeInTheDocument();
  });

  it("calculates quarterly tax set-aside interactively", () => {
    render(<TaxCalculator />);

    // Confirm initial quarterly reserve calculation
    expect(screen.getByText(/Quarterly Tax to Set Aside/i)).toBeInTheDocument();

    // Switch currency to PHP
    const phpBtn = screen.getByRole("button", { name: /PHP \(₱\)/i });
    fireEvent.click(phpBtn);

    // Expect amounts formatted in PHP
    expect(screen.getAllByText(/₱/i).length).toBeGreaterThan(0);

    // Change tax rate to 8%
    const rate8Btn = screen.getByRole("button", { name: /8%/i });
    fireEvent.click(rate8Btn);
    expect(screen.getByText(/Safe-to-Spend Monthly Profit/i)).toBeInTheDocument();
  });

  it("expands and collapses FAQ items", () => {
    render(<LandingFaq />);

    // First question is open by default
    expect(
      screen.getByText(/Those legacy tools are built for enterprise accountants/i),
    ).toBeInTheDocument();

    // Click second question
    const q2Btn = screen.getByRole("button", {
      name: /Can I use Tally on my phone and offline when traveling\?/i,
    });
    fireEvent.click(q2Btn);

    expect(
      screen.getByText(/Tally is a fully installable Progressive Web App/i),
    ).toBeInTheDocument();
  });
});
