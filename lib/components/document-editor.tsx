"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { CustomImage } from "@/lib/extensions/custom-image";
import { useState, useEffect, useCallback, useRef } from "react";
import { useUpdateDocument } from "@/lib/hooks/use-document-queries";
import { EditorSideMenu } from "./editor-side-menu";


interface DocumentEditorProps {
  documentId: string;
  collectionId: string;
  initialContent: string;
}

export function DocumentEditor({
  documentId,
  collectionId,
  initialContent,
}: DocumentEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const updateDocumentMutation = useUpdateDocument();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideSavingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideSavedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContent = useRef(initialContent);

  const debouncedSave = useCallback(
    (content: string) => {
      // Show editing indicator when user types
      setIsEditing(true);
      setIsSaved(false);
      
      // Clear any existing editing timeout
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        if (content !== lastSavedContent.current) {
          // Hide editing, show saving
          setIsEditing(false);
          setIsSaving(true);
          
          // Clear any existing hide timeouts
          if (hideSavingTimeoutRef.current) {
            clearTimeout(hideSavingTimeoutRef.current);
          }
          if (hideSavedTimeoutRef.current) {
            clearTimeout(hideSavedTimeoutRef.current);
          }
          
          try {
            await updateDocumentMutation.mutateAsync({
              collectionId,
              documentId,
              data: { content },
            });
            lastSavedContent.current = content;
            
            // Show saved indicator after successful save
            setIsSaving(false);
            setIsSaved(true);
            
            // Hide saved indicator after 2 seconds
            hideSavedTimeoutRef.current = setTimeout(() => {
              setIsSaved(false);
            }, 2000);
          } catch (error) {
            console.error("Failed to save document:", error);
            setIsSaving(false);
            setIsEditing(false);
          }
        } else {
          // Content hasn't changed, just hide editing after a short delay
          editingTimeoutRef.current = setTimeout(() => {
            setIsEditing(false);
          }, 300);
        }
      }, 1000);
    },
    [collectionId, documentId, updateDocumentMutation]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Start typing...",
      }),
      Typography,
      CustomImage,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[60vh] focus:outline-none text-white prose-headings:text-white prose-p:text-zinc-300 prose-strong:text-white prose-em:text-zinc-300 prose-code:text-zinc-300 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded-sm prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-blockquote:border-l-white/30 prose-blockquote:text-zinc-400 prose-ul:text-zinc-300 prose-ol:text-zinc-300 prose-li:text-zinc-300 prose-hr:border-white/20",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      debouncedSave(html);
    },
  });

  useEffect(() => {
    return () => {
      // Clear all pending timeouts on unmount
      // Note: Accessing ref.current in cleanup is correct for timeout refs
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (hideSavingTimeoutRef.current) {
        clearTimeout(hideSavingTimeoutRef.current);
      }
      if (hideSavedTimeoutRef.current) {
        clearTimeout(hideSavedTimeoutRef.current);
      }
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
      lastSavedContent.current = initialContent;
    }
  }, [initialContent, editor]);

  if (!editor) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-zinc-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <EditorSideMenu editor={editor} documentId={documentId} />
      {isEditing && !isSaving && !isSaved && (
        <div className="fixed right-8 top-8 z-50 rounded-sm bg-white/10 px-3 py-1 text-xs text-zinc-400">
          Editing...
        </div>
      )}
      {isSaving && (
        <div className="fixed right-8 top-8 z-50 rounded-sm bg-white/10 px-3 py-1 text-xs text-zinc-400">
          Saving...
        </div>
      )}
      {isSaved && !isSaving && (
        <div className="fixed right-8 top-8 z-50 rounded-sm bg-white/10 px-3 py-1 text-xs text-green-400">
          Saved
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

