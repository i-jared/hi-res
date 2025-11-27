import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllCollections,
  getCollectionsByTeam,
  createCollection,
  Collection,
} from "@/lib/firebase/collections";

export function useCollections(teamId?: string) {
  return useQuery({
    queryKey: ["collections", teamId],
    queryFn: async () => {
      if (teamId) {
        return getCollectionsByTeam(teamId);
      }
      return getAllCollections();
    },
    enabled: !!teamId,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, teamId }: { name: string; teamId: string }) => {
      const collectionId = crypto.randomUUID();
      await createCollection(collectionId, { name, team_id: teamId });
      return collectionId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections", variables.teamId] });
    },
  });
}

