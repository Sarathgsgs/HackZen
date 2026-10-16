import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_BASE_URL = rawBaseUrl.endsWith('/api') || rawBaseUrl.includes('/api/')
    ? rawBaseUrl.replace(/\/$/, '')
    : `${rawBaseUrl.replace(/\/$/, '')}/api`;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the auth token to headers
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            // Ensure token is synced across storages
            if (!localStorage.getItem('token')) localStorage.setItem('token', token);
            if (!sessionStorage.getItem('token')) sessionStorage.setItem('token', token);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle errors globally
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const path = window.location.pathname;
            const isAuthRoute = path.startsWith('/login') || path.startsWith('/signup') || path === '/' || path.startsWith('/get-started') || path.startsWith('/role-selection') || path.startsWith('/forgot-password') || path.startsWith('/verify');
            if (!isAuthRoute) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('userRole');
                localStorage.removeItem('isLoggedIn');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('userRole');
                sessionStorage.removeItem('isLoggedIn');
                window.dispatchEvent(new Event('user-update'));
                window.location.href = '/login?reason=session_expired';
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
