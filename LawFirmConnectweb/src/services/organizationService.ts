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
  role: "ADMIN" | "ATTORNEY";
  status: "ACTIVE" | "REMOVED";
  joinedAt: string;
  removedAt?: string;
}

export interface Organization {
  _id: string;
  name: string;
  ownerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  plan: "STARTER" | "PROFESSIONAL";
  maxSeats: number;
  members: OrganizationMember[];
  subscriptionStatus: string;
  subscriptionExpiresAt: string;
  activeMemberCount: number;
  hasAvailableSeats: boolean;
}

export interface Invitation {
  _id: string;
  invitedEmail: string;
  status: "pending" | "accepted" | "rejected";
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
): Promise<{ success: boolean; message: string; maxSeats: number }> => {
  const response = await api.patch("/organization/seats", {
    additionalSeats,
    paymentId,
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
  removeMember,
  reassignCases,
  updateSeats,
};

export default organizationService;
