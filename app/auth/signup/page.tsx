"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignUp } from "@/lib/hooks/use-auth-mutations";
import { useFirebaseAuth } from "@/lib/hooks/use-firebase-auth";
import { sendVerificationEmail } from "@/lib/firebase";

export default function SignUpPage() {
  const router = useRouter();
  const { user } = useFirebaseAuth();
  const signUpMutation = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
    setSuccess(false);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      const result = await signUpMutation.mutateAsync({ email, password });
      await sendVerificationEmail(result.user);
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred during sign up");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-black dark:text-zinc-50">
            Create an account
          </h2>
        </div>
        {success ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              Account created! Please check your email to verify your account.
            </div>
            <Link
              href="/auth/login"
              className="block text-center text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Go to login
            </Link>
          </div>
        ) : (
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
                <div className="relative mt-1">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-sm border border-white/20 bg-black px-3 py-2 pr-10 text-white focus:border-white focus:outline-none dark:border-white/20 dark:bg-black dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-white hover:text-white/80 dark:text-white dark:hover:text-white/80"
                  >
                    {showPassword ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={signUpMutation.isPending}
                className="flex w-full justify-center rounded-sm bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 focus:outline-none disabled:opacity-50 dark:bg-black dark:text-white dark:hover:bg-black/80"
              >
                {signUpMutation.isPending ? "Creating account..." : "Sign up"}
              </button>
            </div>
            <div className="text-center text-sm">
              <Link
                href="/auth/login"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
