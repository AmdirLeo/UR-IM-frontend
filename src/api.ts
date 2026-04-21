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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      alert('Login timeout. Please log in again.');
    }
    return Promise.reject(error);
  }
);

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

export const registerUser = async (data: RegisterData) => {
  const response = await api.post('/user/register', data);
  return response.data;
};

export const loginUser = async (data: LoginData) => {
  const response = await api.post('/user/login', data);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/user/logout');
  return response.data;
};

export default api;
