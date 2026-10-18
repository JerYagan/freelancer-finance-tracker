"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
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

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create account.");
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
          Start your Tally account
        </h1>
        <CardDescription className="text-sm text-[#5C665F] dark:text-[#8A9E90]">
          Track income, manage expenses, and see your growth — free forever
        </CardDescription>
      </CardHeader>
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
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Alex Rivera"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoComplete="name"
            />
          </div>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 10 characters"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
            <p className="text-[#5C665F] dark:text-[#8A9E90] text-xs">
              Must be at least 10 characters long
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-2">
          <Button
            type="submit"
            className="w-full rounded-full bg-[#5E8C61] hover:bg-[#4E7651] text-[#FFFFEF] font-bold py-6 shadow-sm transition-transform hover:scale-[1.01]"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
          <p className="text-center text-sm text-[#5C665F] dark:text-[#8A9E90]">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-bold text-[#5E8C61] hover:underline dark:text-[#A7C8A3]"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
