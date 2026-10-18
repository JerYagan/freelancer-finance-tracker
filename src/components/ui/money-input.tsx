"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getCurrencyInfo } from "@/lib/currencies";
import { formatMinorToDecimal, parseMoneyInput } from "@/lib/money";

export interface MoneyInputProps extends Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "defaultValue"
> {
  value?: number | null; // integer minor units
  defaultValue?: number | null;
  currency?: string;
  onChangeValue?: (amountMinor: number | null, rawValue: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  id?: string;
}

export function MoneyInput({
  value,
  defaultValue,
  currency = "PHP",
  onChangeValue,
  label,
  error,
  helperText,
  id,
  className,
  disabled,
  placeholder = "0.00",
  ...props
}: MoneyInputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const currencyInfo = getCurrencyInfo(currency);
  const symbol = currencyInfo?.symbol ?? currency;

  // Format initial minor units to decimal string
  const formatInitial = (minor: number | null | undefined): string => {
    if (minor === null || minor === undefined || minor <= 0) return "";
    try {
      return formatMinorToDecimal(minor, currency);
    } catch {
      return "";
    }
  };

  const [prevValue, setPrevValue] = React.useState<number | null | undefined>(
    value,
  );
  const [displayValue, setDisplayValue] = React.useState<string>(() => {
    return formatInitial(value !== undefined ? value : defaultValue);
  });

  // Sync external controlled value changes without useEffect cascading render
  if (value !== undefined && value !== prevValue) {
    setPrevValue(value);
    if (value === null || value === 0) {
      setDisplayValue("");
    } else {
      try {
        setDisplayValue(formatMinorToDecimal(value, currency));
      } catch {
        setDisplayValue("");
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);

    const trimmed = raw.trim();
    if (!trimmed) {
      onChangeValue?.(null, "");
      return;
    }

    try {
      const minor = parseMoneyInput(trimmed, currency);
      onChangeValue?.(minor, trimmed);
    } catch {
      onChangeValue?.(null, trimmed);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    props.onBlur?.(e);

    const trimmed = displayValue.trim();
    if (!trimmed) {
      setDisplayValue("");
      onChangeValue?.(null, "");
      return;
    }

    try {
      const minor = parseMoneyInput(trimmed, currency);
      const formatted = formatMinorToDecimal(minor, currency);
      setDisplayValue(formatted);
      onChangeValue?.(minor, formatted);
    } catch {
      // Leave raw if invalid so user can correct it
    }
  };

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-foreground block text-xs font-medium tracking-tight"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <span
          className="text-muted-foreground pointer-events-none absolute left-3 text-sm font-medium select-none"
          aria-hidden="true"
        >
          {symbol}
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 bg-surface h-10 w-full rounded-lg border py-2 pr-3 pl-9 text-base font-medium transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            error &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            className,
          )}
          {...props}
        />
      </div>

      {error ? (
        <p id={errorId} className="text-destructive text-xs font-medium">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-muted-foreground text-xs">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
