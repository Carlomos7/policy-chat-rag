"use client";

import { useEffect } from "react";
import { XIcon } from "./icons";

function formatSourceName(filename: string): string {
  // Remove .txt or .md extension
  const withoutExt = filename.replace(/\.(txt|md)$/i, "");
  // Replace underscores with spaces
  const withSpaces = withoutExt.replace(/_/g, " ");
  // Title case
  return withSpaces
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface SourcesSheetProps {
  sources: string[];
  isOpen: boolean;
  onClose: () => void;
}

export function SourcesSheet({ sources, isOpen, onClose }: SourcesSheetProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet - full width on mobile, fixed width on larger screens */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-full sm:w-80 transform bg-sidebar border-l border-sidebar-border shadow-xl transition-transform duration-200 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sources-sheet-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border p-3 sm:p-4">
          <div>
            <h2 id="sources-sheet-title" className="text-base sm:text-lg font-semibold text-sidebar-foreground">
              Sources
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {sources.length} document{sources.length !== 1 ? "s" : ""} referenced
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* Source List */}
        <div className="overflow-y-auto p-3 sm:p-4">
          <div className="space-y-2">
            {sources.map((source, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 sm:gap-3 rounded-lg bg-sidebar-accent/50 p-2.5 sm:p-3 transition-colors hover:bg-sidebar-accent"
              >
                <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <svg
                    className="size-3.5 sm:size-4 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sidebar-foreground text-xs sm:text-sm">
                    {formatSourceName(source)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {source}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
