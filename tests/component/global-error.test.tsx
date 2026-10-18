import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GlobalError from "@/app/global-error";

describe("GlobalError Component", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.restoreAllMocks();
  });

  it("renders error title, message, and error digest reference", () => {
    const error = Object.assign(new Error("Fatal crash in root"), {
      digest: "err_98765",
    });
    const reset = vi.fn();

    render(<GlobalError error={error} reset={reset} />);

    expect(
      screen.getByRole("heading", { name: /application error/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Error Reference: err_98765/i)).toBeInTheDocument();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[Global Root Error]"),
      error,
    );
  });

  it("calls reset when Try Again button is clicked", () => {
    const error = new Error("Layout render failure");
    const reset = vi.fn();

    render(<GlobalError error={error} reset={reset} />);

    const retryBtn = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(retryBtn);

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders a link to navigate back to dashboard", () => {
    const error = new Error("Layout render failure");
    const reset = vi.fn();

    render(<GlobalError error={error} reset={reset} />);

    const dashboardLink = screen.getByRole("link", {
      name: /return to dashboard/i,
    });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });
});
