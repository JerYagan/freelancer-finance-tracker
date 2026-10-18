"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
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
import { CheckCircle2, AlertCircle } from "lucide-react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const reset = searchParams.get("reset");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverified(false);
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        if (
          result.error.code === "EMAIL_NOT_VERIFIED" ||
          result.error.message?.toLowerCase().includes("verify your email")
        ) {
          setUnverified(true);
          setError("Your email address has not been verified yet.");
        } else {
          setError(
            result.error.message ||
              "Failed to sign in. Check your credentials.",
          );
        }
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full rounded-3xl border-2 border-[#DDD7C8] bg-[#FFFFEF] shadow-md dark:border-[#2B3B32] dark:bg-[#17211B]">
      <CardHeader className="space-y-1.5 pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#17211B] dark:text-[#F3F1E8]">
          Sign in to Tally
        </h1>
        <CardDescription className="text-sm text-[#5C665F] dark:text-[#8A9E90]">
          Enter your email and password to access your cash flow
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {verified && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <p>Email verified successfully! You can now sign in.</p>
            </div>
          )}

          {reset && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <p>
                Password updated successfully! Please sign in with your new
                password.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="bg-destructive/10 text-destructive flex items-start gap-2.5 rounded-md p-3 text-sm font-medium"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p>{error}</p>
                {unverified && (
                  <p className="text-xs">
                    <Link
                      href="/verify-email"
                      className="hover:text-destructive/80 underline"
                    >
                      Click here to request a new verification link
                    </Link>
                  </p>
                )}
              </div>
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
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#5E8C61] hover:underline dark:text-[#A7C8A3]"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-2">
          <Button
            type="submit"
            className="w-full rounded-full bg-[#5E8C61] hover:bg-[#4E7651] text-[#FFFFEF] font-bold py-6 shadow-sm transition-transform hover:scale-[1.01]"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In to Tally"}
          </Button>
          <p className="text-center text-sm text-[#5C665F] dark:text-[#8A9E90]">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="font-bold text-[#5E8C61] hover:underline dark:text-[#A7C8A3]"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function SignInPage() {
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
      <SignInForm />
    </Suspense>
  );
}
