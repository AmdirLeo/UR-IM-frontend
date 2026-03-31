import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const sendRegisterEmail = async (email: string) => {
  const response = await api.post('/user/register/email', { email });
  return response.data;
};

export const registerUser = async (data: any) => {
  const response = await api.post('/user/register', data);
  return response.data;
};

export const loginUser = async (data: any) => {
  const response = await api.post('/user/login', data);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/user/logout');
  return response.data;
};

export default api;
