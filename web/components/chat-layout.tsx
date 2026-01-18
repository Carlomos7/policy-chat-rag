"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { MobileNavSheet } from "@/components/mobile-nav-sheet";
import { MessageList } from "@/components/message-list";
import { MessageInput } from "@/components/message-input";
import { useChat } from "@/lib/chat-context";
import { useTheme } from "@/lib/theme-context";
import {
  SparkleIcon,
  SunIcon,
  MoonIcon,
  PlusIcon,
  HistoryIcon,
  MenuIcon,
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

function ConnectionStatus() {
  const { connectionStatus } = useChat();

  if (connectionStatus === "connected") return null;

  return (
    <div
      className={`flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full ${
        connectionStatus === "checking"
          ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
          : "bg-red-500/10 text-red-600 dark:text-red-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${
          connectionStatus === "checking"
            ? "bg-yellow-500 animate-pulse"
            : "bg-red-500"
        }`}
      />
      <span className="hidden sm:inline">
        {connectionStatus === "checking" ? "Connecting..." : "Disconnected"}
      </span>
    </div>
  );
}

function RetryBanner() {
  const {
    failedMessage,
    retryFailedMessage,
    dismissFailedMessage,
    isLoading,
  } = useChat();

  if (!failedMessage) return null;

  return (
    <div className="mx-auto max-w-3xl px-2 sm:px-4 pt-2">
      <div className="flex items-center justify-between gap-2 sm:gap-3 rounded-lg bg-amber-500/10 px-3 sm:px-4 py-2 text-xs sm:text-sm text-amber-700 dark:text-amber-300">
        <span>Message failed</span>
        <div className="flex gap-2">
          <button
            onClick={retryFailedMessage}
            disabled={isLoading}
            className="rounded-md bg-amber-600 px-2 sm:px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Retry
          </button>
          <button
            onClick={dismissFailedMessage}
            className="rounded-md px-2 py-1 text-xs hover:bg-amber-500/20"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const { conversations, activeThreadId, startNewConversation } = useChat();

  // Redirect to home if thread no longer exists (was deleted)
  useEffect(() => {
    if (activeThreadId) {
      const threadExists = conversations.some(
        (c) => c.thread_id === activeThreadId
      );
      if (!threadExists) {
        router.replace("/");
      }
    }
  }, [activeThreadId, conversations, router]);

  // Get the active conversation title
  const activeConversation = conversations.find(
    (c) => c.thread_id === activeThreadId
  );
  const chatTitle = activeConversation?.title || "New Conversation";

  // Handle new conversation - navigate to home
  const handleNewConversation = () => {
    startNewConversation();
    router.push("/");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-full">
        {/* Desktop Icon Bar - Hidden on mobile */}
        <div className="relative z-50 hidden sm:flex h-full w-14 shrink-0 flex-col items-center border-r border-border bg-sidebar py-3">
          {/* Logo - clickable, starts new conversation */}
          <Link
            href="/"
            onClick={() => startNewConversation()}
            className="mb-4 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 transition-all hover:from-primary/30 hover:to-primary/10 hover:shadow-md active:scale-95"
            aria-label="New conversation"
          >
            <SparkleIcon className="size-5 text-primary" />
          </Link>

          {/* New Thread Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleNewConversation}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md active:scale-95"
                aria-label="New thread"
              >
                <PlusIcon className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>New thread</p>
            </TooltipContent>
          </Tooltip>

          {/* History Button - reveals sidebar on hover */}
          <div
            className="relative mt-2"
            onMouseEnter={() => setSidebarOpen(true)}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/history"
                  className="flex h-10 w-10 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                  aria-label="Chat history"
                >
                  <HistoryIcon className="size-5" />
                </Link>
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

        {/* Desktop Sidebar Panel - slides in from left on history hover */}
        <div
          className="hidden sm:block"
          onMouseLeave={() => setSidebarOpen(false)}
        >
          <ConversationSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Mobile Navigation Sheet */}
        <MobileNavSheet
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        {/* Main Content */}
        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Header Bar */}
          <div className="shrink-0 border-b border-border px-2 sm:px-4">
            <div className="mx-auto flex h-12 max-w-3xl items-center justify-between gap-2">
              {/* Mobile: Hamburger + Title */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Mobile Hamburger */}
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="flex sm:hidden h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors"
                  aria-label="Open menu"
                >
                  <MenuIcon className="size-5" />
                </button>

                <h1 className="truncate text-sm font-medium text-foreground min-w-0 flex-1">
                  {chatTitle}
                </h1>
              </div>

              <ConnectionStatus />
            </div>
          </div>

          {/* Chat View */}
          <div className="relative flex-1 overflow-hidden">
            <div className="h-full overflow-hidden">
              <MessageList />
            </div>
            <RetryBanner />
            <div className="absolute bottom-0 left-0 right-0">
              <MessageInput />
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
