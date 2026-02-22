import axios from "axios";

const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || "http://localhost:8000";

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

// --- Interfaces ---

export interface CaseLawSearchDoc {
  tid: number;
  title: string;
  headline?: string;
  docsource?: string;
  publishdate?: string;
  author?: string;
  numcites?: number;
  numcitedby?: number;
}

export interface CaseLawSearchResult {
  docs: CaseLawSearchDoc[];
  total?: number;
  found?: number;
}

export interface PrecedentFinderResult {
  queries: string[];
  docs: (CaseLawSearchDoc & { _matched_query?: string })[];
  total: number;
}

export interface CaseLawDocument {
  doc: string; // HTML content of the document
  title?: string;
}

export interface CaseLawMeta {
  title?: string;
  doctype?: string;
  docsource?: string;
  author?: string;
  bench?: string;
  publishdate?: string;
  numcites?: number;
  numcitedby?: number;
  citations?: { tid: number; title: string }[];
  citedby?: { tid: number; title: string }[];
}

export interface CaseLawBookmark {
  _id: string;
  userId: string;
  docId: number;
  title: string;
  court: string;
  date: string;
  practiceArea: string;
  tags: string[];
  notes: string;
  caseId?: string;
  createdAt: string;
}

// --- API Methods ---

const searchCases = async (params: {
  formInput: string;
  pagenum?: number;
  doctypes?: string;
  fromdate?: string;
  todate?: string;
}): Promise<CaseLawSearchResult> => {
  const response = await axios.post(`${RAG_API_URL}/case-law/search`, params, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

const getDocument = async (docId: number): Promise<CaseLawDocument> => {
  const response = await axios.get(`${RAG_API_URL}/case-law/doc/${docId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

const getDocMeta = async (docId: number): Promise<CaseLawMeta> => {
  const response = await axios.get(`${RAG_API_URL}/case-law/meta/${docId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

const bookmarkCase = async (data: {
  docId: number;
  title: string;
  court?: string;
  date?: string;
  practiceArea?: string;
  tags?: string[];
  notes?: string;
  caseId?: string;
}): Promise<{ status: string; message: string }> => {
  const response = await axios.post(`${RAG_API_URL}/case-law/bookmark`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

const getBookmarks = async (caseId?: string): Promise<CaseLawBookmark[]> => {
  const url = caseId
    ? `${RAG_API_URL}/case-law/bookmarks?caseId=${caseId}`
    : `${RAG_API_URL}/case-law/bookmarks`;
  const response = await axios.get(url, { headers: getAuthHeaders() });
  return response.data;
};

const removeBookmark = async (
  docId: number,
): Promise<{ status: string; message: string }> => {
  const response = await axios.delete(
    `${RAG_API_URL}/case-law/bookmark/${docId}`,
    { headers: getAuthHeaders() },
  );
  return response.data;
};

const updateBookmark = async (
  docId: number,
  data: { tags?: string[]; notes?: string; practiceArea?: string },
): Promise<{ status: string; message: string }> => {
  const response = await axios.patch(
    `${RAG_API_URL}/case-law/bookmark/${docId}`,
    data,
    { headers: getAuthHeaders() },
  );
  return response.data;
};

const findPrecedents = async (
  caseId: string,
): Promise<PrecedentFinderResult> => {
  const response = await axios.post(
    `${RAG_API_URL}/case-law/find-precedents/${caseId}`,
    {},
    { headers: getAuthHeaders() },
  );
  return response.data;
};

const caseLawService = {
  searchCases,
  getDocument,
  getDocMeta,
  bookmarkCase,
  getBookmarks,
  removeBookmark,
  updateBookmark,
  findPrecedents,
};

export default caseLawService;
