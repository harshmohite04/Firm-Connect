import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
});

api.interceptors.request.use((config) => {
    const adminInfo = localStorage.getItem('admin');
    if (adminInfo) {
        const { token } = JSON.parse(adminInfo);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('admin');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
