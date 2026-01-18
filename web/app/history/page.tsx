"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useChat } from "@/lib/chat-context";
import { useTheme } from "@/lib/theme-context";
import { 
  SparkleIcon, 
  HistoryIcon, 
  MessageIcon, 
  TrashIcon, 
  SearchIcon, 
  PlusIcon,
  SunIcon,
  MoonIcon,
  ArrowLeftIcon
} from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <SunIcon className="size-5" />
          ) : (
            <MoonIcon className="size-5" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{theme === "dark" ? "Light mode" : "Dark mode"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function HistoryPage() {
  const { conversations, deleteConversation, startNewConversation, getMessagesForThread, isHydrated } = useChat();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }

    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      // Search in title
      if (conv.title.toLowerCase().includes(query)) {
        return true;
      }

      // Search in messages
      const messages = getMessagesForThread(conv.thread_id);
      return messages.some((msg) => 
        msg.content.toLowerCase().includes(query)
      );
    });
  }, [conversations, searchQuery, getMessagesForThread]);

  // Show loading state while hydrating
  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const groups: { [key: string]: typeof filteredConversations } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    filteredConversations.forEach((conv) => {
      const convDate = new Date(conv.updated_at);
      if (convDate >= today) {
        groups.today.push(conv);
      } else if (convDate >= yesterday) {
        groups.yesterday.push(conv);
      } else if (convDate >= weekAgo) {
        groups.thisWeek.push(conv);
      } else if (convDate >= monthAgo) {
        groups.thisMonth.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [filteredConversations]);

  const handleDelete = (e: React.MouseEvent, threadId: string) => {
    e.preventDefault();
    e.stopPropagation();
    deleteConversation(threadId);
  };

  const renderConversationGroup = (title: string, convs: typeof conversations) => {
    if (convs.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
        <div className="space-y-2">
          {convs.map((conv) => {
            const messages = getMessagesForThread(conv.thread_id);
            const lastMessage = messages[messages.length - 1];
            const preview = lastMessage?.content.slice(0, 100) + (lastMessage?.content.length > 100 ? "..." : "") || "No messages";

            return (
              <Link
                key={conv.thread_id}
                href={`/chat/${conv.thread_id}`}
                className="group block rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MessageIcon className="size-4 shrink-0 text-primary" />
                      <h3 className="truncate font-medium text-foreground">
                        {conv.title}
                      </h3>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {preview}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatRelativeDate(conv.updated_at)}</span>
                      <span>•</span>
                      <span>{conv.message_count} messages</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.thread_id)}
                    className="shrink-0 rounded-lg p-2 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-full">
        {/* Icon Bar - Always visible */}
        <div className="relative z-50 flex h-full w-14 shrink-0 flex-col items-center border-r border-border bg-sidebar py-3">
          {/* Logo - clickable, goes home */}
          <Link
            href="/"
            onClick={() => startNewConversation()}
            className="mb-4 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 transition-all hover:from-primary/30 hover:to-primary/10 hover:shadow-md active:scale-95"
            aria-label="Home"
          >
            <SparkleIcon className="size-5 text-primary" />
          </Link>

          {/* New Thread Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                onClick={() => startNewConversation()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md active:scale-95"
                aria-label="New thread"
              >
                <PlusIcon className="size-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>New thread</p>
            </TooltipContent>
          </Tooltip>

          {/* History Button - current page */}
          <div className="relative mt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-accent text-primary"
                  aria-label="Chat history"
                >
                  <HistoryIcon className="size-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Chat history</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Theme Toggle */}
          <div className="mt-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="shrink-0 border-b border-border px-6 py-4">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeftIcon className="size-4" />
                  <span className="text-sm">Back</span>
                </Link>
                <div className="h-4 w-px bg-border" />
                <h1 className="text-lg font-semibold text-foreground">Chat History</h1>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="shrink-0 border-b border-border px-6 py-4">
            <div className="mx-auto max-w-4xl">
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {filteredConversations.length} result{filteredConversations.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
                </p>
              )}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-4xl">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <MessageIcon className="mb-4 size-12 text-muted-foreground" />
                  <h2 className="mb-2 text-lg font-medium text-foreground">No conversations yet</h2>
                  <p className="mb-6 text-muted-foreground">
                    Start a new conversation to see it here
                  </p>
                  <Link
                    href="/"
                    onClick={() => startNewConversation()}
                    className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md"
                  >
                    <PlusIcon className="size-4" />
                    New conversation
                  </Link>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <SearchIcon className="mb-4 size-12 text-muted-foreground" />
                  <h2 className="mb-2 text-lg font-medium text-foreground">No results found</h2>
                  <p className="text-muted-foreground">
                    Try a different search term
                  </p>
                </div>
              ) : (
                <>
                  {renderConversationGroup("Today", groupedConversations.today)}
                  {renderConversationGroup("Yesterday", groupedConversations.yesterday)}
                  {renderConversationGroup("This Week", groupedConversations.thisWeek)}
                  {renderConversationGroup("This Month", groupedConversations.thisMonth)}
                  {renderConversationGroup("Older", groupedConversations.older)}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
