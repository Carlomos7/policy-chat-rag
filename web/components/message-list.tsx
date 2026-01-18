"use client";

import { useEffect, useRef, useState, useMemo, memo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrism from "rehype-prism-plus";
import { useChat } from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import { SparkleIcon, UserIcon, CopyIcon, CheckIcon, ArrowDownIcon } from "./icons";
import { SourcesSheet } from "./sources-sheet";
import StreamingText from "./streaming-text";
import type { Message } from "@/lib/types";

// Typing indicator with three animated dots
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex gap-2 sm:gap-4 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex size-7 sm:size-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
        <SparkleIcon className="size-4 sm:size-5 text-primary" />
      </div>
      <div className="rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm bg-card/80 text-card-foreground backdrop-blur-sm border border-border/50">
        <div className="flex items-center gap-1.5 h-5">
          <span className="size-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }} />
          <span className="size-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '600ms' }} />
          <span className="size-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '600ms' }} />
        </div>
      </div>
    </div>
  );
});

interface SourcesPillProps {
  sources: string[];
  onClick: () => void;
}

const SourcesPill = memo(function SourcesPill({ sources, onClick }: SourcesPillProps) {
  const count = sources.length;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition-all hover:bg-primary/20 hover:scale-105 hover:shadow-md active:scale-95"
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

interface CopyMarkdownButtonProps {
  content: string;
}

const CopyMarkdownButton = memo(function CopyMarkdownButton({ content }: CopyMarkdownButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [content]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95"
      title="Copy raw markdown"
    >
      {copied ? (
        <>
          <CheckIcon className="size-3 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <CopyIcon className="size-3" />
          Copy
        </>
      )}
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
  const showCursor = isStreaming && isLastMessage;
  
  const markdownComponents = useMemo(() => ({
    // Headings
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="mb-4 mt-6 text-xl font-bold first:mt-0">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="mb-3 mt-5 text-lg font-semibold first:mt-0">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>
    ),
    // Paragraphs
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
    ),
    // Lists
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    // Code - preserve Prism classes for syntax highlighting
    code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
      // Check if this is a code block (has language class from Prism) or inline code
      const isCodeBlock = className?.includes('language-');
      
      if (isCodeBlock) {
        // Code block - Prism handles styling, just pass through
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
      
      // Inline code
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs break-all">
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }: { children?: React.ReactNode }) => (
      <pre className="mb-3 overflow-x-auto rounded-lg last:mb-0 max-w-full" {...props}>
        {children}
      </pre>
    ),
    // Blockquote
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="mb-3 border-l-2 border-primary pl-4 italic last:mb-0">
        {children}
      </blockquote>
    ),
    // Links
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 break-words"
      >
        {children}
      </a>
    ),
    // Strong/Bold
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    // Emphasis/Italic
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic">{children}</em>
    ),
    // Horizontal rule
    hr: () => <hr className="my-4 border-border" />,
    // GFM: Strikethrough
    del: ({ children }: { children?: React.ReactNode }) => (
      <del className="line-through opacity-70">{children}</del>
    ),
    // GFM: Tables
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="mb-3 overflow-x-auto last:mb-0">
        <table className="min-w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="border-b border-border bg-muted/50">{children}</thead>
    ),
    tbody: ({ children }: { children?: React.ReactNode }) => (
      <tbody className="divide-y divide-border">{children}</tbody>
    ),
    tr: ({ children }: { children?: React.ReactNode }) => (
      <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="px-3 py-2 text-left font-semibold">{children}</th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="px-3 py-2">{children}</td>
    ),
    // GFM: Task list items
    input: ({ checked, disabled, type }: { checked?: boolean; disabled?: boolean; type?: string }) => {
      if (type === "checkbox") {
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            readOnly
            className="mr-2 h-4 w-4 rounded border-border accent-primary"
          />
        );
      }
      return null;
    },
  }), []);

  return (
    <div
      className={cn(
        "flex gap-2 sm:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.role === "assistant" && (
        <div className="flex size-7 sm:size-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm">
          <SparkleIcon className="size-4 sm:size-5 text-primary" />
        </div>
      )}

      <div className="max-w-[85%] sm:max-w-[80%] min-w-0 space-y-2">
        <div
          className={cn(
            "rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm transition-all duration-150 ease-out overflow-hidden",
            message.role === "user"
              ? "bg-primary text-primary-foreground shadow-primary/20"
              : "bg-card/80 text-card-foreground backdrop-blur-sm border border-border/50"
          )}
        >
          {message.role === "assistant" ? (
            <div className="prose prose-sm prose-invert max-w-none text-card-foreground break-words">
              {showCursor ? (
                // While streaming: show plain text with typing cursor
                <StreamingText
                  text={message.content}
                  isStreaming={true}
                  speed={15}
                />
              ) : (
                // After streaming: render full markdown
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[[rehypePrism, { ignoreMissing: true }]]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </div>
          )}
        </div>

        {/* Sources Pill */}
        {message.role === "assistant" &&
          message.sources &&
          message.sources.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-1">
              <SourcesPill
                sources={message.sources}
                onClick={() => onOpenSources(message.sources!)}
              />
              <CopyMarkdownButton content={message.content} />
            </div>
          )}

        {/* Copy button when no sources */}
        {message.role === "assistant" &&
          (!message.sources || message.sources.length === 0) && (
            <div className="px-1">
              <CopyMarkdownButton content={message.content} />
            </div>
          )}
      </div>

      {message.role === "user" && (
        <div className="flex size-7 sm:size-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/20 shadow-sm shadow-primary/10">
          <UserIcon className="size-4 sm:size-5 text-primary" />
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
  const { messages, activeThreadId, isStreaming, isLoading } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sheetSources, setSheetSources] = useState<string[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAnimationRef = useRef<number | null>(null);
  
  // Determine if we should show the typing indicator
  // Show when loading/streaming but no assistant response yet (or last message is from user)
  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = (isLoading || isStreaming) && 
    (!lastMessage || lastMessage.role === "user" || 
     (lastMessage.role === "assistant" && !lastMessage.content));

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Optimized auto-scroll with requestAnimationFrame
  useEffect(() => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }

    scrollAnimationRef.current = requestAnimationFrame(() => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        // Only auto-scroll if user is near bottom (include typing indicator)
        if (isNearBottom || isStreaming || showTypingIndicator) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: isStreaming || showTypingIndicator ? "auto" : "smooth",
          });
        }
      }
    });

    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, [messages, isStreaming, showTypingIndicator]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const handleOpenSources = useMemo(
    () => (sources: string[]) => {
      setSheetSources(sources);
      setIsSheetOpen(true);
    },
    []
  );

  if (!activeThreadId && messages.length === 0) {
    // Perplexity-style minimal landing - just return empty, input will be centered
    return null;
  }

  return (
    <>
      <div className="relative h-full w-full">
        {/* Screen reader announcement for streaming */}
        <div aria-live="polite" className="sr-only">
          {isStreaming ? "Response is being generated..." : ""}
        </div>
        
        <div
          ref={scrollRef}
          className="h-full w-full overflow-y-auto px-2 sm:px-4 py-4 sm:py-6 pb-32 sm:pb-40"
          data-scroll-container
        >
          <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
            {messages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                isStreaming={isStreaming}
                isLastMessage={index === messages.length - 1}
                onOpenSources={handleOpenSources}
              />
            ))}
            {showTypingIndicator && <TypingIndicator />}
          </div>
        </div>

        {/* Scroll to Bottom Button - positioned just above the fixed input area */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-all hover:bg-card/80 hover:shadow-xl hover:scale-105 active:scale-95"
            aria-label="Scroll to bottom"
          >
            <ArrowDownIcon className="size-4 text-primary" />
          </button>
        )}
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
