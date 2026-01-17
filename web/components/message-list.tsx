"use client";

import { useEffect, useRef, useState, useMemo, memo } from "react";
import ReactMarkdown from "react-markdown";
import { useChat } from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import { SparkleIcon, UserIcon } from "./icons";
import { SourcesSheet } from "./sources-sheet";
import type { Message } from "@/lib/types";

interface SourcesPillProps {
  sources: string[];
  onClick: () => void;
}

const SourcesPill = memo(function SourcesPill({ sources, onClick }: SourcesPillProps) {
  const count = sources.length;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
    >
      <svg
        className="size-3"
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
      {count} source{count !== 1 ? "s" : ""}
      <svg
        className="size-3 opacity-60"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
});

interface MessageItemProps {
  message: Message;
  isStreaming: boolean;
  isLastMessage: boolean;
  onOpenSources: (sources: string[]) => void;
}

const MessageItem = memo(function MessageItem({
  message,
  isStreaming,
  isLastMessage,
  onOpenSources
}: MessageItemProps) {
  const markdownComponents = useMemo(() => ({
    // Headings
    h1: ({ children }: { children: React.ReactNode }) => (
      <h1 className="mb-4 mt-6 text-xl font-bold first:mt-0">{children}</h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <h2 className="mb-3 mt-5 text-lg font-semibold first:mt-0">{children}</h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>
    ),
    // Paragraphs
    p: ({ children }: { children: React.ReactNode }) => (
      <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
    ),
    // Lists
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    // Code
    code: ({ className, children }: { className?: string; children: React.ReactNode }) => {
      const isInline = !className;
      return isInline ? (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          {children}
        </code>
      ) : (
        <code className="block overflow-x-auto rounded-lg bg-black p-3 font-mono text-xs">
          {children}
        </code>
      );
    },
    pre: ({ children }: { children: React.ReactNode }) => (
      <pre className="mb-3 overflow-x-auto rounded-lg bg-black p-3 last:mb-0">
        {children}
      </pre>
    ),
    // Blockquote
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className="mb-3 border-l-2 border-primary pl-4 italic last:mb-0">
        {children}
      </blockquote>
    ),
    // Links
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80"
      >
        {children}
      </a>
    ),
    // Strong/Bold
    strong: ({ children }: { children: React.ReactNode }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    // Emphasis/Italic
    em: ({ children }: { children: React.ReactNode }) => (
      <em className="italic">{children}</em>
    ),
    // Horizontal rule
    hr: () => <hr className="my-4 border-border" />,
  }), []);

  return (
    <div
      className={cn(
        "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.role === "assistant" && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <SparkleIcon className="size-4 text-primary" />
        </div>
      )}

      <div className="max-w-[80%] space-y-2">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 transition-all duration-150 ease-out",
            message.role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground"
          )}
        >
          {message.role === "assistant" ? (
            <div className="relative">
              <div className="prose prose-sm prose-invert max-w-none text-card-foreground">
                <ReactMarkdown components={markdownComponents}>
                  {message.content}
                </ReactMarkdown>
              </div>
              {isStreaming && isLastMessage && (
                <span className="absolute -right-6 top-1 size-2 animate-pulse rounded-full bg-primary" />
              )}
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
          )}
        </div>

        {/* Sources Pill */}
        {message.role === "assistant" &&
          message.sources &&
          message.sources.length > 0 && (
            <div className="px-1">
              <SourcesPill
                sources={message.sources}
                onClick={() => onOpenSources(message.sources!)}
              />
            </div>
          )}
      </div>

      {message.role === "user" && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserIcon className="size-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.sources === nextProps.message.sources &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isLastMessage === nextProps.isLastMessage
  );
});

export function MessageList() {
  const { messages, activeThreadId, isStreaming } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sheetSources, setSheetSources] = useState<string[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const scrollAnimationRef = useRef<number | null>(null);

  // Optimized auto-scroll with requestAnimationFrame
  useEffect(() => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }

    scrollAnimationRef.current = requestAnimationFrame(() => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        // Only auto-scroll if user is near bottom
        if (isNearBottom || isStreaming) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: isStreaming ? "auto" : "smooth",
          });
        }
      }
    });

    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, [messages, isStreaming]);

  const handleOpenSources = useMemo(
    () => (sources: string[]) => {
      setSheetSources(sources);
      setIsSheetOpen(true);
    },
    []
  );

  if (!activeThreadId && messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <SparkleIcon className="size-8 text-primary" />
          </div>
          <h1 className="mb-3 text-3xl font-semibold text-foreground">
            What do you want to know?
          </h1>
          <p className="text-muted-foreground">
            Ask any question about company policies and I&apos;ll help you find the answer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        data-scroll-container
      >
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              isStreaming={isStreaming}
              isLastMessage={index === messages.length - 1}
              onOpenSources={handleOpenSources}
            />
          ))}
        </div>
      </div>

      {/* Sources Sheet */}
      <SourcesSheet
        sources={sheetSources}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </>
  );
}
