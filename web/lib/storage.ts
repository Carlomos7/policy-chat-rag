import type { ConversationStore, Message } from "./types";

const STORAGE_KEY = "policy-chat-store";
const MESSAGES_KEY = "policy-chat-messages";
const MAX_CONVERSATIONS = 100; // Limit to prevent localStorage overflow

export function getConversationStore(): ConversationStore {
  if (typeof window === "undefined") {
    return { conversations: [], active_thread_id: null };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse conversation store:", e);
  }
  
  return { conversations: [], active_thread_id: null };
}

export function saveConversationStore(store: ConversationStore): void {
  if (typeof window === "undefined") return;
  
  try {
    // Prune old conversations if exceeding limit
    if (store.conversations.length > MAX_CONVERSATIONS) {
      const oldConversations = store.conversations.slice(MAX_CONVERSATIONS);
      store.conversations = store.conversations.slice(0, MAX_CONVERSATIONS);
      
      // Clean up messages for removed conversations
      oldConversations.forEach(c => {
        try {
          localStorage.removeItem(`${MESSAGES_KEY}-${c.thread_id}`);
        } catch {
          // Ignore cleanup errors
        }
      });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    // Handle quota exceeded error
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn("localStorage quota exceeded, cleaning up old data...");
      cleanupOldData(store);
    } else {
      console.error("Failed to save conversation store:", e);
    }
  }
}

// Clean up oldest conversations when storage is full
function cleanupOldData(store: ConversationStore): void {
  try {
    // Remove oldest half of conversations
    const toRemove = store.conversations.slice(Math.floor(store.conversations.length / 2));
    store.conversations = store.conversations.slice(0, Math.floor(store.conversations.length / 2));
    
    toRemove.forEach(c => {
      try {
        localStorage.removeItem(`${MESSAGES_KEY}-${c.thread_id}`);
      } catch {
        // Ignore
      }
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error("Failed to cleanup old data:", e);
  }
}

export function deleteConversation(threadId: string): void {
  const store = getConversationStore();
  store.conversations = store.conversations.filter(
    (c) => c.thread_id !== threadId
  );
  
  if (store.active_thread_id === threadId) {
    store.active_thread_id = store.conversations[0]?.thread_id ?? null;
  }
  
  saveConversationStore(store);
  deleteMessages(threadId);
}

export function getMessages(threadId: string): Message[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(`${MESSAGES_KEY}-${threadId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse messages:", e);
  }
  
  return [];
}

export function saveMessages(threadId: string, messages: Message[]): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(`${MESSAGES_KEY}-${threadId}`, JSON.stringify(messages));
  } catch (e) {
    console.error("Failed to save messages:", e);
  }
}

function deleteMessages(threadId: string): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(`${MESSAGES_KEY}-${threadId}`);
  } catch (e) {
    console.error("Failed to delete messages:", e);
  }
}

export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
