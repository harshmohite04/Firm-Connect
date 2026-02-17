import api from './api';
import { setAuthData, clearAuthData } from '../utils/storage';

// Types based on backend/models/User.js and authController.js response
export interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    phone?: string;
    token?: string;
}

export interface LoginResponse {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    token: string;
}

export interface RegisterResponse {
    _id: string;
    firstName: string;
    email: string;
    msg: string;
}

const login = async (email: string, password: string, rememberMe: boolean = true): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data) {
        setAuthData(response.data, rememberMe);
    }
    return response.data;
};
const register = async (userData: { firstName: string; lastName: string; email: string; phone: string; password: string }): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
};
const logout = () => {
    clearAuthData();
};

const getCurrentUser = async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
};

const authService = {
    login,
    register,
    logout,
    getCurrentUser
};

export default authService;
