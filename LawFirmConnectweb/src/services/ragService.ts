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
   * Get chat history by sessionId (or caseId for legacy support)
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
      return response.data; // { session_id, title, created_at }
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
      return response.data; // [{ session_id, title, created_at }]
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
      return response.data; // { filename, pages: [{text, page_number?, file_type?}] }
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
