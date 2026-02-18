import api from './api';

// Auth
const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
};

const getMe = async () => {
    const { data } = await api.get('/auth/me');
    return data;
};

// Dashboard
const getStats = async () => {
    const { data } = await api.get('/admin/stats');
    return data;
};

const getRecentActivity = async () => {
    const { data } = await api.get('/admin/recent-activity');
    return data;
};

// Users
const getUsers = async (params?: Record<string, any>) => {
    const { data } = await api.get('/admin/users', { params });
    return data;
};

const getUserDetail = async (id: string) => {
    const { data } = await api.get(`/admin/users/${id}`);
    return data;
};

const changeUserRole = async (id: string, role: string) => {
    const { data } = await api.patch(`/admin/users/${id}/role`, { role });
    return data;
};

const toggleAdminStatus = async (id: string) => {
    const { data } = await api.patch(`/admin/users/${id}/admin-status`);
    return data;
};

const resetUserPassword = async (id: string, newPassword: string) => {
    const { data } = await api.patch(`/admin/users/${id}/reset-password`, { newPassword });
    return data;
};

const unlockUserAccount = async (id: string) => {
    const { data } = await api.patch(`/admin/users/${id}/unlock`);
    return data;
};

// Subscriptions
const getSubscriptions = async (params?: Record<string, any>) => {
    const { data } = await api.get('/admin/subscriptions', { params });
    return data;
};

const updateSubscription = async (userId: string, body: Record<string, any>) => {
    const { data } = await api.patch(`/admin/subscriptions/${userId}`, body);
    return data;
};

// Cases
const getCases = async (params?: Record<string, any>) => {
    const { data } = await api.get('/admin/cases', { params });
    return data;
};

const updateCaseStatus = async (id: string, status: string) => {
    const { data } = await api.patch(`/admin/cases/${id}/status`, { status });
    return data;
};

const assignLawyer = async (id: string, lawyerId: string) => {
    const { data } = await api.patch(`/admin/cases/${id}/assign`, { lawyerId });
    return data;
};

// Contact Submissions
const getContactSubmissions = async (params?: Record<string, any>) => {
    const { data } = await api.get('/admin/contact-submissions', { params });
    return data;
};

const updateContactSubmission = async (id: string, body: Record<string, any>) => {
    const { data } = await api.patch(`/admin/contact-submissions/${id}`, body);
    return data;
};

const adminService = {
    login, getMe,
    getStats, getRecentActivity,
    getUsers, getUserDetail, changeUserRole, toggleAdminStatus, resetUserPassword, unlockUserAccount,
    getSubscriptions, updateSubscription,
    getCases, updateCaseStatus, assignLawyer,
    getContactSubmissions, updateContactSubmission
};

export default adminService;
