import axios from 'axios';

// Frontend JavaScript runs in browser, so use localhost to reach backend
const baseURL: string = 'http://localhost:3001/api';

const api = axios.create({ baseURL });

// Interceptor to add the JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('greenchainz-token');
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
