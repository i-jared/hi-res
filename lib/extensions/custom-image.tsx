import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ResizableImage } from "@/lib/components/resizable-image";

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute("width") || element.style.width;
          // If width is a number (e.g. "200" or "200px"), parse it as a number
          // This ensures the ResizableImage component renders it as "200px" and not invalid CSS "200"
          if (!width) return null;
          if (/^\d+(\.\d+)?(px)?$/.test(width)) {
            return parseFloat(width);
          }
          return width;
        },
        renderHTML: (attributes) => {
          return {
            width: attributes.width,
          };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const height = element.getAttribute("height") || element.style.height;
          if (!height) return null;
          if (/^\d+(\.\d+)?(px)?$/.test(height)) {
            return parseFloat(height);
          }
          return height;
        },
        renderHTML: (attributes) => {
          return {
            height: attributes.height,
          };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImage);
  },
});
