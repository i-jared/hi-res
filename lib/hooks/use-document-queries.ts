import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDocumentsInCollection,
  getDocumentInCollection,
  createDocumentInCollection,
  updateDocumentInCollection,
  deleteDocumentInCollection,
  Document,
} from "@/lib/firebase/collections";
import { useFirebaseAuth } from "@/lib/hooks/use-firebase-auth";

export function useDocuments(collectionId?: string) {
  return useQuery({
    queryKey: ["documents", collectionId],
    queryFn: async () => {
      if (collectionId) {
        return getDocumentsInCollection(collectionId);
      }
      return [];
    },
    enabled: !!collectionId,
  });
}

export function useDocument(collectionId?: string, documentId?: string) {
  return useQuery({
    queryKey: ["document", collectionId, documentId],
    queryFn: async () => {
      if (collectionId && documentId) {
        return getDocumentInCollection(collectionId, documentId);
      }
      return null;
    },
    enabled: !!collectionId && !!documentId,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  const { user } = useFirebaseAuth();

  return useMutation({
    mutationFn: async ({
      title,
      collectionId,
    }: {
      title: string;
      collectionId: string;
    }) => {
      if (!user) throw new Error("User not authenticated");
      
      const documentId = crypto.randomUUID();
      await createDocumentInCollection(collectionId, documentId, {
        title,
        author: user.uid,
        content: "",
        banner_image: "",
      });
      return { documentId, collectionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["documents", result.collectionId],
      });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      documentId,
      data,
    }: {
      collectionId: string;
      documentId: string;
      data: Partial<Pick<Document, "title" | "content" | "banner_image" | "banner_position_grid" | "banner_position_page">>;
    }) => {
      await updateDocumentInCollection(collectionId, documentId, data);
      return { collectionId, documentId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["document", result.collectionId, result.documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["documents", result.collectionId],
      });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      documentId,
    }: {
      collectionId: string;
      documentId: string;
    }) => {
      await deleteDocumentInCollection(collectionId, documentId);
      return { collectionId, documentId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["documents", result.collectionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["document", result.collectionId, result.documentId],
      });
    },
  });
}

