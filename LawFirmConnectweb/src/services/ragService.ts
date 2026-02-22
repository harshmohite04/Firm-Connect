import axios from "axios";

const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || "http://localhost:8000";

// Helper to get auth headers
const getAuthHeaders = () => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.token) {
        return { Authorization: `Bearer ${user.token}` };
      }
    } catch (e) {
      console.error("Error parsing user from localStorage", e);
    }
  }
  return {};
};

// Helper to get auth token string
const getAuthToken = (): string | null => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.token || null;
    } catch {
      return null;
    }
  }
  return null;
};

export interface SSECallbacks {
  onContexts?: (contexts: Array<{
    content: string;
    source?: string;
    metadata?: any;
    score?: number;
  }>) => void;
  onToken?: (token: string) => void;
  onDone?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

const ragService = {
  /**
   * Ingests a document into the RAG system.
   */
  ingestDocument: async (caseId: string, file: File, retries = 3) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caseId", caseId);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(`${RAG_API_URL}/ingest`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            ...getAuthHeaders(),
          },
        });
        return response.data;
      } catch (error: any) {
        const status = error?.response?.status;
        console.warn(
          `[RAG] Ingest attempt ${attempt}/${retries} failed for ${file.name}`,
          status,
        );

        if ((status === 401 || status >= 500) && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        console.error("RAG Ingestion failed:", error);
        throw error;
      }
    }
  },

  /**
   * Retries ingestion for a document.
   */
  retryIngest: async (caseId: string, filename: string) => {
    try {
      const response = await axios.post(
        `${RAG_API_URL}/retry-ingest`,
        { caseId, filename },
        { headers: getAuthHeaders() },
      );
      return response.data;
    } catch (error) {
      console.error("Retry ingest failed", error);
      throw error;
    }
  },

  /**
   * Sends a chat message using SSE streaming.
   * Returns an AbortController so the caller can cancel the stream.
   */
  chatStream: (
    caseId: string,
    message: string,
    callbacks: SSECallbacks,
    top_k: number = 5,
    sessionId?: string,
  ): AbortController => {
    const controller = new AbortController();

    const run = async () => {
      try {
        const token = getAuthToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${RAG_API_URL}/chat`, {
          method: "POST",
          headers,
          body: JSON.stringify({ message, caseId, top_k, sessionId }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (delimited by double newline)
          const events = buffer.split("\n\n");
          // Keep the last potentially incomplete event in the buffer
          buffer = events.pop() || "";

          for (const event of events) {
            const lines = event.trim().split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6);
              try {
                const data = JSON.parse(jsonStr);
                switch (data.type) {
                  case "contexts":
                    callbacks.onContexts?.(data.contexts || []);
                    break;
                  case "token":
                    callbacks.onToken?.(data.content || "");
                    break;
                  case "done":
                    callbacks.onDone?.(data.full_response || "");
                    break;
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("RAG Chat stream error:", error);
        callbacks.onError?.(error);
      }
    };

    run();
    return controller;
  },

  /**
   * Legacy non-streaming chat (fallback).
   */
  chat: async (
    caseId: string,
    message: string,
    top_k: number = 5,
    sessionId?: string,
  ) => {
    try {
      const response = await axios.post(
        `${RAG_API_URL}/chat`,
        {
          message,
          caseId,
          top_k,
          sessionId,
        },
        {
          headers: getAuthHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      console.error("RAG Chat failed:", error);
      throw error;
    }
  },

  getDocumentStatuses: async (caseId: string) => {
    try {
      const response = await axios.get(`${RAG_API_URL}/documents/${caseId}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error("Fetch document statuses failed:", error);
      return [];
    }
  },

  /**
   * Get chat history by sessionId
   */
  getHistory: async (id: string) => {
    try {
      const response = await axios.get(`${RAG_API_URL}/chat/history/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error("Fetch history failed:", error);
      throw error;
    }
  },

  createSession: async (caseId: string, title: string = "New Chat") => {
    try {
      const response = await axios.post(
        `${RAG_API_URL}/chat/session`,
        {
          caseId,
          title,
        },
        {
          headers: getAuthHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      console.error("Create session failed:", error);
      throw error;
    }
  },

  getSessions: async (caseId: string) => {
    try {
      const response = await axios.get(
        `${RAG_API_URL}/chat/sessions/${caseId}`,
        { headers: getAuthHeaders() },
      );
      return response.data;
    } catch (error) {
      console.error("Fetch sessions failed:", error);
      return [];
    }
  },

  /**
   * Fetch parsed text content of a document for the in-app viewer.
   */
  getDocumentText: async (caseId: string, filename: string) => {
    try {
      const response = await axios.get(
        `${RAG_API_URL}/document-text/${caseId}/${encodeURIComponent(filename)}`,
        { headers: getAuthHeaders() },
      );
      return response.data;
    } catch (error) {
      console.error("Fetch document text failed:", error);
      throw error;
    }
  },

  /**
   * Re-rank contexts against selected text using backend cosine similarity.
   */
  checkSources: async (
    selectedText: string,
    contexts: Array<{
      content: string;
      source?: string;
      metadata?: any;
      score?: number;
    }>,
  ) => {
    try {
      const response = await axios.post(
        `${RAG_API_URL}/check-sources`,
        { selectedText, contexts },
        { headers: getAuthHeaders() },
      );
      return response.data.contexts;
    } catch (error) {
      console.error("Check sources failed:", error);
      throw error;
    }
  },
};

export default ragService;
