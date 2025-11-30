"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFirebaseAuth } from "@/lib/hooks/use-firebase-auth";
import { useUserTeams } from "@/lib/hooks/use-team-queries";
import { useCollections, useUpdateCollection, useDeleteCollection, useUpdateCollectionsOrder } from "@/lib/hooks/use-collection-queries";
import { useDocuments, useDocument, useUpdateDocument, useDeleteDocument } from "@/lib/hooks/use-document-queries";
import { useSettings, useUpdateSettings } from "@/lib/hooks/use-settings-queries";
import { CreateTeamForm } from "@/lib/components/create-team-modal";
import { CreateCollectionPopup } from "@/lib/components/create-collection-popup";
import { CreateDocumentPopup } from "@/lib/components/create-document-popup";
import { DocumentEditor } from "@/lib/components/document-editor";
import { FontSelectorModal } from "@/lib/components/font-selector-modal";
import { NotificationBell } from "@/lib/components/notification-bell";
import { Collection, Document, getCollection } from "@/lib/firebase/collections";
import { uploadFile } from "@/lib/firebase/storage";
import { logout } from "@/lib/firebase/auth";
import { useQuery } from "@tanstack/react-query";

interface SelectedDocument {
  id: string;
  title: string;
}

interface DraggableBannerProps {
  src: string;
  alt: string;
  containerClassName: string;
  imageClassName?: string;
  position?: string; // CSS object-position (e.g., "50% 50%")
  onPositionChange?: (position: string) => void;
  disabled?: boolean;
}

function DraggableBanner({
  src,
  alt,
  containerClassName,
  imageClassName = "",
  position = "50% 50%",
  onPositionChange,
  disabled = false,
}: DraggableBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(position);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const hasMovedRef = useRef(false);

  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || !onPositionChange || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    hasMovedRef.current = false;
    const startX = e.clientX;
    const startY = e.clientY;
    
    // Parse current position
    const [currentX, currentY] = currentPosition.split(" ").map((p) => parseFloat(p));
    const startPosX = currentX || 50;
    const startPosY = currentY || 50;
    
    dragStartRef.current = {
      x: startX,
      y: startY,
      startX: startPosX,
      startY: startPosY,
    };
    
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;
      
      const dx = Math.abs(moveEvent.clientX - dragStartRef.current.x);
      const dy = Math.abs(moveEvent.clientY - dragStartRef.current.y);
      
      if (dx > 5 || dy > 5) {
        hasMovedRef.current = true;
      }
      
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - dragStartRef.current.x;
      const deltaY = moveEvent.clientY - dragStartRef.current.y;
      
      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;
      
      const newX = Math.max(0, Math.min(100, dragStartRef.current.startX + deltaXPercent));
      const newY = Math.max(0, Math.min(100, dragStartRef.current.startY + deltaYPercent));
      
      const newPosition = `${newX}% ${newY}%`;
      setCurrentPosition(newPosition);
      // Call onPositionChange during drag for live preview if handled by parent, 
      // or just update local state. 
      // User wants "Save" button, so updating parent state (temp) is fine.
      onPositionChange(newPosition);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      if (hasMovedRef.current) {
        upEvent.preventDefault();
        upEvent.stopPropagation();
      }
      
      dragStartRef.current = null;
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (hasMovedRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      style={{ cursor: disabled ? "default" : isDragging ? "grabbing" : "grab" }}
    >
      <img
        src={src}
        alt={alt}
        className={imageClassName}
        style={{
          objectPosition: currentPosition,
        }}
        draggable={false}
      />
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const { data: teams, isLoading: teamsLoading } = useUserTeams(user?.uid);
  const [collectionId, setCollectionId] = useQueryState("collection", {
    clearOnDefault: false,
    history: "push",
  });
  const [documentId, setDocumentId] = useQueryState("document", {
    clearOnDefault: false,
    history: "push",
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
  const [showCollectionBannerModal, setShowCollectionBannerModal] = useState(false);
  const [showFontSelector, setShowFontSelector] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [collectionNameValue, setCollectionNameValue] = useState("");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingCollectionBanner, setIsUploadingCollectionBanner] = useState(false);
  const [isRepositioningBanner, setIsRepositioningBanner] = useState(false);
  const [tempBannerPosition, setTempBannerPosition] = useState<string | null>(null);
  const updateDocumentMutation = useUpdateDocument();
  const updateCollectionMutation = useUpdateCollection();
  const deleteDocumentMutation = useDeleteDocument();
  const deleteCollectionMutation = useDeleteCollection();
  const { data: settings } = useSettings(user?.uid);
  const updateSettings = useUpdateSettings();
  const collectionKebabMenuRef = useRef<HTMLDivElement>(null);
  const collectionKebabButtonRef = useRef<HTMLButtonElement>(null);
  const [showDeleteDocumentModal, setShowDeleteDocumentModal] = useState(false);
  const [showDeleteCollectionModal, setShowDeleteCollectionModal] = useState(false);

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

  // Redirect to login if user is not authenticated (after loading completes)
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, user, router]);

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
      const path = `collections/${collectionId}/documents/${documentId}/banner/${crypto.randomUUID()}`;
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

  const handleCollectionBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !collectionId) return;

    setIsUploadingCollectionBanner(true);
    try {
      const path = `collections/${collectionId}/banner/${crypto.randomUUID()}`;
      const url = await uploadFile(path, file);
      await updateCollectionMutation.mutateAsync({
        collectionId: collectionId,
        data: { banner_image: url },
      });
      setShowCollectionBannerModal(false);
      setShowCollectionKebabMenu(false);
    } catch (error) {
      console.error("Failed to upload collection banner:", error);
    } finally {
      setIsUploadingCollectionBanner(false);
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

  const handleDeleteDocument = async () => {
    if (!collectionId || !documentId) return;
    
    try {
      await deleteDocumentMutation.mutateAsync({
        collectionId: collectionId,
        documentId: documentId,
      });
      setShowDeleteDocumentModal(false);
      setShowKebabMenu(false);
      setDocumentId(null);
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionId || !selectedTeamId) return;
    
    try {
      await deleteCollectionMutation.mutateAsync({
        collectionId: collectionId,
        teamId: selectedTeamId,
      });
      setShowDeleteCollectionModal(false);
      setShowCollectionKebabMenu(false);
      setCollectionId(null);
      setDocumentId(null);
    } catch (error) {
      console.error("Failed to delete collection:", error);
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
                      <div className="border-t border-white/20"></div>
                      <button
                        onClick={() => {
                          setShowDeleteDocumentModal(true);
                          setShowKebabMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10"
                      >
                        Delete Document
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
                      <button
                        onClick={() => {
                          setShowCollectionBannerModal(true);
                          setShowCollectionKebabMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10"
                      >
                        {selectedCollection?.banner_image ? "Edit Banner" : "Add Banner"}
                      </button>
                      <div className="border-t border-white/20"></div>
                      <button
                        onClick={() => {
                          setShowDeleteCollectionModal(true);
                          setShowCollectionKebabMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10"
                      >
                        Delete Collection
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
                    className="absolute right-0 top-full z-50 mt-2 w-40 rounded-sm border border-zinc-200 bg-white py-1 dark:border-zinc-800 dark:bg-black"
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
                    <div className="border-t border-zinc-200 dark:border-zinc-800"></div>
                    <button
                      onClick={async () => {
                        setShowSettingsDropdown(false);
                        await logout();
                        router.push("/auth/login");
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-zinc-50 dark:text-red-400 dark:hover:bg-zinc-900"
                    >
                      Log out
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
                  <div className="relative mb-8 w-full h-[250px] overflow-hidden rounded-sm group">
                    <DraggableBanner
                      src={documentData.banner_image}
                      alt="Document banner"
                      containerClassName="w-full h-full"
                      imageClassName="w-full h-full object-cover"
                      position={isRepositioningBanner ? (tempBannerPosition || "50% 50%") : (documentData.banner_position_page || "50% 50%")}
                      onPositionChange={(pos) => setTempBannerPosition(pos)}
                      disabled={!isRepositioningBanner}
                    />
                    {isRepositioningBanner && (
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <button
                          onClick={() => {
                            setIsRepositioningBanner(false);
                            setTempBannerPosition(null);
                          }}
                          className="rounded-sm bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-sm hover:bg-black/70"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!collectionId || !documentId || !tempBannerPosition) return;
                            try {
                              await updateDocumentMutation.mutateAsync({
                                collectionId,
                                documentId,
                                data: { banner_position_page: tempBannerPosition },
                              });
                              setIsRepositioningBanner(false);
                            } catch (error) {
                              console.error("Failed to save banner position:", error);
                            }
                          }}
                          className="rounded-sm bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-100"
                        >
                          Save Position
                        </button>
                      </div>
                    )}
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
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setTempBannerPosition(documentData.banner_position_page || "50% 50%");
                        setIsRepositioningBanner(true);
                        setShowBannerModal(false);
                      }}
                      className="w-full rounded-sm border border-white/20 bg-black px-4 py-2 text-sm text-white hover:bg-white/10"
                    >
                      Reposition
                    </button>
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

        {showCollectionBannerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-96 rounded-sm border border-white/20 bg-black p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">
                {selectedCollection?.banner_image ? "Edit Banner" : "Add Banner"}
              </h3>
              {selectedCollection?.banner_image && (
                <div className="mb-4">
                  <img
                    src={selectedCollection.banner_image}
                    alt="Banner"
                    className="mb-2 max-h-48 w-full rounded-sm object-cover"
                  />
                  <button
                    onClick={async () => {
                      if (!collectionId) return;
                      try {
                        await updateCollectionMutation.mutateAsync({
                          collectionId: collectionId,
                          data: { banner_image: "" },
                        });
                        setShowCollectionBannerModal(false);
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
                  {isUploadingCollectionBanner ? "Uploading..." : "Choose Image"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCollectionBannerUpload}
                  disabled={isUploadingCollectionBanner}
                  className="hidden"
                />
              </label>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCollectionBannerModal(false)}
                  className="rounded-sm px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Close
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

        {showDeleteDocumentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-96 rounded-sm border border-white/20 bg-black p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Delete Document</h3>
              <p className="mb-6 text-sm text-zinc-400">
                Are you sure you want to delete &ldquo;{documentData?.title || "this document"}&rdquo;? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteDocumentModal(false)}
                  className="rounded-sm px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDocument}
                  disabled={deleteDocumentMutation.isPending}
                  className="rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteDocumentMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteCollectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-96 rounded-sm border border-white/20 bg-black p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Delete Collection</h3>
              <p className="mb-6 text-sm text-zinc-400">
                Are you sure you want to delete &ldquo;{selectedCollection?.name || "this collection"}&rdquo;? This will also delete all documents in this collection. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteCollectionModal(false)}
                  className="rounded-sm px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCollection}
                  disabled={deleteCollectionMutation.isPending}
                  className="rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteCollectionMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableCollectionItem({
  collection,
  onSelect,
  selectedFont,
}: {
  collection: Collection;
  onSelect: (collection: Collection) => void;
  selectedFont?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: collection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="h-full"
    >
      <button
        onClick={() => onSelect(collection)}
        className="aspect-square w-full rounded-sm border border-zinc-200 bg-white overflow-hidden relative shadow-none transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        {collection.banner_image ? (
          <>
            <img
              src={collection.banner_image}
              alt={collection.name || "Collection banner"}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="bg-black px-6 py-4">
                <h3
                  className="text-3xl sm:text-4xl md:text-6xl font-bold text-white break-words text-center"
                  style={{
                    fontFamily: selectedFont ? `${selectedFont}, serif` : "serif",
                  }}
                >
                  {collection.name || "Unnamed Collection"}
                </h3>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col justify-center h-full p-4">
            <h3
              className="text-3xl sm:text-4xl md:text-6xl font-bold text-black dark:text-zinc-50 break-words w-full"
              style={{
                fontFamily: selectedFont ? `${selectedFont}, serif` : "serif",
              }}
            >
              {collection.name || "Unnamed Collection"}
            </h3>
          </div>
        )}
      </button>
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
  const { data: collections, isLoading, error } = useCollections(teamId);
  const updateCollectionsOrder = useUpdateCollectionsOrder();
  const [items, setItems] = useState<Collection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    console.log("TeamCollectionsSection collections update:", collections);
    if (collections) {
      setItems(collections);
    }
  }, [collections]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update order in backend
        // We need to update the order field for all affected items
        // A simple strategy is to re-assign order based on index
        const updates = newItems.map((item, index) => ({
          id: item.id,
          order: index,
        }));
        
        updateCollectionsOrder.mutate(updates);
        
        return newItems;
      });
    }
  };

  if (error) {
    console.error("Error loading collections in component:", error);
    return <div className="text-red-500">Error loading collections</div>;
  }

  if (isLoading) {
    console.log("Collections loading...");
    return null;
  }

  if (!items || items.length === 0) {
    return null;
  }

  const activeItem = items.find((item) => item.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((c) => c.id)} strategy={rectSortingStrategy}>
        {items.map((collection) => (
          <SortableCollectionItem
            key={collection.id}
            collection={collection}
            onSelect={onSelectCollection}
            selectedFont={selectedFont}
          />
        ))}
      </SortableContext>
      <DragOverlay>
        {activeId && activeItem ? (
          <div className="aspect-square w-full rounded-sm border border-zinc-200 bg-white overflow-hidden relative shadow-none dark:border-zinc-800 dark:bg-zinc-900">
            {activeItem.banner_image ? (
              <>
                <img
                  src={activeItem.banner_image}
                  alt={activeItem.name || "Collection banner"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="bg-black px-6 py-4">
                    <h3
                      className="text-3xl sm:text-4xl md:text-6xl font-bold text-white break-words text-center"
                      style={{
                        fontFamily: selectedFont ? `${selectedFont}, serif` : "serif",
                      }}
                    >
                      {activeItem.name || "Unnamed Collection"}
                    </h3>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-center h-full p-4">
                <h3
                  className="text-3xl sm:text-4xl md:text-6xl font-bold text-black dark:text-zinc-50 break-words w-full"
                  style={{
                    fontFamily: selectedFont ? `${selectedFont}, serif` : "serif",
                  }}
                >
                  {activeItem.name || "Unnamed Collection"}
                </h3>
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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
  const updateDocumentMutation = useUpdateDocument();
  const [repositioningDocId, setRepositioningDocId] = useState<string | null>(null);
  const [tempPosition, setTempPosition] = useState<string | null>(null);
  const [activeKebabId, setActiveKebabId] = useState<string | null>(null);
  const kebabMenuRef = useRef<HTMLDivElement>(null);
  const kebabButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        activeKebabId &&
        kebabMenuRef.current &&
        kebabButtonRef.current &&
        !kebabMenuRef.current.contains(event.target as Node) &&
        !kebabButtonRef.current.contains(event.target as Node)
      ) {
        setActiveKebabId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeKebabId]);

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
      {documents.map((doc) => {
        const isRepositioning = repositioningDocId === doc.id;
        
        return (
          <div key={doc.id} className="relative aspect-square w-full group">
            <button
              onClick={() => !isRepositioning && onSelectDocument(doc)}
              className="h-full w-full rounded-sm border border-zinc-200 bg-white overflow-hidden relative shadow-none transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              {doc.banner_image ? (
                <>
                  {isRepositioning ? (
                    <DraggableBanner
                      src={doc.banner_image}
                      alt={doc.title || "Document banner"}
                      containerClassName="absolute inset-0 w-full h-full"
                      imageClassName="w-full h-full object-cover"
                      position={tempPosition || doc.banner_position_grid || "50% 50%"}
                      onPositionChange={(pos) => setTempPosition(pos)}
                    />
                  ) : (
                    <img
                      src={doc.banner_image}
                      alt={doc.title || "Document banner"}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        objectPosition: doc.banner_position_grid || "50% 50%",
                      }}
                    />
                  )}
                  <div className={`absolute inset-0 flex items-center justify-center p-4 ${isRepositioning ? 'pointer-events-none opacity-50' : ''}`}>
                    <div className="bg-black px-6 py-4">
                      <h3
                        className="text-3xl sm:text-4xl md:text-6xl font-bold text-white break-words text-center"
                        style={{
                          fontFamily: selectedFont ? `${selectedFont}, serif` : "serif",
                        }}
                      >
                        {doc.title || "Untitled"}
                      </h3>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col justify-center h-full p-4">
                  <h3
                    className="text-3xl sm:text-4xl md:text-6xl font-bold text-black dark:text-zinc-50 break-words w-full"
                    style={{
                      fontFamily: selectedFont ? `${selectedFont}, serif` : "serif",
                    }}
                  >
                    {doc.title || "Untitled"}
                  </h3>
                </div>
              )}
            </button>

            {/* Kebab Menu for Documents with Banners */}
            {doc.banner_image && !isRepositioning && (
              <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="relative">
                  <button
                    ref={activeKebabId === doc.id ? kebabButtonRef : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveKebabId(activeKebabId === doc.id ? null : doc.id);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
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
                  {activeKebabId === doc.id && (
                    <div
                      ref={kebabMenuRef}
                      className="absolute right-0 top-full z-50 mt-1 w-32 rounded-sm border border-white/20 bg-black shadow-xl"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRepositioningDocId(doc.id);
                          setTempPosition(doc.banner_position_grid || "50% 50%");
                          setActiveKebabId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10"
                      >
                        Reposition
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save/Cancel Controls for Repositioning */}
            {isRepositioning && (
              <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRepositioningDocId(null);
                    setTempPosition(null);
                  }}
                  className="rounded-sm bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur-sm hover:bg-black/70"
                >
                  Cancel
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!tempPosition) return;
                    try {
                      await updateDocumentMutation.mutateAsync({
                        collectionId,
                        documentId: doc.id,
                        data: { banner_position_grid: tempPosition },
                      });
                      setRepositioningDocId(null);
                      setTempPosition(null);
                    } catch (error) {
                      console.error("Failed to save banner position:", error);
                    }
                  }}
                  className="rounded-sm bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-100"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
