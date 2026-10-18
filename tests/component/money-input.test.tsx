import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MoneyInput } from "@/components/ui/money-input";

describe("MoneyInput Component", () => {
  it("renders with default PHP currency symbol (₱)", () => {
    render(<MoneyInput label="Amount" currency="PHP" />);

    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("₱")).toBeInTheDocument();
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("inputmode", "decimal");
  });

  it("renders with USD currency symbol ($)", () => {
    render(<MoneyInput currency="USD" />);
    expect(screen.getByText("$")).toBeInTheDocument();
  });

  it("calls onChangeValue with integer minor units on user typing", () => {
    const onChangeValue = vi.fn();
    render(<MoneyInput currency="PHP" onChangeValue={onChangeValue} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "1500" } });

    expect(onChangeValue).toHaveBeenCalledWith(150000, "1500");
  });

  it("formats value to decimal string on blur", () => {
    const onChangeValue = vi.fn();
    render(<MoneyInput currency="PHP" onChangeValue={onChangeValue} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1250" } });
    fireEvent.blur(input);

    expect(input.value).toBe("1250.00");
    expect(onChangeValue).toHaveBeenCalledWith(125000, "1250.00");
  });

  it("displays error message and sets aria-invalid", () => {
    render(<MoneyInput error="Amount must be greater than 0" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("Amount must be greater than 0"),
    ).toBeInTheDocument();
  });
});
