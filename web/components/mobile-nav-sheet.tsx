"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@/lib/chat-context";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import {
  SparkleIcon,
  PlusIcon,
  HistoryIcon,
  MessageIcon,
  TrashIcon,
  XIcon,
  SunIcon,
  MoonIcon,
} from "./icons";

interface MobileNavSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export function MobileNavSheet({ isOpen, onClose }: MobileNavSheetProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const {
    conversations,
    activeThreadId,
    selectConversation,
    deleteConversation,
    startNewConversation,
  } = useChat();

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

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleNewThread = useCallback(() => {
    startNewConversation();
    router.push("/");
    onClose();
  }, [startNewConversation, router, onClose]);

  const handleSelectConversation = useCallback(
    (threadId: string) => {
      selectConversation(threadId);
      onClose();
    },
    [selectConversation, onClose]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, threadId: string) => {
      e.preventDefault();
      e.stopPropagation();
      deleteConversation(threadId);
    },
    [deleteConversation]
  );

  // Limit displayed conversations
  const displayedConversations = conversations.slice(0, 10);
  const hasMore = conversations.length > 10;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet - slides in from left */}
      <div
        className="fixed left-0 top-0 z-50 h-full w-[280px] max-w-[85vw] transform bg-sidebar shadow-2xl transition-transform duration-200 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-title"
      >
        <div className="flex h-full flex-col">
          {/* Header - Logo + Name + Close */}
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <Link
              href="/"
              onClick={() => {
                startNewConversation();
                onClose();
              }}
              className="flex items-center gap-2"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <SparkleIcon className="size-4 text-primary" />
              </div>
              <span className="text-base font-semibold text-sidebar-foreground">
                policychatbot.
              </span>
            </Link>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              aria-label="Close menu"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          {/* New Thread Button */}
          <div className="px-3 py-3">
            <button
              onClick={handleNewThread}
              className="flex w-full items-center gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <PlusIcon className="size-4" />
              <span>Start new thread</span>
            </button>
          </div>

          {/* History Section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* History Header - Clickable link to history page */}
            <Link
              href="/history"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 transition-colors hover:bg-sidebar-accent/50 rounded-md mx-2"
            >
              <HistoryIcon className="size-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-primary">
                History
              </span>
            </Link>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <MessageIcon className="mb-2 size-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No threads yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Start a new conversation above
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {displayedConversations.map((conversation) => (
                    <Link
                      key={conversation.thread_id}
                      href={`/chat/${conversation.thread_id}`}
                      onClick={() =>
                        handleSelectConversation(conversation.thread_id)
                      }
                      className={cn(
                        "group relative flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        activeThreadId === conversation.thread_id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <MessageIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {conversation.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(conversation.updated_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, conversation.thread_id)}
                        className="shrink-0 rounded p-1.5 opacity-0 transition-opacity hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete thread"
                      >
                        <TrashIcon className="size-3" />
                      </button>
                    </Link>
                  ))}
                  {hasMore && (
                    <Link
                      href="/history"
                      onClick={onClose}
                      className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-primary hover:bg-sidebar-accent/50 transition-colors"
                    >
                      View all history
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer - Theme Toggle */}
          <div className="border-t border-border px-3 py-3">
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            >
              {theme === "dark" ? (
                <>
                  <SunIcon className="size-4" />
                  <span>Light mode</span>
                </>
              ) : (
                <>
                  <MoonIcon className="size-4" />
                  <span>Dark mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
