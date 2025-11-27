"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/lib/hooks/use-firebase-auth";
import { useUserTeams, useTeamMembers } from "@/lib/hooks/use-team-queries";
import { Team } from "@/lib/firebase/collections";

export default function TeamPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const { data: teams, isLoading: teamsLoading } = useUserTeams(user?.uid);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  if (loading || teamsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black text-black dark:text-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  const selectedTeam = teams?.find((t) => t.id === selectedTeamId);

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <div className="relative mx-auto max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
            Teams
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Team Selection Sidebar */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
              Your Teams
            </h2>
            {teams && teams.length > 0 ? (
              <div className="space-y-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`w-full rounded-sm border p-4 text-left transition-colors ${
                      selectedTeamId === team.id
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-zinc-200 bg-white text-black hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 dark:text-zinc-400">
                No teams found.
              </p>
            )}
          </div>

          {/* Members View */}
          <div className="md:col-span-2">
            {selectedTeam ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-black dark:text-zinc-50">
                    {selectedTeam.name} Members
                  </h2>
                </div>
                <TeamMembersList teamId={selectedTeam.id} />
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-sm border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="text-zinc-500 dark:text-zinc-400">
                  Select a team to view members
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamMembersList({ teamId }: { teamId: string }) {
  const { data: members, isLoading } = useTeamMembers(teamId);

  if (isLoading) {
    return <div className="text-zinc-500 dark:text-zinc-400">Loading members...</div>;
  }

  if (!members || members.length === 0) {
    return <div className="text-zinc-500 dark:text-zinc-400">No members found.</div>;
  }

  return (
    <div className="divide-y divide-zinc-200 border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-4"
        >
          <div className="flex flex-col">
            <span className="font-medium text-black dark:text-zinc-50">
              User ID: {member.user_id}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Joined: {member.joined_at?.toDate().toLocaleDateString()}
            </span>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            {member.role || "member"}
          </span>
        </div>
      ))}
    </div>
  );
}

