import axios from "axios";

const RAG_API_URL = "http://localhost:8000";

const ragService = {
  /**
   * Ingests a document into the RAG system.
   * @param caseId The ID of the case.
   * @param file The file object to upload.
   */
  ingestDocument: async (caseId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caseId", caseId);

    try {
      const response = await axios.post(`${RAG_API_URL}/ingest`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("RAG Ingestion failed:", error);
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
      const response = await axios.post(`${RAG_API_URL}/chat`, {
        message,
        caseId,
        top_k,
        sessionId, // Optional
      });
      return response.data;
    } catch (error) {
      console.error("RAG Chat failed:", error);
      throw error;
    }
  },

  getDocumentStatuses: async (caseId: string) => {
    try {
      const response = await axios.get(`${RAG_API_URL}/documents/${caseId}`);
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
      const response = await axios.get(`${RAG_API_URL}/chat/history/${id}`);
      return response.data;
    } catch (error) {
      console.error("Fetch history failed:", error);
      throw error;
    }
  },

  createSession: async (caseId: string, title: string = "New Chat") => {
    try {
      const response = await axios.post(`${RAG_API_URL}/chat/session`, {
        caseId,
        title,
      });
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
      );
      return response.data; // [{ session_id, title, created_at }]
    } catch (error) {
      console.error("Fetch sessions failed:", error);
      return [];
    }
  },
};

export default ragService;
