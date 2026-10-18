"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth-client";
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
import { CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "/reset-password";

      const result = await requestPasswordReset({
        email,
        redirectTo,
      });

      if (result.error) {
        setError(
          result.error.message ||
            "Failed to request password reset. Please try again.",
        );
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setLoading(false);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full rounded-3xl border-2 border-[#DDD7C8] bg-[#FFFFEF] shadow-md dark:border-[#2B3B32] dark:bg-[#17211B]">
      <CardHeader className="space-y-1.5 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8]">
          Forgot Password
        </h1>
        <CardDescription className="text-sm text-[#5C665F] dark:text-[#8A9E90]">
          Enter your account email to receive a secure recovery link
        </CardDescription>
      </CardHeader>

      {submitted ? (
        <CardContent className="space-y-4 pt-2">
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl bg-[#A7C8A3]/25 p-4 text-[#17211B] dark:text-[#F3F1E8]"
          >
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-[#2E7D32] dark:text-[#4ADE80]"
              aria-hidden="true"
            />
            <div className="space-y-1 text-sm">
              <p className="font-bold">Reset instructions sent</p>
              <p className="text-xs text-[#5C665F] dark:text-[#8A9E90] leading-relaxed">
                If an account exists for{" "}
                <strong className="text-[#17211B] dark:text-[#F3F1E8]">{email}</strong>, we have
                sent a link to reset your password. Please check your inbox.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/sign-in"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#DDD7C8] bg-[#FFFFEF] px-4 py-3 text-sm font-bold text-[#17211B] hover:bg-[#E8EDE6] dark:border-[#2B3B32] dark:bg-[#17211B] dark:text-[#F3F1E8]"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Sign In
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button
              type="submit"
              className="w-full rounded-full bg-[#5E8C61] hover:bg-[#4E7651] text-[#FFFFEF] font-bold py-6 shadow-sm transition-transform hover:scale-[1.01]"
              disabled={loading}
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </Button>
            <p className="text-center text-sm text-[#5C665F] dark:text-[#8A9E90]">
              Remember your password?{" "}
              <Link
                href="/sign-in"
                className="font-bold text-[#5E8C61] hover:underline dark:text-[#A7C8A3]"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
