"use client";

import { useState } from "react";
import Link from "next/link";
import { useResetPassword } from "@/lib/hooks/use-auth-mutations";

export default function ResetPasswordPage() {
  const resetPasswordMutation = useResetPassword();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      await resetPasswordMutation.mutateAsync(email);
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-black dark:text-zinc-50">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-zinc-400">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>
        {success ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              Password reset email sent! Please check your inbox and follow the
              instructions to reset your password.
            </div>
            <Link
              href="/auth/login"
              className="block text-center text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
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
              <button
                type="submit"
                disabled={resetPasswordMutation.isPending}
                className="flex w-full justify-center rounded-sm bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 focus:outline-none disabled:opacity-50 dark:bg-black dark:text-white dark:hover:bg-black/80"
              >
                {resetPasswordMutation.isPending
                  ? "Sending..."
                  : "Send reset link"}
              </button>
            </div>
            <div className="text-center text-sm">
              <Link
                href="/auth/login"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
