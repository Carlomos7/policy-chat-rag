"use client";

import { useChat } from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import { MessageIcon, PlusIcon, TrashIcon, XIcon } from "./icons";

interface ConversationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConversationSidebar({ isOpen, onClose }: ConversationSidebarProps) {
  const {
    conversations,
    activeThreadId,
    selectConversation,
    startNewConversation,
    deleteConversation,
  } = useChat();

  const handleNewChat = () => {
    startNewConversation();
    onClose();
  };

  const handleSelectConversation = (threadId: string) => {
    selectConversation(threadId);
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    deleteConversation(threadId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200 md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border p-4">
          <h2 className="text-lg font-semibold text-sidebar-foreground">Chats</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent px-4 py-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/80"
          >
            <PlusIcon className="size-5" />
            New Chat
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageIcon className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.thread_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectConversation(conversation.thread_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleSelectConversation(conversation.thread_id);
                    }
                  }}
                  className={cn(
                    "group flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                    activeThreadId === conversation.thread_id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <MessageIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{conversation.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(conversation.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conversation.thread_id)}
                    className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
