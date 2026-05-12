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

export interface JoinedGroupItem {
  conversation_id: number;
  conversation_name: string;
  avatar_url?: string;
  role: string;
  join_time: string;
}

export const getJoinedGroups = async (): Promise<GroupGenericResponse<JoinedGroupItem[]>> => {
  const response = await api.get('/group');
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

export interface GroupAnnouncementRequest {
  conversation_id: number;
  msg: string;
}

export interface GroupAnnouncementData {
  time: string;
  announcement_id: number;
}

export const postGroupAnnouncement = async (data: GroupAnnouncementRequest): Promise<GroupGenericResponse<GroupAnnouncementData>> => {
  const response = await api.post('/group/announcement', data);
  return response.data;
};

export interface GroupAnnouncementsRequest {
  conversation_id: number;
  page?: number;
  page_size?: number;
}

export interface AnnouncementItem {
  announcement_id: number;
  content: string;
  create_time: number;
  sender_name: string;
}

export interface GroupAnnouncementListData {
  items: AnnouncementItem[];
  total: number;
  page: number;
  page_size: number;
}

export const getGroupAnnouncements = async (data: GroupAnnouncementsRequest): Promise<GroupGenericResponse<GroupAnnouncementListData>> => {
  const response = await api.post('/group/announcements', data);
  return response.data;
};

export interface GroupAdminRequest {
  conversation_id: number;
  user_id: number;
  role: 'admin' | 'member' | 'owner';
}

export interface GroupRemoveMemberRequest {
  conversation_id: number;
  user_id: number;
}

export const setGroupAdmin = async (data: GroupAdminRequest): Promise<GroupGenericResponse<null>> => {
  const response = await api.put('/group/admin', data);
  return response.data;
};

export const removeGroupMember = async (data: GroupRemoveMemberRequest): Promise<GroupGenericResponse<null>> => {
  const response = await api.delete('/group/member', { data });
  return response.data;
};

export interface GroupInviteCard {
  card_type: string;
  apply_id: number;
  conversation_id: number;
  conversation_name: string;
  group_avatar: string | null;
  applicant_id: number;
  applicant_name: string;
  applicant_avatar: string | null;
  inviter_id: number;
  inviter_name: string;
  inviter_avatar: string | null;
  status: string;
  create_time: number;
}

export interface GroupInviteReviewRequest {
  apply_id: number;
  status: "APPROVED" | "IGNORED";
}

export interface GroupInviteRequest {
  conversation_id: number;
  user_id: number;
}

export interface GroupInviteResponseData {
  apply_id: number;
}

export const inviteToGroup = async (data: GroupInviteRequest): Promise<GroupGenericResponse<GroupInviteResponseData>> => {
  const response = await api.post('/group/invite', data);
  return response.data;
};

export const getPendingGroupInvites = async (): Promise<GroupGenericResponse<GroupInviteCard[]> & { total?: number }> => {
  const response = await api.get('/group/invites/pending');
  return response.data;
};

export const reviewGroupInvite = async (data: GroupInviteReviewRequest): Promise<GroupGenericResponse<null>> => {
  const response = await api.post('/group/invite/review', data);
  return response.data;
};
