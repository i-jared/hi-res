"use client";

import { useState, useRef, useEffect } from "react";
import { useFirebaseAuth } from "@/lib/hooks/use-firebase-auth";
import {
  useMyInvites,
  useAcceptInvite,
  useRejectInvite,
} from "@/lib/hooks/use-team-queries";

export function NotificationBell() {
  const { user } = useFirebaseAuth();
  const { data: invites, isLoading } = useMyInvites(user?.email);
  const acceptInvite = useAcceptInvite();
  const rejectInvite = useRejectInvite();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!user || isLoading) return null;

  const hasInvites = invites && invites.length > 0;

  if (!hasInvites) return null; // Hide bell if no invites? Or show empty state?
  // The user requirement: "see a notification icon (only if an invite exists)"

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center p-2 text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        aria-label="Notifications"
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
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {hasInvites && (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-black" />
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 rounded-sm border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-black"
        >
          <h3 className="mb-2 px-2 text-sm font-semibold text-black dark:text-zinc-50">
            Invitations
          </h3>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-2 rounded-sm bg-zinc-50 p-3 dark:bg-zinc-900"
              >
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Invited to join{" "}
                  <span className="font-medium text-black dark:text-zinc-50">
                    {invite.team_name || "a team"}
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      acceptInvite.mutate({
                        inviteId: invite.id,
                        teamId: invite.team_id,
                        userId: user.uid,
                        email: invite.email,
                      });
                    }}
                    disabled={acceptInvite.isPending}
                    className="flex-1 rounded-sm bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    {acceptInvite.isPending ? "Accepting..." : "Accept"}
                  </button>
                  <button
                    onClick={() => {
                      rejectInvite.mutate({
                        inviteId: invite.id,
                        teamId: invite.team_id,
                      });
                    }}
                    disabled={rejectInvite.isPending}
                    className="flex-1 rounded-sm border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-black dark:text-white dark:hover:bg-zinc-900"
                  >
                    {rejectInvite.isPending ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

