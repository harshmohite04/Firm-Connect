import api from "./api";

export interface Attachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export const messageService = {
  getMessages: async (contactId: string) => {
    const response = await api.get(`/messages/${contactId}`);
    return response.data;
  },

  sendMessage: async (contactId: string, content: string, file?: File) => {
    if (file) {
      const formData = new FormData();
      formData.append("contactId", contactId);
      formData.append("content", content);
      formData.append("attachment", file);
      const response = await api.post("/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    }
    const response = await api.post("/messages", { contactId, content });
    return response.data;
  },

  markAsRead: async (contactId: string) => {
    const response = await api.put(`/messages/read/${contactId}`);
    return response.data;
  },

  getConversations: async () => {
    const response = await api.get("/messages/conversations");
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get("/messages/unread/count");
    return response.data;
  },

  searchConversations: async (query: string) => {
    const response = await api.get(
      `/messages/search-conversations?q=${encodeURIComponent(query)}`
    );
    return response.data;
  },

  searchMessages: async (userId: string, query: string) => {
    const response = await api.get(
      `/messages/search?userId=${encodeURIComponent(userId)}&q=${encodeURIComponent(query)}`
    );
    return response.data;
  },
};
