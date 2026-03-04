import api from "./api";

// Types based on backend/models/User.js and authController.js response
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  token?: string;
  organizationId?: string;
}

export interface LoginResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organizationId?: string;
  subscriptionStatus?: string;
  token: string;
}

export interface RegisterResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organizationId?: string;
  subscriptionStatus?: string;
  token: string;
  msg: string;
}

export interface OrganizationSummary {
  _id: string;
  name: string;
}

const login = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  const response = await api.post("/auth/login", { email, password });
  if (response.data) {
    localStorage.setItem("user", JSON.stringify(response.data));
  }
  return response.data;
};

const register = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  organizationId?: string;
}): Promise<RegisterResponse> => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

const logout = () => {
  localStorage.removeItem("user");
};

const getCurrentUser = async (): Promise<User> => {
  const response = await api.get("/auth/me");
  return response.data;
};

const sendOTP = async (email: string): Promise<{ message: string }> => {
  const response = await api.post("/auth/send-otp", { email });
  return response.data;
};

const verifyOTP = async (
  email: string,
  otp: string,
  purpose: "VERIFY_EMAIL" | "RESET_PASSWORD",
): Promise<{ verified: boolean; resetToken?: string }> => {
  const response = await api.post("/auth/verify-otp", { email, otp, purpose });
  return response.data;
};

const resendOTP = async (
  email: string,
  purpose: "VERIFY_EMAIL" | "RESET_PASSWORD",
): Promise<{ message: string }> => {
  const response = await api.post("/auth/resend-otp", { email, purpose });
  return response.data;
};

const forgotPassword = async (
  email: string,
): Promise<{ message: string }> => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

const resetPassword = async (
  email: string,
  resetToken: string,
  newPassword: string,
): Promise<{ message: string }> => {
  const response = await api.post("/auth/reset-password", {
    email,
    resetToken,
    newPassword,
  });
  return response.data;
};

const getOrganizations = async (): Promise<OrganizationSummary[]> => {
  const response = await api.get("/organization/public"); // Note: Ensure backend route is /organization/public
  return response.data?.organizations || [];
};

const authService = {
  login,
  register,
  logout,
  getCurrentUser,
  getOrganizations,
  sendOTP,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
};

export default authService;
