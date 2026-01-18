"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatLayout } from "@/components/chat-layout";
import { useChat } from "@/lib/chat-context";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.threadId as string;
  const { conversations, selectConversation, activeThreadId, isHydrated } = useChat();

  // Sync URL threadId with chat context
  useEffect(() => {
    // Wait for hydration before checking thread existence
    if (!isHydrated) return;
    
    if (threadId && threadId !== activeThreadId) {
      // Check if this thread exists
      const threadExists = conversations.some((c) => c.thread_id === threadId);
      if (threadExists) {
        selectConversation(threadId);
      } else {
        // Thread doesn't exist, redirect to home
        router.replace("/");
      }
    }
  }, [threadId, activeThreadId, conversations, selectConversation, router, isHydrated]);

  // Show loading state while hydrating
  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return <ChatLayout />;
}
