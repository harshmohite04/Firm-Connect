import api from "./api";

export interface AttentionItem {
  type: "overdue_case" | "upcoming_deadline" | "unread_messages";
  title?: string;
  caseId?: string;
  eventId?: string;
  daysSinceActivity?: number;
  startsIn?: string;
  count?: number;
}

export interface ActivityItem {
  type: string;
  description: string;
  caseTitle: string;
  caseId: string;
  createdAt: string;
}

export interface DashboardEvent {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  type?: string;
  isOnlineMeeting?: boolean;
  meetingLink?: string | null;
  attendees?: { _id: string; firstName: string; lastName: string }[];
}

export interface DashboardCase {
  _id: string;
  title: string;
  status: string;
  legalMatter: string;
  clientName?: string;
  caseNumber?: string;
  updatedAt: string;
  createdAt: string;
}

export interface DashboardData {
  stats: {
    activeCases: number;
    pendingCases: number;
    unreadMessages: number;
    upcomingEvents: number;
  };
  needsAttention: AttentionItem[];
  recentActivity: ActivityItem[];
  upcomingEvents: DashboardEvent[];
  recentCases: DashboardCase[];
}

const portalService = {
  getDashboard: async (): Promise<DashboardData> => {
    const { data } = await api.get("/portal/dashboard");
    return data;
  },
};

export default portalService;
