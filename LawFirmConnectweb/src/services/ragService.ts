import axios from "axios";
import { handleRateLimitError } from "../utils/rateLimitHandler";

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

const ragService = {
  /**
   * Ingests a document into the RAG system.
   * @param caseId The ID of the case.
   * @param file The file object to upload.
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

        // Surface rate limit errors immediately — no retry
        if (status === 429) {
          handleRateLimitError(error.config?.url || "/ingest");
          throw error;
        }

        // Retry on 401 (auth race condition) or 5xx errors
        if ((status === 401 || status >= 500) && attempt < retries) {
          // Wait with exponential backoff before retrying
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
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/retry-ingest");
      }
      console.error("Retry ingest failed", error);
      throw error;
    }
  },

  /**
   * Sends a chat message to the RAG system.
   * (Replaces direct axios calls in CaseChat.tsx for cleaner code)
   */
  /**
   * Sends a chat message to the RAG system.
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
          sessionId, // Optional
        },
        {
          headers: getAuthHeaders(),
        },
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/chat");
      }
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
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/documents");
      }
      console.error("Fetch document statuses failed:", error);
      return [];
    }
  },

  /**
   * Get chat history by sessionId (or caseId for legacy support)
   */
  getHistory: async (id: string) => {
    try {
      const response = await axios.get(`${RAG_API_URL}/chat/history/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/chat");
      }
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
      return response.data; // { session_id, title, created_at }
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/chat");
      }
      console.error("Create session failed:", error);
      throw error;
    }
  },

  renameSession: async (sessionId: string, title: string) => {
    try {
      const response = await axios.patch(
        `${RAG_API_URL}/chat/session/${sessionId}`,
        { title },
        { headers: getAuthHeaders() },
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/chat");
      }
      console.error("Rename session failed:", error);
      throw error;
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      const response = await axios.delete(
        `${RAG_API_URL}/chat/session/${sessionId}`,
        { headers: getAuthHeaders() },
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/chat");
      }
      console.error("Delete session failed:", error);
      throw error;
    }
  },

  getSessions: async (caseId: string) => {
    try {
      const response = await axios.get(
        `${RAG_API_URL}/chat/sessions/${caseId}`,
        { headers: getAuthHeaders() },
      );
      return response.data; // [{ session_id, title, created_at }]
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/chat");
      }
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
      return response.data; // { filename, pages: [{text, page_number?, file_type?}] }
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/document-text");
      }
      console.error("Fetch document text failed:", error);
      throw error;
    }
  },

  /**
   * Streaming chat using SSE. Tokens arrive in real-time.
   * Returns an AbortController so the caller can cancel mid-stream.
   */
  chatStream: (
    caseId: string,
    message: string,
    top_k: number = 5,
    sessionId: string | undefined,
    onToken: (token: string) => void,
    onContexts: (contexts: Array<{ content: string; source?: string; metadata?: any; score?: number }>) => void,
    onDone: (fullAnswer: string, usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void,
    onError: (error: string) => void,
    modelOverride?: string,
  ): AbortController => {
    const controller = new AbortController();
    const headers = getAuthHeaders();

    fetch(`${RAG_API_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      } as HeadersInit,
      body: JSON.stringify({ message, caseId, top_k, sessionId, model_override: modelOverride }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 429) {
          handleRateLimitError("/chat/stream");
          onError("Too many requests. Please wait a moment.");
          return;
        }
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          onError(errData.detail || `HTTP ${response.status}`);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          onError("No response body");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const dataLine = line.replace(/^data: /, "").trim();
            if (!dataLine) continue;
            try {
              const event = JSON.parse(dataLine);
              if (event.type === "token") {
                onToken(event.content);
              } else if (event.type === "contexts") {
                onContexts(event.contexts);
              } else if (event.type === "done") {
                onDone(event.answer, event.usage);
              } else if (event.type === "error") {
                onError(event.detail || "Unknown streaming error");
              }
            } catch {
              // skip malformed SSE data
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          onError(err.message || "Stream connection failed");
        }
      });

    return controller;
  },

  /**
   * Submit thumbs up/down feedback on an AI message.
   */
  submitFeedback: async (
    sessionId: string,
    messageId: number,
    feedback: "up" | "down",
    messageContent?: string,
  ) => {
    try {
      const response = await axios.post(
        `${RAG_API_URL}/chat/feedback`,
        { session_id: sessionId, message_id: messageId, feedback, message_content: messageContent },
        { headers: getAuthHeaders() },
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/chat/feedback");
      }
      console.error("Submit feedback failed:", error);
      throw error;
    }
  },

  /**
   * Truncate session messages after a given index (for edit & resubmit).
   */
  truncateSession: async (sessionId: string, afterIndex: number) => {
    try {
      const response = await axios.patch(
        `${RAG_API_URL}/chat/session/${sessionId}/truncate`,
        { after_index: afterIndex },
        { headers: getAuthHeaders() },
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/chat/session/truncate");
      }
      console.error("Truncate session failed:", error);
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
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/check-sources");
      }
      console.error("Check sources failed:", error);
      throw error;
    }
  },

  /**
   * Pin or unpin a session.
   */
  pinSession: async (sessionId: string, pinned: boolean) => {
    try {
      const response = await axios.patch(
        `${RAG_API_URL}/chat/session/${sessionId}/pin`,
        { pinned },
        { headers: getAuthHeaders() },
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/chat/session/pin");
      }
      console.error("Pin session failed:", error);
      throw error;
    }
  },

  /**
   * Search messages across sessions for a case.
   */
  searchMessages: async (caseId: string, query: string) => {
    try {
      const response = await axios.get(
        `${RAG_API_URL}/chat/search`,
        {
          params: { caseId, q: query },
          headers: getAuthHeaders(),
        },
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/chat/search");
      }
      console.error("Search messages failed:", error);
      throw error;
    }
  },

  /**
   * Get available LLM models.
   */
  getModels: async () => {
    try {
      const response = await axios.get(`${RAG_API_URL}/chat/models`, {
        headers: getAuthHeaders(),
      });
      return response.data.models;
    } catch (error: any) {
      console.error("Get models failed:", error);
      return [];
    }
  },

  /**
   * Get user's custom instructions.
   */
  getCustomInstructions: async () => {
    try {
      const response = await axios.get(
        `${RAG_API_URL}/chat/custom-instructions`,
        { headers: getAuthHeaders() },
      );
      return response.data;
    } catch (error: any) {
      console.error("Get custom instructions failed:", error);
      return { instructions: "" };
    }
  },

  /**
   * Set user's custom instructions.
   */
  setCustomInstructions: async (instructions: string) => {
    try {
      const response = await axios.put(
        `${RAG_API_URL}/chat/custom-instructions`,
        { instructions },
        { headers: getAuthHeaders() },
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 429) {
        handleRateLimitError(error.config?.url || "/chat/custom-instructions");
      }
      console.error("Set custom instructions failed:", error);
      throw error;
    }
  },
};

export default ragService;
