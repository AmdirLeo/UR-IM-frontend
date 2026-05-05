import api from '../api';
import { encryptPassword } from '../utils/crypto';

export interface UsernameEdit {
  new_username: string;
}

export interface PasswordEdit {
  old_password: string;
  new_password: string;
}

export interface EmailEdit {
  password?: string;
  'new-email'?: string;
}

export const getUserInfo = async () => {
  const response = await api.get('/user/info');
  return response.data;
};

export const editUserUsername = async (data: UsernameEdit) => {
  const response = await api.put('/user/edit/username', data);
  return response.data;
};

export const editUserPassword = async (data: PasswordEdit) => {
  const payload = { ...data };
  if (payload.old_password) {
    payload.old_password = encryptPassword(payload.old_password);
  }
  if (payload.new_password) {
    payload.new_password = encryptPassword(payload.new_password);
  }
  const response = await api.put('/user/edit/password', payload);
  return response.data;
};

export const editUserEmail = async (data: EmailEdit) => {
  const payload = { ...data };
  if (payload.password) {
    payload.password = encryptPassword(payload.password);
  }
  const response = await api.put('/user/edit/email', payload);
  return response.data;
};

export const editUserPortrait = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.put('/user/edit/portrait', formData);
  return response.data;
};

export const deleteUserAccount = async (password: string) => {
  const encryptedPassword = password ? encryptPassword(password) : password;
  const response = await api.post('/user/delete', { password: encryptedPassword });
  return response.data;
};
