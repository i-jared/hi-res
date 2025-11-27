import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, startTransition } from "react";
import {
  createTeam,
  addTeamMember,
  getTeam,
  Team,
  TeamMember,
  subscribeToTeamMembers,
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
    }: {
      name: string;
      userId: string;
    }) => {
      const teamId = crypto.randomUUID();
      await createTeam(teamId, { name });
      await addTeamMember(teamId, userId, {
        user_id: userId,
        role: "owner",
      });
      return teamId;
    },
  });
}
