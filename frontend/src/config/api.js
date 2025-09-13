import axios from 'axios';

// Create axios instance with base URL configuration
// In production, frontend and backend are served from same domain, so no baseURL needed
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
