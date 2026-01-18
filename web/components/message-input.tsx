"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import { SendIcon, LoadingIcon, ZapIcon, LightbulbIcon, ListIcon, ScaleIcon } from "./icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Quick prompt definitions
const QUICK_PROMPTS = [
  {
    id: "summarize",
    label: "Summarize",
    icon: LightbulbIcon,
    message: `Summarize the key points of our conversation so far.
Include goals, decisions made, important constraints, and any open questions.
Use only information from the conversation and retrieved documents.`,
  },
  {
    id: "list-policies",
    label: "List Policies",
    icon: ListIcon,
    message: `List all policies, rules, or decisions that have been discussed so far.
Only include items explicitly mentioned.
If none were finalized, say so.`,
  },
  {
    id: "compare",
    label: "Compare",
    icon: ScaleIcon,
    message: `Compare and contrast the approaches discussed in this conversation.
Highlight key similarities, differences, and trade-offs.
Base your comparison only on information already covered.`,
  },
];

interface MessageInputProps {
  centered?: boolean;
}

export function MessageInput({ centered = false }: MessageInputProps) {
  const router = useRouter();
  const { sendMessage, startConversation, isLoading, isStreaming, activeThreadId } = useChat();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = isLoading || isStreaming;
  const canSend = input.trim().length > 0 && !isDisabled;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Focus textarea when conversation changes
  useEffect(() => {
    // Slight delay to ensure DOM is ready
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [activeThreadId]);

  const handleSubmit = async () => {
    if (!canSend) return;

    const message = input.trim();
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // For landing page: create thread first, navigate immediately, then send message
    if (centered) {
      const threadId = await startConversation(message);
      if (threadId) {
        // Navigate immediately (thread exists on backend)
        router.push(`/chat/${threadId}`);
        // Send message to the pre-created thread (will stream in background)
        sendMessage(message, threadId);
      }
    } else {
      // For chat page: just send to active thread
      await sendMessage(message);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (centered) {
    // Landing page centered input
    return (
      <div className="w-full">
        <div className="relative">
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg transition-shadow hover:shadow-xl">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about University of Richmond policies..."
              disabled={isDisabled}
              rows={1}
              className="max-h-[200px] min-h-[32px] w-full resize-none bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={!canSend}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
                canSend
                  ? "bg-primary text-white hover:bg-primary/90 hover:scale-105 hover:shadow-md active:scale-95"
                  : "cursor-not-allowed bg-primary/30 text-primary/50"
              )}
            >
              {isDisabled ? (
                <LoadingIcon className="h-5 w-5" />
              ) : (
                <SendIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chat view bottom input
  return (
    <div className="bg-transparent">
      <div className="mx-auto max-w-3xl p-4">
        <div className="flex items-end gap-3 rounded-2xl border border-border bg-background/90 backdrop-blur-sm px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about University of Richmond policies..."
            disabled={isDisabled}
            rows={1}
            className="max-h-[200px] min-h-[24px] w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          
          {/* Quick Actions Popover */}
          <Popover>
            <Tooltip>
              <PopoverTrigger asChild>
                <TooltipTrigger asChild>
                  <button
                    disabled={isDisabled}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                      isDisabled
                        ? "cursor-not-allowed bg-muted/50 text-muted-foreground/50"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:scale-105 active:scale-95"
                    )}
                    aria-label="Quick actions"
                  >
                    <ZapIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
              </PopoverTrigger>
              <TooltipContent side="top">
                <p>Quick actions</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent side="top" align="end" className="w-64 p-2 bg-background/90 backdrop-blur-sm">
              <div className="space-y-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Quick Actions</p>
                {QUICK_PROMPTS.map((prompt) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={prompt.id}
                      onClick={() => {
                        if (!isDisabled) {
                          sendMessage(prompt.message);
                        }
                      }}
                      disabled={isDisabled}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icon className="size-4 text-primary" />
                      <span>{prompt.label}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Send Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSubmit}
                disabled={!canSend}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                  canSend
                    ? "bg-primary/90 text-white hover:bg-primary hover:scale-105 active:scale-95"
                    : "cursor-not-allowed bg-primary/30 text-primary/50"
                )}
                aria-label={isDisabled ? "Sending..." : "Send message"}
              >
                {isDisabled ? (
                  <LoadingIcon className="h-4 w-4" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isDisabled ? "Sending..." : "Send message"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
