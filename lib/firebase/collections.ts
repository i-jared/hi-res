import { Timestamp, serverTimestamp, orderBy, where } from "firebase/firestore";
import {
  getDocument,
  getDocuments,
  getCollectionGroup,
  createDocument,
  updateDocument,
  deleteDocument,
  subscribeToDocument,
  subscribeToDocuments,
} from "./firestore";

// Types
export interface Collection {
  id: string;
  name?: string;
  team_id: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface Document {
  id: string;
  collection_id: string;
  team_id?: string;
  banner_image: string; // Path to image in Firebase Storage
  title: string;
  author: string;
  created_at: Timestamp;
  content: string; // Markdown content
  updated_at?: Timestamp;
}

export interface Team {
  id: string;
  name: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role?: string; // e.g., "owner", "admin", "member"
  joined_at: Timestamp;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  invited_by: string; // User ID of the person who sent the invite
  status: "pending" | "accepted" | "rejected";
  created_at: Timestamp;
  expires_at?: Timestamp;
}

// Collection functions
export const getCollection = async (collectionId: string) => {
  return getDocument<Collection>("collections", collectionId);
};

export const getAllCollections = async () => {
  return getDocuments<Collection>("collections", orderBy("created_at", "desc"));
};

export const getCollectionsByTeam = async (teamId: string) => {
  return getDocuments<Collection>(
    "collections",
    where("team_id", "==", teamId),
    orderBy("created_at", "desc")
  );
};

export const createCollection = async (
  collectionId: string,
  data: Omit<Collection, "id" | "created_at" | "updated_at">
) => {
  return createDocument<Collection>("collections", collectionId, {
    ...data,
    created_at: serverTimestamp() as Timestamp,
    updated_at: serverTimestamp() as Timestamp,
  });
};

export const updateCollection = async (
  collectionId: string,
  data: Partial<Omit<Collection, "id" | "created_at">>
) => {
  return updateDocument<Collection>("collections", collectionId, {
    ...data,
    updated_at: serverTimestamp() as Timestamp,
  });
};

export const deleteCollection = async (collectionId: string) => {
  return deleteDocument("collections", collectionId);
};

export const subscribeToCollection = (
  collectionId: string,
  callback: (data: Collection | null) => void
) => {
  return subscribeToDocument<Collection>("collections", collectionId, callback);
};

export const subscribeToAllCollections = (
  callback: (data: Collection[]) => void
) => {
  return subscribeToDocuments<Collection>(
    "collections",
    callback,
    orderBy("created_at", "desc")
  );
};

// Document functions (documents are subcollections under collections)
export const getDocumentInCollection = async (
  collectionId: string,
  documentId: string
) => {
  return getDocument<Document>(
    `collections/${collectionId}/documents`,
    documentId
  );
};

export const getDocumentsInCollection = async (collectionId: string) => {
  return getDocuments<Document>(
    `collections/${collectionId}/documents`,
    orderBy("created_at", "desc")
  );
};

export const createDocumentInCollection = async (
  collectionId: string,
  documentId: string,
  data: Omit<Document, "id" | "collection_id" | "created_at" | "updated_at">
) => {
  return createDocument<Document>(
    `collections/${collectionId}/documents`,
    documentId,
    {
      ...data,
      collection_id: collectionId,
      created_at: serverTimestamp() as Timestamp,
      updated_at: serverTimestamp() as Timestamp,
    }
  );
};

export const updateDocumentInCollection = async (
  collectionId: string,
  documentId: string,
  data: Partial<
    Omit<Document, "id" | "collection_id" | "created_at" | "updated_at">
  >
) => {
  return updateDocument<Document>(
    `collections/${collectionId}/documents`,
    documentId,
    {
      ...data,
      updated_at: serverTimestamp() as Timestamp,
    }
  );
};

export const deleteDocumentInCollection = async (
  collectionId: string,
  documentId: string
) => {
  return deleteDocument(`collections/${collectionId}/documents`, documentId);
};

export const subscribeToDocumentInCollection = (
  collectionId: string,
  documentId: string,
  callback: (data: Document | null) => void
) => {
  return subscribeToDocument<Document>(
    `collections/${collectionId}/documents`,
    documentId,
    callback
  );
};

export const subscribeToDocumentsInCollection = (
  collectionId: string,
  callback: (data: Document[]) => void
) => {
  return subscribeToDocuments<Document>(
    `collections/${collectionId}/documents`,
    callback,
    orderBy("created_at", "desc")
  );
};

// Helper function to get documents by author across all collections
export const getDocumentsByAuthor = async (author: string) => {
  return getCollectionGroup<Document>(
    "documents",
    where("author", "==", author),
    orderBy("created_at", "desc")
  );
};

// Helper function to get documents by team_id across all collections
export const getDocumentsByTeam = async (teamId: string) => {
  return getCollectionGroup<Document>(
    "documents",
    where("team_id", "==", teamId),
    orderBy("created_at", "desc")
  );
};

// Team functions
export const getTeam = async (teamId: string) => {
  return getDocument<Team>("teams", teamId);
};

export const getAllTeams = async () => {
  return getDocuments<Team>("teams", orderBy("created_at", "desc"));
};

export const createTeam = async (
  teamId: string,
  data: Omit<Team, "id" | "created_at" | "updated_at">
) => {
  return createDocument<Team>("teams", teamId, {
    ...data,
    created_at: serverTimestamp() as Timestamp,
    updated_at: serverTimestamp() as Timestamp,
  });
};

export const updateTeam = async (
  teamId: string,
  data: Partial<Omit<Team, "id" | "created_at">>
) => {
  return updateDocument<Team>("teams", teamId, {
    ...data,
    updated_at: serverTimestamp() as Timestamp,
  });
};

export const deleteTeam = async (teamId: string) => {
  return deleteDocument("teams", teamId);
};

export const subscribeToTeam = (
  teamId: string,
  callback: (data: Team | null) => void
) => {
  return subscribeToDocument<Team>("teams", teamId, callback);
};

export const subscribeToAllTeams = (
  callback: (data: Team[]) => void
) => {
  return subscribeToDocuments<Team>(
    "teams",
    callback,
    orderBy("created_at", "desc")
  );
};

// Team Member functions (members are subcollections under teams)
export const getTeamMember = async (teamId: string, memberId: string) => {
  return getDocument<TeamMember>(
    `teams/${teamId}/members`,
    memberId
  );
};

export const getTeamMembers = async (teamId: string) => {
  return getDocuments<TeamMember>(
    `teams/${teamId}/members`,
    orderBy("joined_at", "desc")
  );
};

export const addTeamMember = async (
  teamId: string,
  memberId: string,
  data: Omit<TeamMember, "id" | "team_id" | "joined_at">
) => {
  return createDocument<TeamMember>(
    `teams/${teamId}/members`,
    memberId,
    {
      ...data,
      team_id: teamId,
      joined_at: serverTimestamp() as Timestamp,
    }
  );
};

export const updateTeamMember = async (
  teamId: string,
  memberId: string,
  data: Partial<Omit<TeamMember, "id" | "team_id" | "joined_at">>
) => {
  return updateDocument<TeamMember>(
    `teams/${teamId}/members`,
    memberId,
    data
  );
};

export const removeTeamMember = async (teamId: string, memberId: string) => {
  return deleteDocument(`teams/${teamId}/members`, memberId);
};

export const subscribeToTeamMembers = (
  teamId: string,
  callback: (data: TeamMember[]) => void
) => {
  return subscribeToDocuments<TeamMember>(
    `teams/${teamId}/members`,
    callback,
    orderBy("joined_at", "desc")
  );
};

// Helper function to get teams by member user_id
export const getTeamsByMember = async (userId: string) => {
  return getCollectionGroup<TeamMember>(
    "members",
    where("user_id", "==", userId)
  );
};

// Team Invite functions (invites are subcollections under teams)
export const getTeamInvite = async (teamId: string, inviteId: string) => {
  return getDocument<TeamInvite>(
    `teams/${teamId}/invites`,
    inviteId
  );
};

export const getTeamInvites = async (teamId: string) => {
  return getDocuments<TeamInvite>(
    `teams/${teamId}/invites`,
    orderBy("created_at", "desc")
  );
};

export const createTeamInvite = async (
  teamId: string,
  inviteId: string,
  data: Omit<TeamInvite, "id" | "team_id" | "created_at" | "status">
) => {
  return createDocument<TeamInvite>(
    `teams/${teamId}/invites`,
    inviteId,
    {
      ...data,
      team_id: teamId,
      status: "pending",
      created_at: serverTimestamp() as Timestamp,
    }
  );
};

export const updateTeamInvite = async (
  teamId: string,
  inviteId: string,
  data: Partial<Omit<TeamInvite, "id" | "team_id" | "created_at">>
) => {
  return updateDocument<TeamInvite>(
    `teams/${teamId}/invites`,
    inviteId,
    data
  );
};

export const deleteTeamInvite = async (teamId: string, inviteId: string) => {
  return deleteDocument(`teams/${teamId}/invites`, inviteId);
};

export const subscribeToTeamInvites = (
  teamId: string,
  callback: (data: TeamInvite[]) => void
) => {
  return subscribeToDocuments<TeamInvite>(
    `teams/${teamId}/invites`,
    callback,
    orderBy("created_at", "desc")
  );
};

// Helper function to get invites by email across all teams
export const getInvitesByEmail = async (email: string) => {
  return getCollectionGroup<TeamInvite>(
    "invites",
    where("email", "==", email),
    where("status", "==", "pending"),
    orderBy("created_at", "desc")
  );
};

