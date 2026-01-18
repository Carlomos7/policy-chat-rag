"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { MobileNavSheet } from "@/components/mobile-nav-sheet";
import { MessageInput } from "@/components/message-input";
import { TypewriterText } from "@/components/typewriter-text";
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

function SuggestedPrompt({ text }: { text: string }) {
  const router = useRouter();
  const { sendMessage, startConversation, isLoading, isStreaming } = useChat();

  const handleClick = async () => {
    if (!isLoading && !isStreaming) {
      const threadId = await startConversation(text);
      if (threadId) {
        router.push(`/chat/${threadId}`);
        sendMessage(text, threadId);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || isStreaming}
      className="rounded-full border border-border bg-card/50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:border-primary/30 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {text}
    </button>
  );
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { startNewConversation } = useChat();

  const handleNewConversation = () => {
    startNewConversation();
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-full">
        {/* Desktop Icon Bar - Hidden on mobile */}
        <div className="relative z-50 hidden sm:flex h-full w-14 shrink-0 flex-col items-center border-r border-border bg-sidebar py-3">
          {/* Logo - clickable, starts new conversation */}
          <button
            onClick={handleNewConversation}
            className="mb-4 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 transition-all hover:from-primary/30 hover:to-primary/10 hover:shadow-md active:scale-95"
            aria-label="New conversation"
          >
            <SparkleIcon className="size-5 text-primary" />
          </button>

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
          <div className="shrink-0 border-b border-border px-3 sm:px-4">
            <div className="mx-auto flex h-12 max-w-3xl items-center justify-between gap-2">
              {/* Mobile: Hamburger + Logo */}
              <div className="flex sm:hidden items-center gap-3">
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors"
                  aria-label="Open menu"
                >
                  <MenuIcon className="size-5" />
                </button>
                <div className="flex items-center gap-2">
                  <SparkleIcon className="size-5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    policy chatbot.
                  </span>
                </div>
              </div>

              {/* Desktop: Empty spacer */}
              <div className="hidden sm:block" />

              <ConnectionStatus />
            </div>
          </div>

          {/* Desktop Landing View - Centered */}
          <div className="hidden sm:flex flex-1 flex-col items-center justify-center p-8">
            <div className="w-full max-w-3xl">
              {/* Title with icon inline and typewriter effect */}
              <h1 className="mb-2 flex items-center justify-center gap-3 text-4xl md:text-5xl font-light tracking-tight text-foreground">
                <SparkleIcon className="size-8 md:size-10 text-primary animate-in fade-in zoom-in duration-500" />
                <TypewriterText
                  text="policy chatbot."
                  speed={70}
                  delay={400}
                  showCursorAfterComplete={true}
                />
              </h1>

              {/* Subtitle */}
              <p className="mb-10 text-center text-base md:text-lg text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                Get answers from the official University of Richmond policy
                manual covering academic, HR, IT security, financial, and campus
                operations.
              </p>

              {/* Input with animation */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <MessageInput centered />
              </div>

              {/* Suggested prompts */}
              <div className="mt-8 flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                {[
                  "What is the alcohol policy?",
                  "Remote work guidelines",
                  "Academic integrity rules",
                ].map((prompt) => (
                  <SuggestedPrompt key={prompt} text={prompt} />
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Landing View - Title at top, input at bottom */}
          <div className="flex sm:hidden flex-1 flex-col">
            {/* Top section with title */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
              <h1 className="text-2xl font-medium text-center text-foreground leading-snug">
                <TypewriterText
                  text="What policy do you want to know about?"
                  speed={50}
                  delay={300}
                  showCursorAfterComplete={true}
                />
              </h1>
            </div>

            {/* Bottom section with prompts and input */}
            <div className="px-3 pb-4 space-y-3">
              {/* Suggested prompts */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "What is the alcohol policy?",
                  "Remote work guidelines",
                  "Academic integrity rules",
                ].map((prompt) => (
                  <SuggestedPrompt key={prompt} text={prompt} />
                ))}
              </div>

              {/* Input */}
              <MessageInput centered />
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
