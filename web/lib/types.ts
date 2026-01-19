export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: string[];
}

export interface Conversation {
  thread_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationStore {
  conversations: Conversation[];
  active_thread_id: string | null;
}

export interface StreamChunk {
  content?: string;
  sources?: string[];
  thread_id: string;
  done?: boolean;
  error?: string;
}
