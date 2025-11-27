"use client";

import { Editor } from "@tiptap/react";
import { useState, useEffect, useRef } from "react";
import { uploadFile } from "@/lib/firebase/storage";

interface EditorSideMenuProps {
  editor: Editor;
  documentId: string;
}

export function EditorSideMenu({ editor, documentId }: EditorSideMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [top, setTop] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (!editor || editor.isDestroyed) return;

      const { selection } = editor.state;
      const { $anchor } = selection;

      // Check if current node is a paragraph and is empty
      const isEmpty = $anchor.parent.content.size === 0;
      const isParagraph = $anchor.parent.type.name === "paragraph";
      
      if (isEmpty && isParagraph) {
        // Find the DOM element for the current block
        // We use the start of the block to find the element
        const domInfo = editor.view.domAtPos($anchor.pos);
        const node = domInfo.node as HTMLElement;
        
        // Sometimes domAtPos returns a text node or the paragraph itself
        // We want the block element
        let blockElement = node;
        if (blockElement.nodeType === 3) { // Text node
             blockElement = blockElement.parentElement as HTMLElement;
        }
        
        // If the node isn't an element (e.g. text node), or doesn't have getBoundingClientRect, skip
        if (!blockElement || !blockElement.getBoundingClientRect) return;

        const editorRect = editor.view.dom.getBoundingClientRect();
        const blockRect = blockElement.getBoundingClientRect();

        // Calculate top relative to editor
        const relativeTop = blockRect.top - editorRect.top;
        
        setTop(relativeTop);
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setIsMenuOpen(false);
      }
    };

    editor.on("selectionUpdate", updatePosition);
    editor.on("update", updatePosition);
    editor.on("blur", () => {
        // Optional: hide on blur, but might annoy if clicking the button causes blur first
        // Keeping it visible for now to allow interaction
    });

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("update", updatePosition);
    };
  }, [editor]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
    setIsMenuOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Create a unique path for the image
      const timestamp = Date.now();
      const path = `documents/${documentId}/${timestamp}-${file.name}`;
      
      const url = await uploadFile(path, file);
      
      // Insert image at current position
      editor.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      <div
        className="absolute left-[-40px] z-50 flex items-center gap-2 transition-all duration-200 ease-in-out"
        style={{ top: `${top}px` }}
      >
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-sm text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Add content"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>

        {isMenuOpen && (
          <div className="flex animate-in fade-in slide-in-from-left-2 items-center rounded-sm border border-white/10 bg-black px-1 py-1">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick();
              }}
              disabled={isUploading}
              className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              {isUploading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <span>Image</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

