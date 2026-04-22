import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL as BASE_API_URL } from '../lib/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const API_URL = `${BASE_API_URL}/api/users`;

    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                axios.defaults.headers.common['x-auth-token'] = token;
                try {
                    const res = await axios.get(`${API_URL}/profile`);
                    setUser(res.data);
                } catch (err) {
                    console.error('Error loading user', err);
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                    delete axios.defaults.headers.common['x-auth-token'];
                }
            }
            setLoading(false);
        };
        loadUser();
    }, [token]);

    const register = async (formData) => {
        try {
            const res = await axios.post(`${API_URL}/register`, formData);
            localStorage.setItem('token', res.data.token);
            axios.defaults.headers.common['x-auth-token'] = res.data.token;
            setToken(res.data.token);
            return { success: true };
        } catch (err) {
            return { success: false, msg: err.response?.data?.msg || 'Registration failed' };
        }
    };

    const login = async (formData) => {
        try {
            const res = await axios.post(`${API_URL}/login`, formData);
            
            if (res.data.mfa_required) {
                // Pre-auth token for MFA step
                localStorage.setItem('token', res.data.token);
                axios.defaults.headers.common['x-auth-token'] = res.data.token;
                setToken(res.data.token);
                return { success: true, mfaRequired: true };
            }

            localStorage.setItem('token', res.data.token);
            axios.defaults.headers.common['x-auth-token'] = res.data.token;
            setToken(res.data.token);
            return { success: true };
        } catch (err) {
            return { success: false, msg: err.response?.data?.msg || 'Login failed' };
        }
    };

    const loginMfa = async (mfaToken) => {
        try {
            const res = await axios.post(`${API_URL}/mfa/login`, { token: mfaToken });
            localStorage.setItem('token', res.data.token);
            axios.defaults.headers.common['x-auth-token'] = res.data.token;
            setToken(res.data.token);
            return { success: true };
        } catch (err) {
            return { success: false, msg: err.response?.data?.msg || 'MFA Verification failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['x-auth-token'];
    };

    const updateProfile = async (formData) => {
        try {
            await axios.put(`${API_URL}/profile`, formData);
            const res = await axios.get(`${API_URL}/profile`);
            setUser(res.data);
            return { success: true };
        } catch (err) {
            return { success: false, msg: err.response?.data?.msg || 'Update failed' };
        }
    }

    const setupMfa = async () => {
        try {
            const res = await axios.post(`${API_URL}/mfa/setup`);
            return { success: true, data: res.data };
        } catch (err) {
            return { success: false, msg: err.response?.data?.msg || 'MFA Setup failed' };
        }
    };

    const verifyMfa = async (mfaToken) => {
        try {
            const res = await axios.post(`${API_URL}/mfa/verify`, { token: mfaToken });
            // Refresh user data to show mfa_enabled status
            const userRes = await axios.get(`${API_URL}/profile`);
            setUser(userRes.data);
            return { success: true, msg: res.data.msg };
        } catch (err) {
            return { success: false, msg: err.response?.data?.msg || 'MFA Verification failed' };
        }
    };

    const disableMfa = async () => {
        try {
            const res = await axios.post(`${API_URL}/mfa/disable`);
            const userRes = await axios.get(`${API_URL}/profile`);
            setUser(userRes.data);
            return { success: true, msg: res.data.msg };
        } catch (err) {
            return { success: false, msg: err.response?.data?.msg || 'Disabling MFA failed' };
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, token, loading, register, login, loginMfa, logout, updateProfile,
            setupMfa, verifyMfa, disableMfa 
        }}>
            {children}
        </AuthContext.Provider>
    );
};
