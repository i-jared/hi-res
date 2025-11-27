"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn } from "@/lib/hooks/use-auth-mutations";
import { useFirebaseAuth } from "@/lib/hooks/use-firebase-auth";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useFirebaseAuth();
  const signInMutation = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await signInMutation.mutateAsync({ email, password });
      router.push("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred during sign in");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-black dark:text-zinc-50">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-sm border border-white/20 bg-black px-3 py-2 text-white focus:border-white focus:outline-none dark:border-white/20 dark:bg-black dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-sm border border-white/20 bg-black px-3 py-2 text-white focus:border-white focus:outline-none dark:border-white/20 dark:bg-black dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                href="/auth/reset-password"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={signInMutation.isPending}
              className="flex w-full justify-center rounded-sm bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 focus:outline-none disabled:opacity-50 dark:bg-black dark:text-white dark:hover:bg-black/80"
            >
              {signInMutation.isPending ? "Signing in..." : "Sign in"}
            </button>
          </div>
          <div className="text-center text-sm">
            <Link
              href="/auth/signup"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
