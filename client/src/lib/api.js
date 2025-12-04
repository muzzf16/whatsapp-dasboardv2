// Centralized API config for the client
// Use REACT_APP_API_URL to override default in development/production
const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const API_BASE = `${API_URL}/api`;

export { API_URL, API_BASE };
