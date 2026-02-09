import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL as BASE_API_URL } from '../lib/api'; // Import centralized API_URL

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Append /api/users because AuthContext specifically deals with user routes, 
    // BUT api.js gives root or root/api? 
    // api.js: const API_URL = ...; const API_BASE = .../api;
    // Let's check api.js content again. 
    // api.js: API_URL = 'https://api.kenes.biz.id' (root).
    // So we need `${BASE_API_URL}/api/users` here.
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
            setToken(res.data.token);
            return { success: true };
        } catch (err) {
            return { success: false, msg: err.response?.data?.msg || 'Registration failed' };
        }
    };

    const login = async (formData) => {
        try {
            const res = await axios.post(`${API_URL}/login`, formData);
            localStorage.setItem('token', res.data.token);
            setToken(res.data.token);
            return { success: true };
        } catch (err) {
            return { success: false, msg: err.response?.data?.msg || 'Login failed' };
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
            // Refresh user data
            const res = await axios.get(`${API_URL}/profile`);
            setUser(res.data);
            return { success: true };
        } catch (err) {
            return { success: false, msg: err.response?.data?.msg || 'Update failed' };
        }
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, register, login, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
