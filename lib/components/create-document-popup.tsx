"use client";

import { useState, useRef, useEffect } from "react";
import { useCreateDocument } from "@/lib/hooks/use-document-queries";

interface CreateDocumentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  collectionId: string;
  onDocumentCreated?: (documentId: string, title: string) => void;
}

export function CreateDocumentPopup({
  isOpen,
  onClose,
  buttonRef,
  collectionId,
  onDocumentCreated,
}: CreateDocumentPopupProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const createDocumentMutation = useCreateDocument();

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen, buttonRef]);

  useEffect(() => {
    const handleResize = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, buttonRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Document title is required");
      return;
    }

    try {
      const result = await createDocumentMutation.mutateAsync({
        title: title.trim(),
        collectionId,
      });
      const docTitle = title.trim();
      setTitle("");
      onClose();
      onDocumentCreated?.(result.documentId, docTitle);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create document");
      }
    }
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-64 rounded-sm border border-white/20 bg-black p-4 dark:border-white/20 dark:bg-black"
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
      }}
    >
      <h3 className="mb-3 text-sm font-semibold text-black dark:text-zinc-50">
        Create Document
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 p-2 text-xs text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="document-title"
            className="block text-xs font-medium text-gray-700 dark:text-zinc-300"
          >
            Title
          </label>
          <input
            id="document-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="mt-1 block w-full rounded-sm border border-white/20 bg-black px-2 py-1.5 text-sm text-white focus:border-white focus:outline-none dark:border-white/20 dark:bg-black dark:text-white"
            placeholder="Enter document title"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black/80 dark:text-white dark:hover:bg-black/80"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createDocumentMutation.isPending}
            className="rounded-sm bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black/80 disabled:opacity-50 dark:bg-black dark:hover:bg-black/80"
          >
            {createDocumentMutation.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

