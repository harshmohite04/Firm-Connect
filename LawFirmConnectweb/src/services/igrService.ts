import axios from "axios";

const IGR_API_URL = import.meta.env.VITE_RAG_API_URL || "http://localhost:8000";

// Helper to get auth headers (matches ragService.ts pattern)
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

// ===== Interfaces =====

export interface IGRSearchParams {
  caseId: string;
  district: string;
  taluka: string;
  yearFrom: number;
  yearTo: number;
  partyName?: string;
  surveyNumber?: string;
}

export interface IGRRecord {
  doc_number: string;
  year: number;
  district: string;
  taluka: string;
  village: string;
  party_name_1: string;
  party_name_2: string;
  property_description: string;
  consideration_amount: number | null;
  registration_date: string | null;
  doc_type: string;
  pdf_url: string | null;
}

export interface IGRSearchResponse {
  results: IGRRecord[];
  count: number;
}

export interface IGRImportResponse {
  imported: string[];
  failed: string[];
  message?: string;
}

// ===== Service Methods =====

const igrService = {
  /**
   * Search for property documents in IGR Maharashtra.
   */
  search: async (params: IGRSearchParams): Promise<IGRSearchResponse> => {
    try {
      const response = await axios.post(
        `${IGR_API_URL}/igr/search`,
        {
          caseId: params.caseId,
          district: params.district,
          taluka: params.taluka,
          yearFrom: params.yearFrom,
          yearTo: params.yearTo,
          partyName: params.partyName || "",
          surveyNumber: params.surveyNumber || "",
        },
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error("IGR search failed:", error);
      throw error;
    }
  },

  /**
   * Import selected IGR records into case documents.
   */
  importRecords: async (
    caseId: string,
    records: IGRRecord[]
  ): Promise<IGRImportResponse> => {
    try {
      const response = await axios.post(
        `${IGR_API_URL}/igr/import`,
        {
          caseId,
          records,
        },
        {
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error("IGR import failed:", error);
      throw error;
    }
  },
};

export { IGRSearchParams, IGRRecord, IGRSearchResponse, IGRImportResponse };
export default igrService;
