import api from '../api';

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
  const response = await api.put('/user/edit/password', data);
  return response.data;
};

export const editUserEmail = async (data: EmailEdit) => {
  const response = await api.put('/user/edit/email', data);
  return response.data;
};

export const editUserPortrait = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.put('/user/edit/portrait', formData);
  return response.data;
};

export const deleteUserAccount = async (password: string) => {
  const response = await api.post('/user/delete', { password });
  return response.data;
};
