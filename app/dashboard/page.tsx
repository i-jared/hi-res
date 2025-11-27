"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useFirebaseAuth } from "@/lib/hooks/use-firebase-auth";
import { useUserTeams } from "@/lib/hooks/use-team-queries";
import { useCollections } from "@/lib/hooks/use-collection-queries";
import { useDocuments, useDocument, useUpdateDocument } from "@/lib/hooks/use-document-queries";
import { useUpdateCollection } from "@/lib/hooks/use-collection-queries";
import { useSettings, useUpdateSettings } from "@/lib/hooks/use-settings-queries";
import { CreateTeamForm } from "@/lib/components/create-team-modal";
import { CreateCollectionPopup } from "@/lib/components/create-collection-popup";
import { CreateDocumentPopup } from "@/lib/components/create-document-popup";
import { DocumentEditor } from "@/lib/components/document-editor";
import { FontSelectorModal } from "@/lib/components/font-selector-modal";
import { NotificationBell } from "@/lib/components/notification-bell";
import { Collection, Document, getCollection } from "@/lib/firebase/collections";
import { uploadFile } from "@/lib/firebase/storage";
import { useQuery } from "@tanstack/react-query";

interface SelectedDocument {
  id: string;
  title: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const { data: teams, isLoading: teamsLoading } = useUserTeams(user?.uid);
  const [collectionId, setCollectionId] = useQueryState("collection", {
    clearOnDefault: false,
  });
  const [documentId, setDocumentId] = useQueryState("document", {
    clearOnDefault: false,
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCollectionPopup, setShowCollectionPopup] = useState(false);
  const [showDocumentPopup, setShowDocumentPopup] = useState(false);
  
  // Fetch collection data based on collectionId from URL
  const { data: selectedCollection, isLoading: isLoadingCollection } = useQuery({
    queryKey: ["collection", collectionId],
    queryFn: async () => {
      if (!collectionId) return null;
      return getCollection(collectionId);
    },
    enabled: !!collectionId,
  });

  // Fetch document data based on documentId from URL
  const { data: documentData, isLoading: isLoadingDocument } = useDocument(
    collectionId || undefined,
    documentId || undefined
  );
  
  const selectedDocument: SelectedDocument | null = documentData && documentId
    ? { id: documentId, title: documentData.title }
    : null;
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const kebabMenuRef = useRef<HTMLDivElement>(null);
  const kebabButtonRef = useRef<HTMLButtonElement>(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showCollectionKebabMenu, setShowCollectionKebabMenu] = useState(false);
  const [showCollectionNameModal, setShowCollectionNameModal] = useState(false);
  const [showFontSelector, setShowFontSelector] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [collectionNameValue, setCollectionNameValue] = useState("");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const updateDocumentMutation = useUpdateDocument();
  const updateCollectionMutation = useUpdateCollection();
  const { data: settings } = useSettings(user?.uid);
  const updateSettings = useUpdateSettings();
  const collectionKebabMenuRef = useRef<HTMLDivElement>(null);
  const collectionKebabButtonRef = useRef<HTMLButtonElement>(null);

  // Use settings.current_team_id as the source of truth, fallback to first team
  const selectedTeamId = settings?.current_team_id || (teams && teams.length > 0 ? teams[0].id : null);
  const previousTeamIdRef = useRef<string | null>(null);

  // Update settings if we have teams but no current_team_id selected
  useEffect(() => {
    if (user && teams && teams.length > 0 && !settings?.current_team_id) {
      updateSettings.mutate({
        userId: user.uid,
        data: { current_team_id: teams[0].id },
      });
    }
  }, [user, teams, settings?.current_team_id, updateSettings]);

  // Clear selection when team changes (but not on initial load)
  useEffect(() => {
    // Only clear if team actually changed (not initial load)
    if (previousTeamIdRef.current !== null && previousTeamIdRef.current !== selectedTeamId && selectedTeamId !== null) {
      // Team actually changed, clear selections
      setCollectionId(null);
      setDocumentId(null);
    }
    // Update ref after checking, but only if we have a valid team ID
    if (selectedTeamId !== null) {
      previousTeamIdRef.current = selectedTeamId;
    }
  }, [selectedTeamId, setCollectionId, setDocumentId]);
  
  // Validate that collection belongs to current team, clear if not
  // Only validate after both collection and team are loaded and team is stable (not initializing)
  useEffect(() => {
    if (
      selectedCollection && 
      selectedTeamId && 
      !isLoadingCollection && 
      previousTeamIdRef.current === selectedTeamId && // Team is stable (not initializing)
      selectedCollection.team_id !== selectedTeamId
    ) {
      // Collection doesn't belong to current team, clear it
      setCollectionId(null);
      setDocumentId(null);
    }
  }, [selectedCollection, selectedTeamId, isLoadingCollection, setCollectionId, setDocumentId]);

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
      if (
        showKebabMenu &&
        kebabMenuRef.current &&
        kebabButtonRef.current &&
        !kebabMenuRef.current.contains(event.target as Node) &&
        !kebabButtonRef.current.contains(event.target as Node)
      ) {
        setShowKebabMenu(false);
      }
      if (
        showCollectionKebabMenu &&
        collectionKebabMenuRef.current &&
        collectionKebabButtonRef.current &&
        !collectionKebabMenuRef.current.contains(event.target as Node) &&
        !collectionKebabButtonRef.current.contains(event.target as Node)
      ) {
        setShowCollectionKebabMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettingsDropdown, showKebabMenu, showCollectionKebabMenu]);

  useEffect(() => {
    if (documentData?.title) {
      setTitleValue(documentData.title);
    }
  }, [documentData]);

  useEffect(() => {
    if (selectedCollection?.name) {
      setCollectionNameValue(selectedCollection.name);
    }
  }, [selectedCollection]);

  useEffect(() => {
    if (settings?.google_font) {
      const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(settings.google_font)}:wght@400;500;600;700&display=swap`;
      const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
      
      if (!existingLink) {
        const link = document.createElement("link");
        link.href = fontUrl;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
    }
  }, [settings?.google_font]);

  const handleUpdateTitle = async () => {
    if (!titleValue.trim() || !collectionId || !documentId) return;
    
    try {
      await updateDocumentMutation.mutateAsync({
        collectionId: collectionId,
        documentId: documentId,
        data: { title: titleValue.trim() },
      });
      setShowTitleModal(false);
      setShowKebabMenu(false);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !collectionId || !documentId) return;

    setIsUploadingBanner(true);
    try {
      const path = `documents/${documentId}/banner/${crypto.randomUUID()}`;
      const url = await uploadFile(path, file);
      await updateDocumentMutation.mutateAsync({
        collectionId: collectionId,
        documentId: documentId,
        data: { banner_image: url },
      });
      setShowBannerModal(false);
      setShowKebabMenu(false);
    } catch (error) {
      console.error("Failed to upload banner:", error);
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleUpdateCollectionName = async () => {
    if (!collectionNameValue.trim() || !collectionId) return;
    
    try {
      await updateCollectionMutation.mutateAsync({
        collectionId: collectionId,
        data: { name: collectionNameValue.trim() },
      });
      setShowCollectionNameModal(false);
      setShowCollectionKebabMenu(false);
    } catch (error) {
      console.error("Failed to update collection name:", error);
    }
  };

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
                  onClick={() => setDocumentId(null)}
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
                <h1
                  className="text-3xl font-bold text-black dark:text-zinc-50"
                  style={{
                    fontFamily: settings?.google_font ? `${settings.google_font}, serif` : undefined,
                  }}
                >
                  {selectedDocument.title}
                </h1>
                <div className="relative">
                  <button
                    ref={kebabButtonRef}
                    onClick={() => setShowKebabMenu(!showKebabMenu)}
                    className="flex items-center justify-center rounded-sm p-2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    aria-label="Document options"
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
                  {showKebabMenu && (
                    <div
                      ref={kebabMenuRef}
                      className="absolute right-0 top-full z-50 mt-1 w-48 rounded-sm border border-white/20 bg-black"
                    >
                      <button
                        onClick={() => {
                          setShowTitleModal(true);
                          setShowKebabMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10"
                      >
                        Change Title
                      </button>
                      <button
                        onClick={() => {
                          setShowBannerModal(true);
                          setShowKebabMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10"
                      >
                        {documentData?.banner_image ? "Edit Banner" : "Add Banner"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : selectedCollection ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setCollectionId(null);
                    setDocumentId(null);
                  }}
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
                <h1
                  className="text-3xl font-bold text-black dark:text-zinc-50"
                  style={{
                    fontFamily: settings?.google_font ? `${settings.google_font}, serif` : undefined,
                  }}
                >
                  {selectedCollection.name}
                </h1>
                <div className="relative">
                  <button
                    ref={collectionKebabButtonRef}
                    onClick={() => setShowCollectionKebabMenu(!showCollectionKebabMenu)}
                    className="flex items-center justify-center rounded-sm p-2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    aria-label="Collection options"
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
                  {showCollectionKebabMenu && (
                    <div
                      ref={collectionKebabMenuRef}
                      className="absolute right-0 top-full z-50 mt-1 w-48 rounded-sm border border-white/20 bg-black"
                    >
                      <button
                        onClick={() => {
                          setShowCollectionNameModal(true);
                          setShowCollectionKebabMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10"
                      >
                        Change Name
                      </button>
                    </div>
                  )}
                </div>
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
          <div className="flex items-center gap-4">
            <NotificationBell />
            {hasTeam && (
              <>
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
                    className="absolute right-0 top-full mt-2 w-40 rounded-sm border border-zinc-200 bg-white py-1 dark:border-zinc-800 dark:bg-black"
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
                    <button
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        setShowFontSelector(true);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-black hover:bg-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    >
                      Font
                    </button>
                  </div>
                )}
                </div>
                <div className="relative">
                <button
                  ref={addButtonRef}
                  onClick={() => {
                    if (collectionId) {
                      setShowDocumentPopup(true);
                    } else if (selectedTeamId) {
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
              </>
            )}
          </div>
        </div>

        {!hasTeam && !collectionId && (
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

        {hasTeam && selectedTeamId && !collectionId && (
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <TeamCollectionsSection
              teamId={selectedTeamId}
              onSelectCollection={(collection) => setCollectionId(collection.id)}
              selectedFont={settings?.google_font}
            />
          </div>
        )}

        {collectionId && !documentId && (
          <>
            {isLoadingCollection ? (
              <div className="mt-8 flex min-h-[60vh] items-center justify-center">
                <div className="text-zinc-500">Loading collection...</div>
              </div>
            ) : (
              <CollectionDocumentsSection
                collectionId={collectionId}
                onSelectDocument={(doc) => setDocumentId(doc.id)}
                selectedFont={settings?.google_font}
              />
            )}
          </>
        )}

        {collectionId && documentId && (
          <>
            {isLoadingDocument || isLoadingCollection ? (
              <div className="mt-8 flex min-h-[60vh] items-center justify-center">
                <div className="text-zinc-500">Loading document...</div>
              </div>
            ) : documentData && selectedCollection ? (
              <div className="mt-8">
                {documentData.banner_image && (
                  <div className="mb-8 w-full overflow-hidden rounded-sm">
                    <img
                      src={documentData.banner_image}
                      alt="Document banner"
                      className="w-full object-cover"
                    />
                  </div>
                )}
                <DocumentEditor
                  documentId={documentId}
                  collectionId={collectionId}
                  initialContent={documentData.content || ""}
                />
              </div>
            ) : null}
          </>
        )}

        {hasTeam && selectedTeamId && (
          <CreateCollectionPopup
            isOpen={showCollectionPopup}
            onClose={() => {
              setShowCollectionPopup(false);
            }}
            buttonRef={addButtonRef}
            teamId={selectedTeamId}
          />
        )}

        {collectionId && (
          <CreateDocumentPopup
            isOpen={showDocumentPopup}
            onClose={() => setShowDocumentPopup(false)}
            buttonRef={addButtonRef}
            collectionId={collectionId}
            onDocumentCreated={(documentId, title) => {
              setDocumentId(documentId);
            }}
          />
        )}

        {showTitleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-96 rounded-sm border border-white/20 bg-black p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Change Title</h3>
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdateTitle();
                  } else if (e.key === "Escape") {
                    setShowTitleModal(false);
                  }
                }}
                autoFocus
                className="mb-4 w-full rounded-sm border border-white/20 bg-black px-3 py-2 text-white focus:border-white focus:outline-none"
                placeholder="Enter document title"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowTitleModal(false)}
                  className="rounded-sm px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTitle}
                  disabled={!titleValue.trim() || updateDocumentMutation.isPending}
                  className="rounded-sm bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
                >
                  {updateDocumentMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showBannerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-96 rounded-sm border border-white/20 bg-black p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">
                {documentData?.banner_image ? "Edit Banner" : "Add Banner"}
              </h3>
              {documentData?.banner_image && (
                <div className="mb-4">
                  <img
                    src={documentData.banner_image}
                    alt="Banner"
                    className="mb-2 max-h-48 w-full rounded-sm object-cover"
                  />
                  <button
                    onClick={async () => {
                      if (!collectionId || !documentId) return;
                      try {
                        await updateDocumentMutation.mutateAsync({
                          collectionId: collectionId,
                          documentId: documentId,
                          data: { banner_image: "" },
                        });
                        setShowBannerModal(false);
                      } catch (error) {
                        console.error("Failed to remove banner:", error);
                      }
                    }}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove Banner
                  </button>
                </div>
              )}
              <label className="mb-4 block">
                <div className="cursor-pointer rounded-sm border border-white/20 bg-black px-4 py-2 text-center text-sm text-white hover:bg-white/10">
                  {isUploadingBanner ? "Uploading..." : "Choose Image"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={isUploadingBanner}
                  className="hidden"
                />
              </label>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowBannerModal(false)}
                  className="rounded-sm px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showCollectionNameModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-96 rounded-sm border border-white/20 bg-black p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Change Collection Name</h3>
              <input
                type="text"
                value={collectionNameValue}
                onChange={(e) => setCollectionNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdateCollectionName();
                  } else if (e.key === "Escape") {
                    setShowCollectionNameModal(false);
                  }
                }}
                autoFocus
                className="mb-4 w-full rounded-sm border border-white/20 bg-black px-3 py-2 text-white focus:border-white focus:outline-none"
                placeholder="Enter collection name"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCollectionNameModal(false)}
                  className="rounded-sm px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCollectionName}
                  disabled={!collectionNameValue.trim() || updateCollectionMutation.isPending}
                  className="rounded-sm bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
                >
                  {updateCollectionMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showFontSelector && user && (
          <FontSelectorModal
            isOpen={showFontSelector}
            onClose={() => setShowFontSelector(false)}
            userId={user.uid}
            currentFont={settings?.google_font}
          />
        )}
      </div>
    </div>
  );
}

function TeamCollectionsSection({
  teamId,
  onSelectCollection,
  selectedFont,
}: {
  teamId: string;
  onSelectCollection: (collection: Collection) => void;
  selectedFont?: string;
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
          className="aspect-square w-full rounded-sm border border-zinc-200 bg-white p-4 text-left shadow-none transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <h3
            className="text-6xl font-bold text-black dark:text-zinc-50"
            style={{
              fontFamily: selectedFont ? `${selectedFont}, serif` : "serif",
            }}
          >
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
  selectedFont,
}: {
  collectionId: string;
  onSelectDocument: (doc: Document) => void;
  selectedFont?: string;
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
            <div className="mb-3 h-32 w-full overflow-hidden rounded-sm">
              <img
                src={doc.banner_image}
                alt={doc.title || "Document banner"}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <h3
            className="text-6xl font-bold text-black dark:text-zinc-50"
            style={{
              fontFamily: selectedFont ? `${selectedFont}, serif` : "serif",
            }}
          >
            {doc.title || "Untitled"}
          </h3>
        </button>
      ))}
    </div>
  );
}
