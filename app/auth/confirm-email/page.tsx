"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useConfirmEmail } from "@/lib/hooks/use-auth-mutations";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const confirmEmailMutation = useConfirmEmail();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const oobCode = searchParams.get("oobCode");
    const mode = searchParams.get("mode");

    if (!oobCode || mode !== "verifyEmail") {
      setStatus("error");
      setError("Invalid confirmation link");
      return;
    }

    const handleConfirm = async () => {
      try {
        await confirmEmailMutation.mutateAsync(oobCode);
        setStatus("success");
      } catch (err: unknown) {
        setStatus("error");
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to confirm email. The link may have expired.");
        }
      }
    };

    handleConfirm();
  }, [searchParams, confirmEmailMutation]);

  return (
    <>
      {status === "loading" && (
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-zinc-400">
            Confirming your email...
          </p>
        </div>
      )}
      {status === "success" && (
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            Email confirmed successfully! You can now sign in to your account.
          </div>
          <Link
            href="/auth/login"
            className="block w-full rounded-md bg-black px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Go to login
          </Link>
        </div>
      )}
      {status === "error" && (
        <div className="space-y-4">
          <div className="rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error || "Failed to confirm email"}
          </div>
          <div className="space-y-2">
            <Link
              href="/auth/login"
              className="block w-full rounded-md bg-black px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              Go to login
            </Link>
            <Link
              href="/auth/signup"
              className="block text-center text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Create a new account
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function ConfirmEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-black dark:text-zinc-50">
            Email Confirmation
          </h2>
        </div>
        <Suspense
          fallback={
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-gray-600 dark:text-zinc-400">
                Loading...
              </p>
            </div>
          }
        >
          <ConfirmEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
