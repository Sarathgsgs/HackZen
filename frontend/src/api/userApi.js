import apiClient from './api';

export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

const extractErrorMessage = (error, defaultMsg = 'An error occurred') => {
    const raw = error.response?.data?.detail 
        || error.response?.data?.message 
        || error.response?.data?.error?.message 
        || error.message;

    if (error.response?.status === 409) {
        return 'Email already registered. Please sign in or use a different email address.';
    }

    if (typeof raw === 'string') {
        return raw;
    }
    if (Array.isArray(raw)) {
        return raw.map(item => item?.msg || item?.message || JSON.stringify(item)).join(', ');
    }
    if (typeof raw === 'object' && raw !== null) {
        return raw.msg || raw.message || JSON.stringify(raw);
    }
    return defaultMsg;
};

export const register = async (userData) => {
    try {
        const { data } = await apiClient.post('/auth/register', userData);
        return data;
    } catch (error) {
        const detail = extractErrorMessage(error, 'Registration failed. Please check your details.');
        throw { detail, status: error.response?.status };
    }
};

export const login = async (credentials) => {
    try {
        const { data } = await apiClient.post('/auth/login', credentials);
        if (data.token) {
            localStorage.setItem('token', data.token);
            sessionStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('user', JSON.stringify(data.user));
            setAuthToken(data.token);
        }
        return data;
    } catch (error) {
        const detail = extractErrorMessage(error, 'Login failed. Please check your credentials.');
        throw { detail, status: error.response?.status };
    }
};

export const forgotPassword = async (payload) => {
    try {
        const { data } = await apiClient.post('/auth/forgot-password', payload);
        return data;
    } catch (error) {
        const detail = extractErrorMessage(error, 'Unable to request password reset.');
        throw { detail };
    }
};

export const resetPassword = async (payload) => {
    try {
        const { data } = await apiClient.post('/auth/reset-password', payload);
        return data;
    } catch (error) {
        const detail = extractErrorMessage(error, 'Unable to reset password. Link may be invalid or expired.');
        throw { detail };
    }
};

export const getMe = async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
};

export const logout = () => {
    // Clear all authentication and profile data
    sessionStorage.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('rememberedEmail');
    setAuthToken(null);
    
    // Clear any cached profile data
    try {
        // Add custom cleanup if needed for other cache keys
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('mentor_') || key.startsWith('student_') || 
                key.startsWith('organizer_') || key.startsWith('admin_')) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error('Error clearing cache on logout:', error);
    }
};

export const fetchMyNotifications = async () => {
    try {
        const response = await apiClient.get('/auth/my-notifications');
        return response.data;
    } catch (error) {
        try {
            const response = await apiClient.get('/dashboard/my-notifications');
            return response.data;
        } catch (err) {
            console.error("Error fetching notifications:", error);
            return [];
        }
    }
};

export const markAllNotificationsRead = async () => {
    try {
        const response = await apiClient.put('/auth/my-notifications/read');
        return response.data;
    } catch (error) {
        try {
            const response = await apiClient.put('/dashboard/my-notifications/read');
            return response.data;
        } catch (err) {
            console.error("Error marking notifications as read:", err);
            throw err;
        }
    }
};

