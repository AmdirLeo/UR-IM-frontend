import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  verification_code: string;
}

export interface LoginData {
  id: string;
  password: string;
}

export const sendRegisterEmail = async (email: string) => {
  const response = await api.post('/user/register/email', { email });
  return response.data;
};

export const registerUser = async (data: Record<string, unknown>) => {
  const response = await api.post('/user/register', data);
  return response.data;
};

export const loginUser = async (data: Record<string, unknown>) => {
  const response = await api.post('/user/login', data);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/user/logout');
  return response.data;
};

// --- Friends API ---

export const searchUsers = async (keyword: string, page = 1, size = 20) => {
  const response = await api.get('/friend/friend/search', {
    params: { keyword, page, size },
  });
  return response.data;
};

export const sendFriendRequest = async (target_user_id: number, message?: string) => {
  const response = await api.post('/friend/friend/apply', {
    target_user_id,
    message,
  });
  return response.data;
};

export default api;
