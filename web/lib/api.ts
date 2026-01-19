import type { StreamChunk } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const REQUEST_TIMEOUT = 30000; // 30 seconds

export type ConnectionStatus = "connected" | "disconnected" | "checking";

/**
 * Check if the API is available
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Create a new conversation thread.
 * Returns the thread ID for immediate navigation before sending message.
 */
export async function createThread(): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${API_BASE_URL}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to create thread: ${response.status}`);
    }

    const data = await response.json();
    return data.thread_id;
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get a user-friendly error message from various error types
 */
function getErrorMessage(error: unknown, status?: number): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out. Please try again.";
  }
  
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "Unable to connect to server. Please check your connection.";
  }

  if (status === 500) {
    return "Server error. Please try again later.";
  }

  if (status === 429) {
    return "Too many requests. Please wait a moment.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export async function* streamMessage(
  question: string,
  threadId: string | null
): AsyncGenerator<StreamChunk> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, thread_id: threadId }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error(getErrorMessage(error));
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(getErrorMessage(null, response.status));
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Process any remaining buffer content
        if (buffer.trim()) {
          const lines = buffer.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data) {
                try {
                  const chunk: StreamChunk = JSON.parse(data);
                  yield chunk;
                } catch (e) {
                  if (process.env.NODE_ENV === "development") {
                    console.warn("Skipping malformed SSE chunk:", data, e);
                  }
                }
              }
            }
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data) {
            try {
              const chunk: StreamChunk = JSON.parse(data);
              yield chunk;
            } catch (e) {
              // Skip malformed chunks - log in development
              if (process.env.NODE_ENV === "development") {
                console.warn("Skipping malformed SSE chunk:", data, e);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Re-throw with more context
    throw new Error(`Stream error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    reader.releaseLock();
  }
}
