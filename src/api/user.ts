import api from '../api';

export interface UserEdit {
  user_name?: string;
  old_password?: string;
  new_password?: string;
  email?: string;
}

export interface EmailEdit {
  password?: string;
  'new-email'?: string;
}

export const editUserProfile = async (data: UserEdit) => {
  const response = await api.put('/user/edit', data);
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

export const deleteUserAccount = async () => {
  const response = await api.post('/user/delete');
  return response.data;
};
