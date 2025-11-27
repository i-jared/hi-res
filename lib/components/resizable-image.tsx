import { NodeViewWrapper } from "@tiptap/react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface ResizableImageProps {
  node: {
    attrs: {
      src: string;
      alt?: string;
      title?: string;
      width?: string | number;
      height?: string | number;
    };
  };
  updateAttributes: (attrs: Record<string, any>) => void;
  selected: boolean;
  extension: any;
}

export function ResizableImage({ node, updateAttributes, selected }: ResizableImageProps) {
  const [width, setWidth] = useState(node.attrs.width || "auto");
  const [height, setHeight] = useState(node.attrs.height || "auto");
  const [isResizing, setIsResizing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    setWidth(node.attrs.width || "auto");
    setHeight(node.attrs.height || "auto");
  }, [node.attrs.width, node.attrs.height]);

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
      setIsResizing(true);
      
      const onMouseMove = (e: MouseEvent) => {
        if (!resizeStartRef.current) return;
        
        const deltaX = e.clientX - resizeStartRef.current.x;
        // Maintain aspect ratio roughly or just allow free resize?
        // Usually free resize or shift for aspect ratio. Let's do simple width resize for now as height often follows auto in web.
        // But if we set both, we can distort.
        // Let's assume we just resize width and let height be auto (or resize both).
        // The user asked to "drag corners to resize".
        
        // Let's try resizing width, and keep height auto to preserve aspect ratio, 
        // unless we want to allow distortion. For images, aspect ratio lock is usually desired.
        
        // If we only change width, height adapts if set to auto.
        const newWidth = Math.max(100, resizeStartRef.current.w + deltaX * (direction.includes("left") ? -1 : 1));
        
        setWidth(newWidth);
        // We can also update height if we want to be explicit, but 'auto' is safer for aspect ratio.
      };
      
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        setIsResizing(false);
        
        // Commit changes
        if (resizeStartRef.current) {
           // We update attributes with the new width. 
           // If we are currently just using state, we need to commit it now.
           // We'll use the current 'width' state value? No, the state might not be up to date in the closure if not careful.
           // Actually, onMouseUp inside the effect/callback will trap the closure? 
           // Better to just read from the last set value or calc again?
           // We can just use the value from the event.
           // But simpler: `setWidth` updates the state, so we need to pass the final value to updateAttributes.
           // However, `setWidth` is async. 
           
           // Let's just use the calculated value in onMouseMove to a ref or variable, then commit it.
        }
      };

      // To fix the closure issue with state, we can just move the logic into a persistent handler or use refs.
      // Let's use a different approach: attach listeners that call a localized function.
      
      const handleMove = (moveEvent: MouseEvent) => {
          if (!resizeStartRef.current) return;
          const dx = moveEvent.clientX - resizeStartRef.current.x;
          // const dy = moveEvent.clientY - resizeStartRef.current.y; 
          
          // Simple width resizing for now (right handle)
          // If dragging left handle, we subtract.
          const directionMult = direction.includes("left") ? -1 : 1;
          
          const newW = Math.max(50, resizeStartRef.current.w + dx * directionMult);
          
          setWidth(newW);
          // setHeight('auto'); // Keep aspect ratio
      };

      const handleUp = (upEvent: MouseEvent) => {
          // Calculate final width one last time or just use the state?
          // Using state in this listener might be stale?
          // Actually, we can just calculate it again to be sure.
          if (!resizeStartRef.current) return;
          const dx = upEvent.clientX - resizeStartRef.current.x;
          const directionMult = direction.includes("left") ? -1 : 1;
          const newW = Math.max(50, resizeStartRef.current.w + dx * directionMult);
          
          updateAttributes({ width: newW, height: null }); // height null -> auto
          setIsResizing(false);
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

