"use client";

import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/lib/hooks/use-firebase-auth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();

  const handleActivate = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/auth/login");
    }
  };

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden">
      <div
        className="h-full w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/hero-image.jpg')",
          backgroundColor: "#1a1a1a",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
      </div>
      {!loading && (
        <button
          onClick={handleActivate}
          className="absolute right-4 top-4 z-10 rounded-sm bg-black px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80 dark:bg-black dark:text-white dark:hover:bg-black/80"
        >
          Activate
        </button>
      )}
    </div>
  );
}
