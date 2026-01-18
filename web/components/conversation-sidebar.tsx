"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useChat } from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import { MessageIcon, TrashIcon, HistoryIcon } from "./icons";

interface ConversationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Format date outside component to avoid recreation
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  
  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return "";
  }
  
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

export function ConversationSidebar({ isOpen, onClose }: ConversationSidebarProps) {
  const {
    conversations,
    activeThreadId,
    selectConversation,
    deleteConversation,
  } = useChat();

  const handleSelectConversation = useCallback((threadId: string) => {
    selectConversation(threadId);
    onClose();
  }, [selectConversation, onClose]);

  const handleDelete = useCallback((e: React.MouseEvent, threadId: string) => {
    e.preventDefault();
    e.stopPropagation();
    deleteConversation(threadId);
  }, [deleteConversation]);

  return (
    <aside
      className={cn(
        "fixed left-12 sm:left-14 top-0 z-40 flex h-full w-56 sm:w-64 flex-col border-r border-border bg-sidebar shadow-xl transition-all duration-200 ease-out",
        isOpen
          ? "translate-x-0 opacity-100 visible"
          : "-translate-x-56 sm:-translate-x-64 opacity-0 invisible pointer-events-none"
      )}
      onMouseEnter={(e) => e.stopPropagation()}
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <HistoryIcon className="size-4 sm:size-5 text-primary" />
          <span className="text-base sm:text-lg font-semibold text-sidebar-foreground">History</span>
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto px-1.5 sm:px-2 py-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <MessageIcon className="mb-2 h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No threads yet</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Start a new conversation above</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conversation) => (
              <Link
                key={conversation.thread_id}
                href={`/chat/${conversation.thread_id}`}
                onClick={() => handleSelectConversation(conversation.thread_id)}
                className={cn(
                  "group relative flex w-full items-start gap-2 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-sm transition-colors cursor-pointer",
                  activeThreadId === conversation.thread_id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <MessageIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{conversation.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDate(conversation.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, conversation.thread_id)}
                  className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100 sm:group-hover:opacity-100"
                  aria-label="Delete thread"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
