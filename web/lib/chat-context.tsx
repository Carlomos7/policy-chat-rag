"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Conversation, Message } from "./types";
import {
  getConversationStore,
  saveConversationStore,
  getMessages,
  saveMessages,
  generateMessageId,
  deleteConversation as deleteConversationFromStorage,
} from "./storage";
import { streamMessage, checkHealth, createThread as createThreadApi, type ConnectionStatus } from "./api";

interface FailedMessage {
  content: string;
  threadId: string | null;
}

interface ChatContextValue {
  conversations: Conversation[];
  activeThreadId: string | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  isHydrated: boolean;
  connectionStatus: ConnectionStatus;
  failedMessage: FailedMessage | null;
  /** Create a new thread and set it as active. Returns the thread ID for immediate navigation. */
  startConversation: (initialMessage: string) => Promise<string | null>;
  /** Send a message to the active thread (or specified threadId if provided). */
  sendMessage: (content: string, threadId?: string) => Promise<string | null>;
  retryFailedMessage: () => Promise<void>;
  dismissFailedMessage: () => void;
  selectConversation: (threadId: string) => void;
  startNewConversation: () => void;
  deleteConversation: (threadId: string) => void;
  getMessagesForThread: (threadId: string) => Message[];
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Map<string, Message[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("checking");
  const [failedMessage, setFailedMessage] = useState<FailedMessage | null>(null);
  
  // Ref to track if a send is in progress (prevents double-submit)
  const sendInProgressRef = useRef(false);

  useEffect(() => {
    const store = getConversationStore();
    setConversations(store.conversations);
    setActiveThreadId(store.active_thread_id);

    const messages = new Map<string, Message[]>();
    for (const conv of store.conversations) {
      messages.set(conv.thread_id, getMessages(conv.thread_id));
    }
    setMessagesMap(messages);
    setIsHydrated(true);
  }, []);

  // Check API health on mount and periodically
  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      if (!mounted) return;
      const isHealthy = await checkHealth();
      if (mounted) {
        setConnectionStatus(isHealthy ? "connected" : "disconnected");
      }
    };

    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    // Also check on window focus
    const handleFocus = () => checkConnection();
    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveConversationStore({ conversations, active_thread_id: activeThreadId });
  }, [conversations, activeThreadId, isHydrated]);

  const messages = activeThreadId ? messagesMap.get(activeThreadId) ?? [] : [];

  const selectConversation = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

  const startNewConversation = useCallback(() => {
    setActiveThreadId(null);
  }, []);

  const deleteConversation = useCallback((threadId: string) => {
    deleteConversationFromStorage(threadId);
    setConversations((prev) => prev.filter((c) => c.thread_id !== threadId));
    setMessagesMap((prev) => {
      const next = new Map(prev);
      next.delete(threadId);
      return next;
    });
    setActiveThreadId((prev) => {
      if (prev === threadId) {
        const remaining = conversations.filter((c) => c.thread_id !== threadId);
        return remaining[0]?.thread_id ?? null;
      }
      return prev;
    });
  }, [conversations]);

  const updateAssistantMessage = useCallback(
    (threadId: string, messageId: string, content: string, sources?: string[]) => {
      setMessagesMap((prev) => {
        const existing = prev.get(threadId) ?? [];
        const next = new Map(prev);
        const updated = existing.map((m) =>
          m.id === messageId ? { ...m, content, sources: sources ?? m.sources } : m
        );

        // If message doesn't exist, add it
        if (!existing.find((m) => m.id === messageId)) {
          updated.push({
            id: messageId,
            role: "assistant",
            content,
            sources,
            timestamp: new Date().toISOString(),
          });
        }

        next.set(threadId, updated);
        return next;
      });
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string, providedThreadId?: string): Promise<string | null> => {
      // Double-submit prevention using ref (synchronous check)
      if (sendInProgressRef.current) return null;
      if (!content.trim() || isLoading || isStreaming) return null;

      sendInProgressRef.current = true;
      setIsLoading(true);
      setFailedMessage(null); // Clear any previous failed message

      const userMessage: Message = {
        id: generateMessageId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      // Use provided threadId (from startConversation) or fall back to active
      let currentThreadId = providedThreadId || activeThreadId;
      let isNewConversation = !currentThreadId;
      let streamAborted = false;
      let assistantContent = "";
      let sources: string[] | undefined;
      let errorMessage: string | null = null;
      const assistantMessageId = generateMessageId();

      if (currentThreadId) {
        setMessagesMap((prev) => {
          const next = new Map(prev);
          next.set(currentThreadId!, [...(next.get(currentThreadId!) ?? []), userMessage]);
          return next;
        });
      }

      try {
        setIsStreaming(true);

        for await (const chunk of streamMessage(content, currentThreadId)) {
          // Handle error chunk from API
          if (chunk.error) {
            errorMessage = chunk.error;
            streamAborted = true;
            break;
          }

          // Handle missing thread_id for new conversation - generate fallback
          if (isNewConversation) {
            const threadId = chunk.thread_id || `local-${generateMessageId()}`;
            currentThreadId = threadId;
            isNewConversation = false;

            const newConversation: Conversation = {
              thread_id: threadId,
              title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              message_count: 1,
            };

            setConversations((prev) => [newConversation, ...prev]);
            setActiveThreadId(threadId);
            setMessagesMap((prev) => {
              const next = new Map(prev);
              next.set(threadId, [userMessage]);
              return next;
            });
          }

          if (chunk.content) {
            assistantContent += chunk.content;
            if (currentThreadId) {
              updateAssistantMessage(currentThreadId, assistantMessageId, assistantContent);
            }
          }

          if (chunk.sources) {
            sources = chunk.sources;
            if (currentThreadId) {
              updateAssistantMessage(currentThreadId, assistantMessageId, assistantContent, sources);
            }
          }
        }

        // Handle stream error from chunk
        if (errorMessage) {
          throw new Error(errorMessage);
        }

        // Check if we got an empty response
        if (!streamAborted && currentThreadId && !assistantContent.trim()) {
          assistantContent = "I couldn't generate a response. Please try asking your question again.";
        }

        // Only save if stream completed successfully (not aborted)
        if (!streamAborted && currentThreadId) {
          const finalMessages = [
            ...(messagesMap.get(currentThreadId) ?? []).filter(
              (m) => m.id !== assistantMessageId
            ),
            userMessage,
            {
              id: assistantMessageId,
              role: "assistant" as const,
              content: assistantContent,
              sources,
              timestamp: new Date().toISOString(),
            },
          ].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);

          saveMessages(currentThreadId, finalMessages);

          setConversations((prev) =>
            prev.map((c) =>
              c.thread_id === currentThreadId
                ? { ...c, updated_at: new Date().toISOString(), message_count: finalMessages.length }
                : c
            )
          );
        }
      } catch (error) {
        streamAborted = true;
        const errMsg = error instanceof Error ? error.message : "An unexpected error occurred.";
        console.error("Failed to send message:", errMsg);

        // Store failed message for retry
        setFailedMessage({ content: content.trim(), threadId: currentThreadId });
        
        // Update connection status if it seems like a connection issue
        if (errMsg.includes("connect") || errMsg.includes("timed out")) {
          setConnectionStatus("disconnected");
        }

        // Show error in UI
        if (currentThreadId) {
          const errorResponseMessage: Message = {
            id: generateMessageId(),
            role: "assistant",
            content: assistantContent 
              ? `${assistantContent}\n\n⚠️ *Response interrupted: ${errMsg}*`
              : `Sorry, there was an error: ${errMsg}`,
            sources,
            timestamp: new Date().toISOString(),
          };
          setMessagesMap((prev) => {
            const next = new Map(prev);
            const existing = next.get(currentThreadId!) ?? [];
            // Remove incomplete assistant message if it exists
            const filtered = existing.filter((m) => m.id !== assistantMessageId);
            next.set(currentThreadId!, [...filtered, errorResponseMessage]);
            return next;
          });

          // Save partial state if we have content
          if (assistantContent) {
            const finalMessages = [
              ...(messagesMap.get(currentThreadId) ?? []).filter((m) => m.id !== assistantMessageId),
              userMessage,
              errorResponseMessage,
            ].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);
            saveMessages(currentThreadId, finalMessages);
          }
        }
      } finally {
        sendInProgressRef.current = false;
        setIsLoading(false);
        setIsStreaming(false);
      }
      
      // Return the thread ID for navigation purposes
      return currentThreadId;
    },
    [activeThreadId, isLoading, isStreaming, messagesMap, updateAssistantMessage]
  );

  const retryFailedMessage = useCallback(async () => {
    if (!failedMessage) return;
    const { content } = failedMessage;
    setFailedMessage(null);
    await sendMessage(content);
  }, [failedMessage, sendMessage]);

  const dismissFailedMessage = useCallback(() => {
    setFailedMessage(null);
  }, []);

  const getMessagesForThread = useCallback((threadId: string) => {
    return messagesMap.get(threadId) ?? [];
  }, [messagesMap]);

  /**
   * Create a new conversation thread and prepare it for the first message.
   * Returns the thread ID immediately for navigation, then sends the message.
   * This enables instant navigation before streaming starts.
   */
  const startConversation = useCallback(
    async (initialMessage: string): Promise<string | null> => {
      if (sendInProgressRef.current) return null;
      if (!initialMessage.trim() || isLoading || isStreaming) return null;

      try {
        // Create thread on backend first (fast ~50ms call)
        const threadId = await createThreadApi();

        // Set up the new conversation in state
        const newConversation: Conversation = {
          thread_id: threadId,
          title: initialMessage.slice(0, 50) + (initialMessage.length > 50 ? "..." : ""),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          message_count: 0,
        };

        setConversations((prev) => [newConversation, ...prev]);
        setActiveThreadId(threadId);
        setMessagesMap((prev) => {
          const next = new Map(prev);
          next.set(threadId, []);
          return next;
        });

        // Persist the new conversation
        saveConversationStore({
          conversations: [newConversation, ...conversations],
          active_thread_id: threadId,
        });

        // Return thread ID immediately for navigation
        // The caller will navigate, then call sendMessage with this threadId
        return threadId;
      } catch (error) {
        console.error("Failed to create thread:", error);
        setConnectionStatus("disconnected");
        return null;
      }
    },
    [conversations, isLoading, isStreaming]
  );

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeThreadId,
        messages,
        isLoading,
        isStreaming,
        isHydrated,
        connectionStatus,
        failedMessage,
        startConversation,
        sendMessage,
        retryFailedMessage,
        dismissFailedMessage,
        selectConversation,
        startNewConversation,
        deleteConversation,
        getMessagesForThread,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
