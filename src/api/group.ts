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

export interface GroupGenericRequest {
  conversation_id: number;
}

export interface GroupMembersRequest {
  conversation_id: number;
}

export interface GroupMember {
  user_id: number;
  user_name: string;
  avatar_url?: string;
  role: string;
}

export interface GroupInfoData {
  conversation_id: number;
  conversation_name: string;
  conversation_avatar?: string;
  member_count: number;
  owner_id: number;
  my_role: string;
  latest_announcement?: {
    announcement_id: number;
    content: string;
    create_time: number;
    sender_name: string;
  };
  top_members: GroupMember[];
}

export interface GroupMembersData {
  total: number;
  page: number;
  page_size: number;
  list: GroupMember[];
}

export const getGroupInfo = async (data: GroupGenericRequest): Promise<GroupGenericResponse<GroupInfoData>> => {
  const response = await api.post('/group/info', data);
  return response.data;
};

export const getGroupMembers = async (data: GroupMembersRequest): Promise<GroupGenericResponse<GroupMembersData>> => {
  const response = await api.post('/group/members', data);
  return response.data;
};

export const quitGroup = async (data: GroupGenericRequest): Promise<GroupGenericResponse<null>> => {
  const response = await api.post('/group/quit', data);
  return response.data;
};

export const bombGroup = async (data: GroupGenericRequest): Promise<GroupGenericResponse<null>> => {
  const response = await api.post('/group/bomb', data);
  return response.data;
};
