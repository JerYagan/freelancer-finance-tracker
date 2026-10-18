"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { sendVerificationEmail } from "@/lib/auth-client";
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
import { CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const urlError = searchParams.get("error");

  const [verifying, setVerifying] = useState(Boolean(token));
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError ? "The verification link is invalid or has expired." : null,
  );

  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    async function executeVerification() {
      try {
        const response = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token!)}`,
          {
            method: "GET",
          },
        );

        if (!isMounted) return;

        if (response.ok) {
          setVerified(true);
          setVerifying(false);
          setTimeout(() => {
            router.push("/dashboard");
          }, 2500);
        } else {
          const body = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          setError(
            body?.message ||
              "The verification link is invalid or has expired. Please request a new one.",
          );
          setVerifying(false);
        }
      } catch {
        if (!isMounted) return;
        setError("Failed to verify email. Please try again.");
        setVerifying(false);
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail) return;

    setResending(true);
    setResendSuccess(false);

    try {
      const res = await sendVerificationEmail({
        email: resendEmail,
        callbackURL: "/dashboard",
      });

      if (res.error) {
        setError(res.error.message || "Failed to resend verification email.");
      } else {
        setResendSuccess(true);
        setError(null);
      }
    } catch {
      setError("An unexpected error occurred while resending.");
    } finally {
      setResending(false);
    }
  }

  if (verifying) {
    return (
      <Card className="w-full rounded-3xl border-2 border-[#DDD7C8] bg-[#FFFFEF] shadow-md dark:border-[#2B3B32] dark:bg-[#17211B] text-center">
        <CardHeader className="space-y-1.5 pb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8]">
            Verifying Email
          </h1>
          <CardDescription className="text-sm text-[#5C665F] dark:text-[#8A9E90]">
            Please wait while we confirm your email address...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2
            className="text-[#5E8C61] h-8 w-8 animate-spin"
            aria-label="Loading"
          />
        </CardContent>
      </Card>
    );
  }

  if (verified) {
    return (
      <Card className="w-full rounded-3xl border-2 border-[#DDD7C8] bg-[#FFFFEF] shadow-md dark:border-[#2B3B32] dark:bg-[#17211B]">
        <CardHeader className="space-y-1.5 pb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8]">
            Email Verified
          </h1>
          <CardDescription className="text-sm text-[#5C665F] dark:text-[#8A9E90]">
            Your email has been verified successfully
          </CardDescription>
        </CardHeader>
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
              <p className="font-bold">Verification complete</p>
              <p className="text-xs text-[#5C665F] dark:text-[#8A9E90] leading-relaxed">
                Thank you for verifying your email. You are now being redirected
                to your dashboard...
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center rounded-full bg-[#5E8C61] hover:bg-[#4E7651] text-[#FFFFEF] font-bold py-3 text-sm shadow-sm"
            >
              Continue to Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full rounded-3xl border-2 border-[#DDD7C8] bg-[#FFFFEF] shadow-md dark:border-[#2B3B32] dark:bg-[#17211B]">
      <CardHeader className="space-y-1.5 pb-4">
        <div className="flex items-center gap-2">
          <Mail className="text-[#5E8C61] dark:text-[#A7C8A3] h-5 w-5" />
          <h1 className="text-2xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8]">
            Verify Your Email
          </h1>
        </div>
        <CardDescription className="text-sm text-[#5C665F] dark:text-[#8A9E90]">
          Confirm your email address to secure your account
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div
            role="alert"
            className="bg-destructive/10 text-destructive flex items-start gap-2.5 rounded-md p-3 text-sm"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <p>{error}</p>
          </div>
        )}

        {resendSuccess && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <p>Verification link sent! Please check your inbox.</p>
          </div>
        )}

        <form onSubmit={handleResend} className="space-y-3 pt-2">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Did not receive the email or has your link expired? Enter your email
            address below to receive a new verification link:
          </p>
          <div className="space-y-2">
            <Label htmlFor="resend-email">Account Email</Label>
            <Input
              id="resend-email"
              type="email"
              placeholder="you@example.com"
              required
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              disabled={resending}
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-full bg-[#5E8C61] hover:bg-[#4E7651] text-[#FFFFEF] font-bold py-6 shadow-sm transition-transform hover:scale-[1.01]"
            disabled={resending}
          >
            {resending ? "Sending..." : "Resend Verification Email"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-[#DDD7C8]/70 pt-4 dark:border-[#2B3B32]/70">
        <p className="text-sm text-[#5C665F] dark:text-[#8A9E90]">
          <Link
            href="/sign-in"
            className="font-bold text-[#5E8C61] hover:underline dark:text-[#A7C8A3]"
          >
            Back to Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}
