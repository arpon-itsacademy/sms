import axios from 'axios';

export const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
});

export async function startSession(email, password) {
  await axios.get(`${API_ORIGIN}/sanctum/csrf-cookie`, { withCredentials: true });
  return api.post('/auth/login', { email, password });
}

export function responseData(response) {
  return response.data.data ?? response.data;
}

export function messageFromError(error) {
  return error.response?.data?.message
    || Object.values(error.response?.data?.errors ?? {})[0]?.[0]
    || error.message
    || 'Something went wrong.';
}
