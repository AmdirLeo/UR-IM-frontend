import api from '../api';

export interface GroupCreateRequest {
  user_ids: number[];
  name: string;
  avatar?: string;
}

export interface GroupCreateData {
  conversation_id: number;
  name: string;
  avatar?: string;
}

export interface GroupGenericResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export const createGroup = async (data: GroupCreateRequest): Promise<GroupGenericResponse<GroupCreateData>> => {
  const response = await api.post('/group/create', data);
  return response.data;
};
