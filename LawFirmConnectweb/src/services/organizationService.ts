import api from "./api";

export interface OrganizationMember {
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
  };
  role: "ADMIN" | "ADVOCATE";
  status: "ACTIVE" | "REMOVED";
  joinedAt: string;
  removedAt?: string;
}

export interface Organization {
  _id: string;
  name: string;
  description?: string;
  ownerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  plan: "FIRM";
  razorpaySubscriptionId?: string;
  seats: {
    _id: string;
    razorpaySubscriptionId: string;
    plan: "STARTER" | "PROFESSIONAL";
    status: "ACTIVE" | "INACTIVE";
    assignedTo: { _id: string; firstName: string; lastName: string; email: string } | null;
    createdAt: string;
  }[];
  members: OrganizationMember[];
  subscriptionStatus: string;
  subscriptionExpiresAt: string;
  activeMemberCount: number;
  activeSeats: number;
}

export interface Invitation {
  _id: string;
  invitedEmail: string;
  status: "pending" | "accepted" | "rejected" | "revoked";
  expiresAt: string;
}

export interface MyInvitation {
  _id: string;
  organizationId: { _id: string; name: string };
  invitedEmail: string;
  token: string;
  status: "pending";
  expiresAt: string;
}

export interface CaseForReassignment {
  _id: string;
  title: string;
  status: string;
}

const getOrganization = async (): Promise<Organization> => {
  const response = await api.get("/organization");
  return response.data.organization;
};

const getMembers = async (): Promise<{
  members: OrganizationMember[];
  totalSeats: number;
  usedSeats: number;
}> => {
  const response = await api.get("/organization/members");
  return response.data;
};

const inviteMember = async (
  email: string,
): Promise<{
  success: boolean;
  message: string;
  member: { email: string; firstName: string; lastName: string };
  _testPassword?: string;
}> => {
  const response = await api.post("/organization/invite", { email });
  return response.data;
};

const getInvitations = async (): Promise<Invitation[]> => {
  const response = await api.get("/organization/invitations");
  return response.data.invitations;
};

const acceptInvitation = async (
  token: string,
): Promise<{ message: string; organization: { id: string; name: string } }> => {
  const response = await api.post(`/organization/invitations/${token}/accept`);
  return response.data;
};

const rejectInvitation = async (
  token: string,
): Promise<{ message: string }> => {
  const response = await api.post(`/organization/invitations/${token}/reject`);
  return response.data;
};

const removeMember = async (
  userId: string,
): Promise<{
  message: string;
  casesNeedingReassignment: CaseForReassignment[];
}> => {
  const response = await api.delete(`/organization/members/${userId}`);
  return response.data;
};

const reassignCases = async (
  fromUserId: string,
  toUserId: string,
  caseIds: string[],
): Promise<{ message: string; reassignedCount: number }> => {
  const response = await api.post("/organization/reassign-cases", {
    fromUserId,
    toUserId,
    caseIds,
  });
  return response.data;
};

const updateSeats = async (
  additionalSeats: number,
  paymentId?: string,
): Promise<{ success: boolean; message: string; activeSeats: number }> => {
  const response = await api.patch("/organization/seats", {
    additionalSeats,
    paymentId,
  });
  return response.data;
};

const getMyInvitations = async (): Promise<MyInvitation[]> => {
  const response = await api.get("/organization/my-invitations");
  return response.data.invitations;
};

const revokeInvitation = async (
  invitationId: string,
): Promise<{ message: string }> => {
  const response = await api.delete(`/organization/invitations/${invitationId}`);
  return response.data;
};

export interface InvitationInfo {
  invitedEmail: string;
  organizationName: string;
  expiresAt: string;
  userExists: boolean;
}

const getInvitationInfo = async (token: string): Promise<InvitationInfo> => {
  const response = await api.get(`/organization/invitations/${token}/info`);
  return response.data.invitation;
};

const completeInviteSetup = async (
  token: string,
  data: { firstName: string; lastName: string; phone: string; password: string },
): Promise<any> => {
  const response = await api.post(`/organization/invitations/${token}/setup`, data);
  return response.data;
};

const cancelSeat = async (
  seatId: string,
): Promise<{ success: boolean; message: string; seats: Organization["seats"] }> => {
  const response = await api.post("/payments/cancel-seat", { seatId });
  return response.data;
};

export interface OrgActivityLogEntry {
  _id: string;
  organizationId: string;
  action: string;
  actorId: { _id: string; firstName: string; lastName: string; email: string } | null;
  targetId: { _id: string; firstName: string; lastName: string; email: string } | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface InvitationHistoryEntry {
  _id: string;
  invitedEmail: string;
  status: "accepted" | "rejected" | "revoked" | "expired";
  createdAt: string;
  acceptedAt?: string;
  seatPlan?: string;
}

const leaveOrganization = async (): Promise<{ success: boolean; message: string; activeCases?: any[] }> => {
  const response = await api.post("/organization/leave");
  return response.data;
};

const updateOrganization = async (
  data: { name?: string; description?: string },
): Promise<{ success: boolean; message: string; organization: Organization }> => {
  const response = await api.patch("/organization", data);
  return response.data;
};

const deleteOrganization = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete("/organization");
  return response.data;
};

const getActivityLog = async (
  params?: { type?: string; limit?: number; page?: number },
): Promise<{
  logs: OrgActivityLogEntry[];
  pagination: { total: number; page: number; limit: number; pages: number };
}> => {
  const response = await api.get("/organization/activity-log", { params });
  return response.data;
};

const getInvitationHistory = async (): Promise<InvitationHistoryEntry[]> => {
  const response = await api.get("/organization/invitation-history");
  return response.data.invitations;
};

const getCaseTeamRequestById = async (
  requestId: string,
): Promise<{ success: boolean; request: any }> => {
  const response = await api.get(`/organization/case-team-requests/${requestId}`);
  return response.data;
};

const reviewCaseTeamRequest = async (
  requestId: string,
  action: string,
  reason?: string,
): Promise<{ success: boolean; message: string }> => {
  const response = await api.patch(`/organization/case-team-requests/${requestId}`, {
    action,
    reason,
  });
  return response.data;
};

const organizationService = {
  getOrganization,
  getMembers,
  inviteMember,
  getInvitations,
  acceptInvitation,
  rejectInvitation,
  getMyInvitations,
  revokeInvitation,
  removeMember,
  reassignCases,
  updateSeats,
  getInvitationInfo,
  completeInviteSetup,
  cancelSeat,
  leaveOrganization,
  updateOrganization,
  deleteOrganization,
  getActivityLog,
  getInvitationHistory,
  getCaseTeamRequestById,
  reviewCaseTeamRequest,
};

export default organizationService;
