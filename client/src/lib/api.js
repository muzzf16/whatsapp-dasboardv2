// Centralized API config for the client
// Dynamically detect API URL based on access point:
// - localhost:3003 -> localhost:4000 (local API)
// - wa.kenes.biz.id (tunnel) -> api.kenes.biz.id (remote API)

const getApiUrl = () => {
    // Allow environment variable to override
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL.replace(/\/$/, '');
    }

    const hostname = window.location.hostname;
    const port = window.location.port;

    // If accessing via wa.kenes.biz.id (tunnel), use remote API
    if (hostname === 'wa.kenes.biz.id') {
        return 'https://api.kenes.biz.id';
    }

    // If accessing via localhost:3003, use local backend
    if (hostname === 'localhost' && port === '3003') {
        return 'http://localhost:4000';
    }

    // Default fallback to local API
    return 'http://localhost:4000';
};

const API_URL = getApiUrl();
const API_BASE = `${API_URL}/api`;

console.log('Access hostname:', window.location.hostname);
console.log('Access port:', window.location.port);
console.log('Configured API_URL:', API_URL);

export { API_URL, API_BASE };
