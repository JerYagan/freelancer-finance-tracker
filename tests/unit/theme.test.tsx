import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/layout/theme-toggle";

function TestConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="resolved-val">{resolvedTheme}</span>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("system")}>Set System</button>
    </div>
  );
}

describe("ThemeProvider and ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("defaults to system theme and light mode", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-val")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved-val")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("updates theme to dark and sets dark class on documentElement", async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Set Dark" }));
    });

    expect(screen.getByTestId("theme-val")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved-val")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("updates theme to light and removes dark class", async () => {
    document.documentElement.classList.add("dark");
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Set Light" }));
    });

    expect(screen.getByTestId("theme-val")).toHaveTextContent("light");
    expect(screen.getByTestId("resolved-val")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("toggles theme using ThemeToggle button", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByRole("button", {
      name: /toggle theme|switch to/i,
    });
    expect(toggleBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
