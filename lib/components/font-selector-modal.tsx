"use client";

import { useState, useEffect } from "react";
import { useUpdateSettings } from "@/lib/hooks/use-settings-queries";

interface FontSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentFont?: string;
}

const POPULAR_FONTS = [
  { name: "Inter", value: "Inter" },
  { name: "Roboto", value: "Roboto" },
  { name: "Open Sans", value: "Open Sans" },
  { name: "Lato", value: "Lato" },
  { name: "Montserrat", value: "Montserrat" },
  { name: "Raleway", value: "Raleway" },
  { name: "Poppins", value: "Poppins" },
  { name: "Playfair Display", value: "Playfair Display" },
  { name: "Merriweather", value: "Merriweather" },
  { name: "Oswald", value: "Oswald" },
  { name: "Source Sans Pro", value: "Source Sans Pro" },
  { name: "Nunito", value: "Nunito" },
  { name: "Crimson Text", value: "Crimson Text" },
  { name: "Lora", value: "Lora" },
  { name: "PT Sans", value: "PT Sans" },
];

export function FontSelectorModal({
  isOpen,
  onClose,
  userId,
  currentFont,
}: FontSelectorModalProps) {
  const [selectedFont, setSelectedFont] = useState(currentFont || "");
  const [searchQuery, setSearchQuery] = useState("");
  const updateSettingsMutation = useUpdateSettings();

  useEffect(() => {
    setSelectedFont(currentFont || "");
  }, [currentFont]);

  useEffect(() => {
    if (selectedFont && isOpen) {
      const link = document.createElement("link");
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(selectedFont)}:wght@400;500;600;700&display=swap`;
      link.rel = "stylesheet";
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [selectedFont, isOpen]);

  if (!isOpen) return null;

  const filteredFonts = POPULAR_FONTS.filter((font) =>
    font.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        userId,
        data: { google_font: selectedFont || undefined },
      });
      onClose();
    } catch (error) {
      console.error("Failed to update font:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-sm border border-white/20 bg-black p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Select Font</h3>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search fonts..."
          className="mb-4 w-full rounded-sm border border-white/20 bg-black px-3 py-2 text-white focus:border-white focus:outline-none"
        />
        <div className="mb-4 max-h-64 overflow-y-auto">
          {filteredFonts.map((font) => (
            <button
              key={font.value}
              onClick={() => setSelectedFont(font.value)}
              className={`mb-2 w-full rounded-sm border px-4 py-2 text-left text-sm transition-colors ${
                selectedFont === font.value
                  ? "border-white bg-white/10 text-white"
                  : "border-white/20 bg-black text-white hover:bg-white/10"
              }`}
              style={{
                fontFamily: font.value,
              }}
            >
              {font.name}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-sm px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="rounded-sm bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

