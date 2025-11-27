import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllCollections,
  getCollectionsByTeam,
  createCollection,
  updateCollection,
  deleteCollection,
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

export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      data,
    }: {
      collectionId: string;
      data: Partial<Pick<Collection, "name">>;
    }) => {
      await updateCollection(collectionId, data);
      return { collectionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collectionId, teamId }: { collectionId: string; teamId: string }) => {
      await deleteCollection(collectionId);
      return { collectionId, teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["collections", result.teamId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

