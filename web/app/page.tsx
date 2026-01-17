"use client";

import { useState } from "react";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { MessageList } from "@/components/message-list";
import { MessageInput } from "@/components/message-input";
import { MenuIcon, SparkleIcon } from "@/components/icons";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <ConversationSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-foreground hover:bg-muted md:hidden"
          >
            <MenuIcon className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <SparkleIcon className="size-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Policy Chat</h1>
          </div>
        </header>

        {/* Messages */}
        <MessageList />

        {/* Input */}
        <MessageInput />
      </main>
    </div>
  );
}
