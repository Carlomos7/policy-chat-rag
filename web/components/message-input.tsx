"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useChat } from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import { SendIcon, LoadingIcon } from "./icons";

export function MessageInput() {
  const { sendMessage, isLoading, isStreaming } = useChat();
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

  const handleSubmit = async () => {
    if (!canSend) return;

    const message = input.trim();
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessage(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-background px-4 py-4">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border bg-card px-4 py-3 transition-colors",
            "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30"
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={isDisabled}
            rows={1}
            className={cn(
              "max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
              isDisabled && "opacity-50"
            )}
          />
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              canSend
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isDisabled ? (
              <LoadingIcon className="size-4" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
