"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/lib/hooks/use-firebase-auth";
import { useUserTeams } from "@/lib/hooks/use-team-queries";
import { useCollections } from "@/lib/hooks/use-collection-queries";
import { useDocuments, useDocument } from "@/lib/hooks/use-document-queries";
import { CreateTeamForm } from "@/lib/components/create-team-modal";
import { CreateCollectionPopup } from "@/lib/components/create-collection-popup";
import { CreateDocumentPopup } from "@/lib/components/create-document-popup";
import { DocumentEditor } from "@/lib/components/document-editor";
import { Collection, Document } from "@/lib/firebase/collections";

interface SelectedDocument {
  id: string;
  title: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const { data: teams, isLoading: teamsLoading } = useUserTeams(user?.uid);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCollectionPopup, setShowCollectionPopup] = useState(false);
  const [showDocumentPopup, setShowDocumentPopup] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(
    null
  );
  const [selectedDocument, setSelectedDocument] = useState<SelectedDocument | null>(
    null
  );
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  
  const { data: documentData } = useDocument(
    selectedCollection?.id,
    selectedDocument?.id
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSettingsDropdown &&
        settingsButtonRef.current &&
        dropdownRef.current &&
        !settingsButtonRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettingsDropdown]);

  if (loading || teamsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  const hasTeam = teams && teams.length > 0;

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <div className="relative mx-auto max-w-6xl">
        <div className="flex items-start justify-between">
          <div>
            {selectedDocument ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedDocument(null)}
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
                  {selectedDocument.title}
                </h1>
              </div>
            ) : selectedCollection ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedCollection(null)}
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
                  {selectedCollection.name}
                </h1>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                  Dashboard
                </h1>
                <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                  Welcome, {user.email}
                </p>
              </>
            )}
          </div>
          {hasTeam && (
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  ref={settingsButtonRef}
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                  className="flex items-center justify-center text-black transition-colors hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-400"
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
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.212 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.581-.495.644-.869l.214-1.281z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
                {showSettingsDropdown && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 top-full mt-2 w-32 rounded-sm border border-zinc-200 bg-white py-1 dark:border-zinc-800 dark:bg-black"
                  >
                    <button
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        router.push("/team");
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-black hover:bg-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    >
                      Team
                    </button>
                  </div>
                )}
              </div>
              <button
                ref={addButtonRef}
                onClick={() => {
                  if (selectedCollection) {
                    setShowDocumentPopup(true);
                  } else if (teams && teams.length > 0) {
                    setSelectedTeamId(teams[0].id);
                    setShowCollectionPopup(true);
                  }
                }}
                className="flex items-center justify-center text-black transition-colors hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-400"
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
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {!hasTeam && !selectedCollection && (
          <div className="flex min-h-[60vh] items-center justify-center">
            {showCreateForm ? (
              <CreateTeamForm
                userId={user.uid}
                onCancel={() => setShowCreateForm(false)}
              />
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 text-black transition-colors hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-400"
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
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                <span>Create Team</span>
              </button>
            )}
          </div>
        )}

        {hasTeam && teams && !selectedCollection && (
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {teams.map((team) => (
              <TeamCollectionsSection
                key={team.id}
                teamId={team.id}
                onSelectCollection={setSelectedCollection}
              />
            ))}
          </div>
        )}

        {selectedCollection && !selectedDocument && (
          <CollectionDocumentsSection
            collectionId={selectedCollection.id}
            onSelectDocument={(doc) => setSelectedDocument({ id: doc.id, title: doc.title })}
          />
        )}

        {selectedCollection && selectedDocument && documentData && (
          <div className="mt-8">
            <DocumentEditor
              documentId={selectedDocument.id}
              collectionId={selectedCollection.id}
              initialContent={documentData.content || ""}
            />
          </div>
        )}

        {hasTeam && selectedTeamId && (
          <CreateCollectionPopup
            isOpen={showCollectionPopup}
            onClose={() => {
              setShowCollectionPopup(false);
              setSelectedTeamId(null);
            }}
            buttonRef={addButtonRef}
            teamId={selectedTeamId}
          />
        )}

        {selectedCollection && (
          <CreateDocumentPopup
            isOpen={showDocumentPopup}
            onClose={() => setShowDocumentPopup(false)}
            buttonRef={addButtonRef}
            collectionId={selectedCollection.id}
            onDocumentCreated={(documentId, title) => {
              setSelectedDocument({ id: documentId, title });
            }}
          />
        )}
      </div>
    </div>
  );
}

function TeamCollectionsSection({
  teamId,
  onSelectCollection,
}: {
  teamId: string;
  onSelectCollection: (collection: Collection) => void;
}) {
  const { data: collections, isLoading } = useCollections(teamId);

  if (isLoading || !collections || collections.length === 0) {
    return null;
  }

  return (
    <>
      {collections.map((collection) => (
        <button
          key={collection.id}
          onClick={() => onSelectCollection(collection)}
          className="aspect-square w-full rounded-sm border border-zinc-200 bg-white p-6 text-left shadow-none transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <h3 className="text-lg font-medium text-black dark:text-zinc-50">
            {collection.name || "Unnamed Collection"}
          </h3>
        </button>
      ))}
    </>
  );
}

function CollectionDocumentsSection({
  collectionId,
  onSelectDocument,
}: {
  collectionId: string;
  onSelectDocument: (doc: Document) => void;
}) {
  const { data: documents, isLoading } = useDocuments(collectionId);

  if (isLoading) {
    return <div>Loading documents...</div>;
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center text-zinc-500 dark:text-zinc-400">
          No documents yet.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
      {documents.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelectDocument(doc)}
          className="aspect-square w-full rounded-sm border border-zinc-200 bg-white p-4 text-left shadow-none transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          {doc.banner_image && (
            <div className="mb-3 h-32 w-full overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
              <div className="h-full w-full bg-zinc-200 dark:bg-zinc-800" />
            </div>
          )}
          <h3 className="text-lg font-medium text-black dark:text-zinc-50">
            {doc.title || "Untitled"}
          </h3>
          <p className="mt-2 text-sm text-zinc-500 line-clamp-3 dark:text-zinc-400">
            {doc.content || "No content"}
          </p>
        </button>
      ))}
    </div>
  );
}
