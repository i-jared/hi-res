import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import React, { useEffect, useRef, useState } from "react";

export function ResizableImage(props: NodeViewProps) {
  const { node, updateAttributes, selected } = props;
  const [width, setWidth] = useState(node.attrs.width || "auto");
  const imageRef = useRef<HTMLImageElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    // Sync width from props if it changes externally
    const targetWidth = node.attrs.width || "auto";
    if (targetWidth !== width) {
      // eslint-disable-next-line
      setWidth(targetWidth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.attrs.width]);

  const onMouseDown = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: rect.width,
        h: rect.height,
      };
      
      const handleMove = (moveEvent: MouseEvent) => {
          if (!resizeStartRef.current) return;
          const dx = moveEvent.clientX - resizeStartRef.current.x;
          
          // Simple width resizing for now (right handle)
          // If dragging left handle, we subtract.
          const directionMult = direction.includes("left") ? -1 : 1;
          
          const newW = Math.max(50, resizeStartRef.current.w + dx * directionMult);
          
          setWidth(newW);
      };

      const handleUp = (upEvent: MouseEvent) => {
          if (!resizeStartRef.current) return;
          const dx = upEvent.clientX - resizeStartRef.current.x;
          const directionMult = direction.includes("left") ? -1 : 1;
          const newW = Math.max(50, resizeStartRef.current.w + dx * directionMult);
          
          updateAttributes({ width: newW, height: null }); // height null -> auto
          resizeStartRef.current = null;
          
          document.removeEventListener("mousemove", handleMove);
          document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    }
  };


  return (
    <NodeViewWrapper className="relative inline-block leading-none">
      <div className={`relative inline-block ${selected ? "ring-2 ring-blue-500" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt}
          title={node.attrs.title}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: 'auto', // Force auto height for aspect ratio
            maxWidth: '100%',
            display: 'block',
          }}
          className="rounded-sm"
        />
        
        {selected && (
          <>
            {/* Resize Handles */}
            <div
              className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize bg-blue-500 border border-white"
              onMouseDown={(e) => onMouseDown(e, "right")}
            />
             <div
              className="absolute bottom-0 left-0 h-3 w-3 cursor-nesw-resize bg-blue-500 border border-white"
              onMouseDown={(e) => onMouseDown(e, "left")}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

