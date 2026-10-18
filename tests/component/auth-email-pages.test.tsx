import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";
import VerifyEmailPage from "@/app/(auth)/verify-email/page";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock auth-client functions
const mockRequestPasswordReset = vi.fn();
const mockResetPassword = vi.fn();
const mockSendVerificationEmail = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  requestPasswordReset: (...args: unknown[]) =>
    mockRequestPasswordReset(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  sendVerificationEmail: (...args: unknown[]) =>
    mockSendVerificationEmail(...args),
}));

describe("Auth Email Pages Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe("ForgotPasswordPage", () => {
    it("renders email input and sends reset link on submit", async () => {
      mockRequestPasswordReset.mockResolvedValue({
        data: { status: true, message: "OK" },
        error: null,
      });

      render(<ForgotPasswordPage />);

      expect(
        screen.getByRole("heading", { name: /forgot password/i }),
      ).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, {
        target: { value: "freelancer@example.com" },
      });

      const submitButton = screen.getByRole("button", {
        name: /send reset link/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRequestPasswordReset).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "freelancer@example.com",
          }),
        );
      });

      expect(
        await screen.findByText(/reset instructions sent/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/freelancer@example.com/i)).toBeInTheDocument();
    });

    it("displays error alert when reset request fails", async () => {
      mockRequestPasswordReset.mockResolvedValue({
        data: null,
        error: { message: "Account disabled", status: 400, statusCode: 400 },
      });

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: "error@example.com" } });

      const submitButton = screen.getByRole("button", {
        name: /send reset link/i,
      });
      fireEvent.click(submitButton);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /account disabled/i,
      );
    });
  });

  describe("ResetPasswordPage", () => {
    it("shows invalid reset link warning when no token is present", () => {
      mockSearchParams = new URLSearchParams();
      render(<ResetPasswordPage />);

      expect(
        screen.getByRole("heading", { name: /invalid reset link/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /request new reset link/i }),
      ).toBeInTheDocument();
    });

    it("validates password length and matching passwords before submit", async () => {
      mockSearchParams = new URLSearchParams("token=valid-test-token");
      render(<ResetPasswordPage />);

      expect(
        screen.getByRole("heading", { name: /reset password/i }),
      ).toBeInTheDocument();

      const passwordInput = screen.getByLabelText(/^new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });

      // Short password
      fireEvent.change(passwordInput, { target: { value: "short" } });
      fireEvent.change(confirmInput, { target: { value: "short" } });
      fireEvent.click(submitButton);

      expect(
        await screen.findByText(/must be at least 10 characters/i),
      ).toBeInTheDocument();

      // Mismatch
      fireEvent.change(passwordInput, {
        target: { value: "validpassword123" },
      });
      fireEvent.change(confirmInput, { target: { value: "different123" } });
      fireEvent.click(submitButton);

      expect(
        await screen.findByText(/passwords do not match/i),
      ).toBeInTheDocument();
    });

    it("submits valid reset password request and displays success feedback", async () => {
      mockSearchParams = new URLSearchParams("token=valid-test-token");
      mockResetPassword.mockResolvedValue({
        data: { status: true },
        error: null,
      });

      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText(/^new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      const submitButton = screen.getByRole("button", {
        name: /reset password/i,
      });

      fireEvent.change(passwordInput, {
        target: { value: "my-secure-password-123" },
      });
      fireEvent.change(confirmInput, {
        target: { value: "my-secure-password-123" },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith({
          newPassword: "my-secure-password-123",
          token: "valid-test-token",
        });
      });

      expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
    });
  });

  describe("VerifyEmailPage", () => {
    it("renders resend verification form when no token is present", async () => {
      mockSearchParams = new URLSearchParams();
      mockSendVerificationEmail.mockResolvedValue({
        data: { status: true },
        error: null,
      });

      render(<VerifyEmailPage />);

      expect(
        screen.getByRole("heading", { name: /verify your email/i }),
      ).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/account email/i);
      fireEvent.change(emailInput, {
        target: { value: "verify-me@example.com" },
      });

      const submitButton = screen.getByRole("button", {
        name: /resend verification email/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSendVerificationEmail).toHaveBeenCalledWith({
          email: "verify-me@example.com",
          callbackURL: "/dashboard",
        });
      });

      expect(
        await screen.findByText(/verification link sent/i),
      ).toBeInTheDocument();
    });
  });
});
