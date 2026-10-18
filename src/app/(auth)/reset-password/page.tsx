"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const urlError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError === "INVALID_TOKEN"
      ? "This password reset link is invalid or has expired. Please request a new one."
      : null,
  );
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("No reset token found. Please use the link sent to your email.");
      return;
    }

    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setError(
          result.error.message ||
            "Failed to reset password. The link may have expired.",
        );
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/sign-in?reset=true");
      }, 2000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  if (!token && !urlError) {
    return (
      <Card className="w-full rounded-3xl border-2 border-[#DDD7C8] bg-[#FFFFEF] shadow-md dark:border-[#2B3B32] dark:bg-[#17211B]">
        <CardHeader className="space-y-1.5 pb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8]">
            Invalid Reset Link
          </h1>
          <CardDescription className="text-sm text-[#5C665F] dark:text-[#8A9E90]">
            A reset token is required to set a new password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            role="alert"
            className="bg-destructive/10 text-destructive flex items-start gap-3 rounded-md p-3 text-sm"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <p>
              This link is missing a valid reset token. Please check the link in
              your email or request a new reset link.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="w-full inline-flex items-center justify-center rounded-full bg-[#5E8C61] hover:bg-[#4E7651] text-[#FFFFEF] font-bold py-3 text-sm shadow-sm"
          >
            Request New Reset Link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full rounded-3xl border-2 border-[#DDD7C8] bg-[#FFFFEF] shadow-md dark:border-[#2B3B32] dark:bg-[#17211B]">
      <CardHeader className="space-y-1.5 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8]">
          Reset Password
        </h1>
        <CardDescription className="text-sm text-[#5C665F] dark:text-[#8A9E90]">
          Enter your new password below (minimum 10 characters)
        </CardDescription>
      </CardHeader>

      {success ? (
        <CardContent className="space-y-4 pt-2">
          <div
            role="status"
            className="flex items-start gap-3 rounded-md bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Password updated!</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Your password has been reset successfully. Redirecting you to
                sign in...
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/sign-in?reset=true"
              className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Sign In Now
            </Link>
          </div>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="bg-destructive/10 text-destructive rounded-md p-3 text-sm font-medium"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={10}
                placeholder="At least 10 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || Boolean(urlError)}
                autoComplete="new-password"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={10}
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || Boolean(urlError)}
                autoComplete="new-password"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2">
            {urlError ? (
              <Link
                href="/forgot-password"
                className="w-full inline-flex items-center justify-center rounded-full bg-[#5E8C61] hover:bg-[#4E7651] text-[#FFFFEF] font-bold py-3 text-sm shadow-sm"
              >
                Request New Reset Link
              </Link>
            ) : (
              <Button
                type="submit"
                className="w-full rounded-full bg-[#5E8C61] hover:bg-[#4E7651] text-[#FFFFEF] font-bold py-6 shadow-sm transition-transform hover:scale-[1.01]"
                disabled={loading}
              >
                {loading ? "Updating password..." : "Reset Password"}
              </Button>
            )}

            <p className="text-center text-sm text-[#5C665F] dark:text-[#8A9E90]">
              <Link
                href="/sign-in"
                className="font-bold text-[#5E8C61] hover:underline dark:text-[#A7C8A3]"
              >
                Back to Sign In
              </Link>
            </p>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-border bg-surface w-full animate-pulse shadow-sm">
          <CardHeader className="space-y-2">
            <div className="bg-muted h-6 w-1/3 rounded" />
            <div className="bg-muted h-4 w-2/3 rounded" />
          </CardHeader>
          <CardContent className="h-48" />
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
