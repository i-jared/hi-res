import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, startTransition } from "react";
import {
  createTeam,
  addTeamMember,
  getTeam,
  Team,
  TeamMember,
  TeamInvite,
  subscribeToTeamMembers,
  subscribeToTeamInvites,
  createTeamInvite,
  updateTeamInvite,
  deleteTeamInvite,
  removeTeamMember,
} from "@/lib/firebase/collections";
import { collectionGroup, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export function useUserTeams(userId: string | undefined) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const setupSubscription = () => {
      const membersQuery = query(
        collectionGroup(db, "members"),
        where("user_id", "==", userId)
      );

      unsubscribe = onSnapshot(
        membersQuery,
        async (snapshot) => {
          if (!isMounted) return;

          const members = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as TeamMember & { id: string })
          );

          const teamPromises = members.map((member) => getTeam(member.team_id));
          const fetchedTeams = await Promise.all(teamPromises);
          const validTeams = fetchedTeams.filter(
            (team): team is Team => team !== null
          );
          setTeams(validTeams);
          setIsLoading(false);
        },
        (error) => {
          if (!isMounted) return;

          if (error.code === "failed-precondition") {
            console.warn("Firestore index not yet built. Teams will appear once index is ready. Check Firebase Console to see build status.");
            console.warn(error.message); // This usually contains the link to create the index
          } else {
            console.error("Error fetching teams:", error);
          }
          setTeams([]);
          setIsLoading(false);
        }
      );
    };

    startTransition(() => {
      setIsLoading(true);
      setTeams([]);
    });
    setupSubscription();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  if (!userId) {
    return { data: [], isLoading: false };
  }

  return { data: teams, isLoading };
}

export function useTeamMembers(teamId: string | null) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!teamId) {
      startTransition(() => {
        setMembers([]);
      });
      return;
    }

    startTransition(() => {
      setIsLoading(true);
    });
    const unsubscribe = subscribeToTeamMembers(teamId, (data) => {
      startTransition(() => {
        setMembers(data);
        setIsLoading(false);
      });
    });

    return () => unsubscribe();
  }, [teamId]);

  return { data: members, isLoading };
}

export function useCreateTeam() {
  return useMutation({
    mutationFn: async ({
      name,
      userId,
      email,
    }: {
      name: string;
      userId: string;
      email?: string;
    }) => {
      const teamId = crypto.randomUUID();
      await createTeam(teamId, { name });
      await addTeamMember(teamId, userId, {
        user_id: userId,
        email,
        role: "owner",
      });
      return teamId;
    },
  });
}

export function useTeamInvites(teamId: string | null) {
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!teamId) {
      setInvites([]);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToTeamInvites(teamId, (data) => {
      startTransition(() => {
        setInvites(data);
        setIsLoading(false);
      });
    });

    return () => unsubscribe();
  }, [teamId]);

  return { data: invites, isLoading };
}

export function useMyInvites(email: string | undefined | null) {
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!email) {
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const setupSubscription = () => {
      const invitesQuery = query(
        collectionGroup(db, "invites"),
        where("email", "==", email),
        where("status", "==", "pending")
      );

      unsubscribe = onSnapshot(
        invitesQuery,
        (snapshot) => {
          if (!isMounted) return;

          // team_name is now stored directly in the invite document
          const invitesData = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as TeamInvite)
          );

          setInvites(invitesData);
          setIsLoading(false);
        },
        (error) => {
          if (!isMounted) return;
          
          if (error.code === "failed-precondition") {
            console.warn("Firestore index not yet built for Invites. Invites will appear once index is ready. Check Firebase Console to see build status.");
            console.warn(error.message); // This usually contains the link to create the index
          } else {
            console.error("Error fetching invites:", error);
          }
          setIsLoading(false);
        }
      );
    };

    startTransition(() => {
      setIsLoading(true);
      setInvites([]);
    });
    setupSubscription();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [email]);

  return { data: invites, isLoading };
}

export function useCreateInvite() {
  return useMutation({
    mutationFn: async ({
      teamId,
      teamName,
      email,
      invitedBy,
    }: {
      teamId: string;
      teamName: string;
      email: string;
      invitedBy: string;
    }) => {
      const inviteId = crypto.randomUUID();
      await createTeamInvite(teamId, inviteId, {
        email,
        team_name: teamName,
        invited_by: invitedBy,
      });
      return inviteId;
    },
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: async ({
      inviteId,
      teamId,
      userId,
      email,
    }: {
      inviteId: string;
      teamId: string;
      userId: string;
      email: string;
    }) => {
      // 1. Add user to team
      await addTeamMember(teamId, userId, {
        user_id: userId,
        email,
        role: "member",
        invite_id: inviteId,
      });

      // 2. Update invite status
      await updateTeamInvite(teamId, inviteId, {
        status: "accepted",
      });
    },
  });
}

export function useRejectInvite() {
  return useMutation({
    mutationFn: async ({
      inviteId,
      teamId,
    }: {
      inviteId: string;
      teamId: string;
    }) => {
      await updateTeamInvite(teamId, inviteId, {
        status: "rejected",
      });
    },
  });
}

export function useDeleteInvite() {
  return useMutation({
    mutationFn: async ({
      inviteId,
      teamId,
    }: {
      inviteId: string;
      teamId: string;
    }) => {
      await deleteTeamInvite(teamId, inviteId);
    },
  });
}

export function useRemoveMember() {
  return useMutation({
    mutationFn: async ({
      memberId,
      teamId,
    }: {
      memberId: string;
      teamId: string;
    }) => {
      await removeTeamMember(teamId, memberId);
    },
  });
}
