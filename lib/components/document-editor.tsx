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
  const updateDocumentMutation = useUpdateDocument();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContent = useRef(initialContent);

  const debouncedSave = useCallback(
    (content: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        if (content !== lastSavedContent.current) {
          setIsSaving(true);
          try {
            await updateDocumentMutation.mutateAsync({
              collectionId,
              documentId,
              data: { content },
            });
            lastSavedContent.current = content;
          } catch (error) {
            console.error("Failed to save document:", error);
          } finally {
            setIsSaving(false);
          }
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
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
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
      {isSaving && (
        <div className="fixed right-8 top-8 z-50 rounded-sm bg-white/10 px-3 py-1 text-xs text-zinc-400">
          Saving...
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

