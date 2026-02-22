import axios from "axios";
// Assuming types are defined or inferred
import api from "./api";
// or just:
// import api from './api';

export interface Case {
  _id: string;
  title: string;
  description: string;
  caseNumber?: string;
  status: "Open" | "In Progress" | "Closed" | "Paused";
  legalMatter: string;
  assignedLawyers: any[]; // or User[]
  leadAttorney?: any; // Populated object or ID
  createdAt: string;
  updatedAt: string;
  recordStatus: number;
  investigationReport?: string; // Optional field for stored report
  settings?: {
    notifications: {
      email: boolean;
      sms: boolean;
    };
  };
  teamMembers?: {
    userId: any; // Populated User
    role: string;
    joinedAt: string;
  }[];
}

export interface ActivityLog {
  type: string;
  description: string;
  performedBy: any;
  createdAt: string;
}

export interface Document {
  _id: string;
  fileName: string;
  filePath: string;
  category: string;
  uploadedBy: any;
  uploadedAt: string;
  fileSize: number;
}

// -- Main Case Endpoints --

const getCases = async (userId?: string): Promise<Case[]> => {
  const url = userId ? `/cases?userId=${userId}` : "/cases";
  const response = await api.get(url);
  return response.data;
};

const getCaseById = async (id: string): Promise<Case> => {
  const response = await api.get(`/cases/${id}`);
  return response.data;
};

const createCase = async (caseData: any): Promise<Case> => {
  // Get token manually to bypass api instance config issues
  const userInfo = localStorage.getItem("user");
  let token = "";
  if (userInfo) {
    try {
      token = JSON.parse(userInfo).token;
    } catch (e) {
      console.error("Error parsing user info", e);
    }
  }

  // Use raw axios to ensure clean state
  const response = await axios.post(
    `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/cases`,
    caseData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        // Do NOT set Content-Type; let browser handle it for FormData
      },
    },
  );
  return response.data;
};

// Soft Delete via Settings or Main
const deleteCase = async (id: string): Promise<void> => {
  await api.delete(`/cases/${id}`);
};

// -- Documents Tab --

const getCaseDocuments = async (id: string): Promise<Document[]> => {
  const response = await api.get(`/cases/${id}/documents`);
  return response.data;
};

const uploadDocument = async (
  id: string,
  formData: FormData,
): Promise<Document[]> => {
  const response = await api.post(`/cases/${id}/documents`, formData, {
    headers: {
      "Content-Type": undefined,
    },
  });
  return response.data;
};

const deleteDocument = async (
  caseId: string,
  documentId: string,
): Promise<void> => {
  await api.delete(`/cases/${caseId}/documents/${documentId}`);
};

// -- Activity Tab --

const getCaseActivity = async (id: string): Promise<ActivityLog[]> => {
  const response = await api.get(`/cases/${id}/activity`);
  return response.data;
};

const addCaseActivity = async (
  id: string,
  activityData: { description: string; type?: string },
): Promise<ActivityLog[]> => {
  const response = await api.post(`/cases/${id}/activity`, activityData);
  return response.data;
};

// -- Settings Tab --

const updateCaseSettings = async (id: string, updates: any): Promise<Case> => {
  const response = await api.patch(`/cases/${id}/settings`, updates);
  return response.data;
};

// -- Investigator Agent --

// Note: This calls the Python server (port 8000) directly or via proxy if configured.
// However, the current setup seems to have two backends: Node/Express (port 5000) and Python (port 8000).
// 'api' instance likely points to Node backend.
// checking ragService.ts, it uses direct axios call to 8000 for AI stuff.
// So we should do the same here.

const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || "http://localhost:8000";

// Helper to get auth headers for Python backend
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

export interface InvestigationFact {
  id: string;
  description: string;
  entities: string[];
  confidence: number;
  date?: string;
  source_quote?: string;
  source_doc_id?: string;
}

export interface InvestigationConflict {
  description: string;
  conflicting_fact_ids: string[];
  resolution_status: string;
  resolution_note?: string;
}

export interface InvestigationStructuredData {
  entities: string[];
  facts: InvestigationFact[];
  timeline: Record<string, any>[];
  conflicts: InvestigationConflict[];
  risks: Record<string, any>[];
  evidence_gaps: Record<string, any>[];
  hypotheses: Record<string, any>[];
  legal_issues: Record<string, any>[];
}

export interface InvestigationStats {
  fact_count: number;
  entity_count: number;
  conflict_count: number;
  risk_count: number;
  timeline_count: number;
  evidence_gap_count: number;
  document_count: number;
  revision_count: number;
  avg_confidence: number;
  overall_risk_level: string;
  errors?: { agent: string; error: string }[];
}

export interface InvestigationReport {
  _id: string;
  final_report: string;
  focus_questions?: string[];
  structured_data?: InvestigationStructuredData;
  metadata?: InvestigationStats;
  created_at: string;
}

export interface InvestigationProgressEvent {
  type: "progress" | "complete" | "error";
  step?: string;
  label?: string;
  progress?: number;
  final_report?: string;
  reportId?: string;
  detail?: string;
  structured_data?: InvestigationStructuredData;
  stats?: InvestigationStats;
}

export interface InvestigationJobStatus {
  jobId: string;
  status: "running" | "completed" | "error";
  progress: number;
  progressLabel: string;
  currentStep: string;
  reportId?: string;
  finalReport?: string;
  structuredData?: InvestigationStructuredData;
  stats?: InvestigationStats;
  error?: string;
}

const runInvestigation = async (
  caseId: string,
  focusQuestions?: string[],
): Promise<{ final_report: string; reportId?: string }> => {
  const response = await axios.post(
    `${RAG_API_URL}/investigation/run`,
    {
      caseId,
      focusQuestions: focusQuestions || [],
    },
    {
      headers: getAuthHeaders(),
    },
  );
  return response.data;
};

const runInvestigationStream = (
  caseId: string,
  focusQuestions: string[],
  onProgress: (event: InvestigationProgressEvent) => void,
  onError: (error: string) => void,
): AbortController => {
  const controller = new AbortController();
  const headers = getAuthHeaders();

  fetch(`${RAG_API_URL}/investigation/run-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    } as HeadersInit,
    body: JSON.stringify({ caseId, focusQuestions }),
    signal: controller.signal,
  })
    .then(async (response) => {
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
            const event: InvestigationProgressEvent = JSON.parse(dataLine);
            onProgress(event);
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
};

const getInvestigationReports = async (
  caseId: string,
): Promise<InvestigationReport[]> => {
  const response = await axios.get(
    `${RAG_API_URL}/investigation/reports/${caseId}`,
    {
      headers: getAuthHeaders(),
    },
  );
  return response.data;
};

const startInvestigationBackground = async (
  caseId: string,
  focusQuestions?: string[],
): Promise<{ jobId: string }> => {
  const response = await axios.post(
    `${RAG_API_URL}/investigation/run-background`,
    { caseId, focusQuestions: focusQuestions || [] },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

const getInvestigationStatus = async (
  jobId: string,
): Promise<InvestigationJobStatus> => {
  const response = await axios.get(
    `${RAG_API_URL}/investigation/status/${jobId}`,
    { headers: getAuthHeaders() },
  );
  return response.data;
};

const getActiveInvestigationJob = async (
  caseId: string,
): Promise<{ hasActiveJob: boolean; jobId?: string; progress?: number; progressLabel?: string; currentStep?: string }> => {
  const response = await axios.get(
    `${RAG_API_URL}/investigation/active-job/${caseId}`,
    { headers: getAuthHeaders() },
  );
  return response.data;
};

// -- Document Generation --
const generateDocument = async (
  caseId: string,
  instructions: string,
): Promise<string> => {
  // using raw axios or api instance. server.py has /generate-document
  // server.py runs on 8000, but caseService seems to use api instance which might point to 5000 (node backend)?
  // Wait, the python server is likely the one with RAG.
  // server.py is FastAPI on 8000.
  // createCase uses localhost:5000.
  // I need to hit the Python server for RAG.

  // server.py has: @app.post("/generate-document")

  const response = await axios.post(
    `${import.meta.env.VITE_RAG_API_URL || "http://localhost:8000"}/generate-document`,
    {
      caseId,
      instructions,
    },
    {
      headers: getAuthHeaders(),
    },
  );
  return response.data.content;
};

const saveGeneratedDocument = async (
  caseId: string,
  filename: string,
  content: string,
): Promise<any> => {
  const response = await axios.post(
    `${import.meta.env.VITE_RAG_API_URL || "http://localhost:8000"}/save-document`,
    {
      caseId,
      filename,
      content,
    },
    {
      headers: getAuthHeaders(),
    },
  );
  return response.data;
};

const caseService = {
  getCases,
  getCaseById,
  createCase,
  deleteCase,

  getCaseDocuments,
  uploadDocument,
  deleteDocument,

  getCaseActivity,
  addCaseActivity,

  updateCaseSettings,
  generateDocument,
  saveGeneratedDocument,

  runInvestigation,
  runInvestigationStream,
  getInvestigationReports,
  startInvestigationBackground,
  getInvestigationStatus,
  getActiveInvestigationJob,

  // -- Team Management --
  validateTeamMember: async (id: string, email: string) => {
    const response = await api.post(`/cases/${id}/team/validate`, { email });
    return response.data;
  },

  addTeamMember: async (id: string, email: string, role: string) => {
    const response = await api.post(`/cases/${id}/team/members`, {
      email,
      role,
    });
    return response.data;
  },

  removeTeamMember: async (id: string, userId: string) => {
    const response = await api.delete(`/cases/${id}/team/members/${userId}`);
    return response.data;
  },

  // -- Conversational Draft --
  createDraftSession: async (
    caseId: string,
    template: string,
    title: string,
  ) => {
    const response = await axios.post(
      `${RAG_API_URL}/draft/session`,
      {
        caseId,
        template,
        title,
      },
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  },

  getDraftSessions: async (caseId: string) => {
    const response = await axios.get(
      `${RAG_API_URL}/draft/sessions/${caseId}`,
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  },

  getDraftSession: async (sessionId: string) => {
    const response = await axios.get(
      `${RAG_API_URL}/draft/session/${sessionId}`,
      { headers: getAuthHeaders() },
    );
    return response.data;
  },

  sendDraftMessage: async (
    caseId: string,
    sessionId: string,
    message: string,
    currentDocument: string,
    template?: string,
  ) => {
    const response = await axios.post(
      `${RAG_API_URL}/draft/chat`,
      {
        caseId,
        sessionId,
        message,
        currentDocument,
        template,
      },
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  },

  getTemplates: async () => {
    const response = await axios.get(`${RAG_API_URL}/draft/templates`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },
};

export default caseService;
