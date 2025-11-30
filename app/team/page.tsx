"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/lib/hooks/use-firebase-auth";
import {
  useUserTeams,
  useTeamMembers,
  useCreateInvite,
  useTeamInvites,
  useDeleteInvite,
  useRemoveMember,
} from "@/lib/hooks/use-team-queries";
import { useSettings, useUpdateSettings } from "@/lib/hooks/use-settings-queries";
import { NotificationBell } from "@/lib/components/notification-bell";
import { CreateTeamForm } from "@/lib/components/create-team-modal";

function KebabMenu({ items }: { items: { label: string; onClick: () => void }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-1 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-8 z-10 min-w-[160px] rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-black hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const { data: teams, isLoading: teamsLoading } = useUserTeams(user?.uid);
  const { data: settings } = useSettings(user?.uid);
  const updateSettings = useUpdateSettings();
  
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  // Use settings.current_team_id as the source of truth, fallback to first team
  const selectedTeamId = settings?.current_team_id || (teams && teams.length > 0 ? teams[0].id : null);

  // Update settings if we have teams but no current_team_id selected
  useEffect(() => {
    if (user && teams && teams.length > 0 && !settings?.current_team_id) {
      updateSettings.mutate({
        userId: user.uid,
        data: { current_team_id: teams[0].id },
      });
    }
  }, [user, teams, settings?.current_team_id, updateSettings]);

  const handleTeamSelect = (teamId: string) => {
    if (!user) return;
    updateSettings.mutate({
      userId: user.uid,
      data: { current_team_id: teamId },
    });
  };

  if (loading || teamsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-black dark:bg-black dark:text-white">
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
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
          <NotificationBell />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Team Selection Sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                Your Teams
              </h2>
              <button
                onClick={() => setShowCreateTeam(true)}
                className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                + New Team
              </button>
            </div>
            {teams && teams.length > 0 ? (
              <div className="space-y-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => handleTeamSelect(team.id)}
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
              <div className="space-y-8">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-black dark:text-zinc-50">
                      {selectedTeam.name} Members
                    </h2>
                  </div>
                  <InviteMember teamId={selectedTeam.id} teamName={selectedTeam.name} userId={user.uid} />
                </div>
                
                <PendingInvites teamId={selectedTeam.id} userId={user.uid} />
                
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
                    Active Members
                  </h3>
                  <TeamMembersList teamId={selectedTeam.id} userId={user.uid} />
                </div>
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

      {showCreateTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-sm border border-white/20 bg-white p-6 dark:bg-black">
            <CreateTeamForm
              userId={user.uid}
              userEmail={user.email}
              onCancel={() => setShowCreateTeam(false)}
              onSuccess={(teamId) => {
                setShowCreateTeam(false);
                handleTeamSelect(teamId);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InviteMember({ teamId, teamName, userId }: { teamId: string; teamName: string; userId: string }) {
  const [email, setEmail] = useState("");
  const createInvite = useCreateInvite();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      await createInvite.mutateAsync({
        teamId,
        teamName,
        email: email.trim(),
        invitedBy: userId,
      });
      setEmail("");
    } catch (error) {
      console.error("Failed to invite member:", error);
    }
  };

  return (
    <div className="rounded-sm border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
        Invite New Member
      </h3>
      <form onSubmit={handleInvite} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
          required
          className="flex-1 rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2 text-black focus:border-black focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
        />
        <button
          type="submit"
          disabled={createInvite.isPending}
          className="rounded-sm bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {createInvite.isPending ? "Inviting..." : "Invite"}
        </button>
      </form>
    </div>
  );
}

function PendingInvites({ teamId, userId }: { teamId: string; userId: string }) {
  const { data: invites, isLoading } = useTeamInvites(teamId);
  const { data: members } = useTeamMembers(teamId);
  const deleteInvite = useDeleteInvite();
  
  const pendingInvites = invites?.filter((invite) => invite.status === "pending");
  const currentUserMember = members?.find((m) => m.user_id === userId);
  const isOwner = currentUserMember?.role === "owner";

  if (isLoading) return null;
  if (!pendingInvites || pendingInvites.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
        Pending Invites
      </h3>
      <div className="divide-y divide-zinc-200 border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {pendingInvites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between p-4">
            <span className="font-medium text-black dark:text-zinc-50">
              {invite.email}
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                Pending
              </span>
              {isOwner && (
                <KebabMenu
                  items={[
                    {
                      label: "Delete Invite",
                      onClick: () => {
                        if (confirm("Are you sure you want to delete this invite?")) {
                          deleteInvite.mutate({ teamId, inviteId: invite.id });
                        }
                      },
                    },
                  ]}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamMembersList({ teamId, userId }: { teamId: string; userId: string }) {
  const { data: members, isLoading } = useTeamMembers(teamId);
  const { data: invites } = useTeamInvites(teamId);
  const { user } = useFirebaseAuth();
  const removeMember = useRemoveMember();
  
  const currentUserMember = members?.find((m) => m.user_id === userId);
  const isOwner = currentUserMember?.role === "owner";

  const getMemberEmail = (member: typeof members[0]) => {
    if (member.email) {
      return member.email;
    }
    if (member.user_id === userId && user?.email) {
      return user.email;
    }
    if (member.invite_id) {
      const invite = invites?.find((inv) => inv.id === member.invite_id);
      return invite?.email;
    }
    return null;
  };

  if (isLoading) {
    return <div className="text-zinc-500 dark:text-zinc-400">Loading members...</div>;
  }

  if (!members || members.length === 0) {
    return <div className="text-zinc-500 dark:text-zinc-400">No members found.</div>;
  }

  return (
    <div className="divide-y divide-zinc-200 border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {members.map((member) => {
        const isCurrentUser = member.user_id === userId;
        const canRemove = isOwner && !isCurrentUser;
        const email = getMemberEmail(member);
        
        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-4"
          >
            <div className="flex flex-col">
              <span className="font-medium text-black dark:text-zinc-50">
                {email || member.user_id}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Joined: {member.joined_at?.toDate().toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {member.role || "member"}
              </span>
              {canRemove && (
                <KebabMenu
                  items={[
                    {
                      label: "Remove Member",
                      onClick: () => {
                        if (confirm("Are you sure you want to remove this member?")) {
                          removeMember.mutate({ teamId, memberId: member.id });
                        }
                      },
                    },
                  ]}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
