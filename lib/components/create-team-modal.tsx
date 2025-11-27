"use client";

import { useState } from "react";
import { useCreateTeam } from "@/lib/hooks/use-team-queries";

interface CreateTeamFormProps {
  userId: string;
  onCancel: () => void;
}

export function CreateTeamForm({ userId, onCancel }: CreateTeamFormProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const createTeamMutation = useCreateTeam();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Team name is required");
      return;
    }

    try {
      await createTeamMutation.mutateAsync({ name: name.trim(), userId });
      setName("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create team");
      }
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="mb-4 text-xl font-bold text-black dark:text-zinc-50">
        Create Team
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="team-name"
            className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
          >
            Team Name
          </label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="mt-1 block w-full rounded-sm border border-white/20 bg-black px-3 py-2 text-white focus:border-white focus:outline-none dark:border-white/20 dark:bg-black dark:text-white"
            placeholder="Enter team name"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80 dark:text-white dark:hover:bg-black/80"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createTeamMutation.isPending}
            className="rounded-sm bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80 disabled:opacity-50 dark:bg-black dark:hover:bg-black/80"
          >
            {createTeamMutation.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

