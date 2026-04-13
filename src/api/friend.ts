import api from '../api';
import { formatAvatarUrl } from '../utils/url';

// --- Interfaces ---

export interface SearchUserResponse {
  user_id: number;
  username: string;
  avatar_url: string | null;
}

export interface FriendApplyRequest {
  target_user_id: number;
  message?: string;
}

export interface FriendGenericResponse {
  code: number;
  msg: string;
}

export interface FriendHandleRequest {
  request_id: number;
  action: 'accepted' | 'rejected';
}

export interface FriendInfo {
  user_id: number;
  username: string;
  avatar_url: string | null;
  status?: string; // e.g. "accepted"
  be_friend_time: string;
  tag: string | null;
}

export interface FriendListResponse {
  code: number;
  msg: string;
  data: FriendInfo[];
}

export interface TagCreateRequest {
  name: string;
}

export interface TagDeleteRequest {
  name: string;
}

export interface TagAddFriendRequest {
  name: string;
  friend_user_ids: number[];
}

export interface TagQueryRequest {
  name: string;
}

export interface FriendTagQueryResponse {
  code: number;
  msg: string;
  data: FriendInfo[];
}

export interface TagRemoveFriendRequest {
  name: string;
  friend_user_ids: number[];
}

// --- API Functions ---

export const searchUsers = async (keyword: string, page = 1, size = 20) => {
  const response = await api.get('/friend/friend/search', {
    params: { keyword, page, size },
  });
  const data = response.data;
  if (data && data.data && Array.isArray(data.data.results)) {
    return {
      ...data,
      data: {
        ...data.data,
        results: data.data.results.map((user: SearchUserResponse) => ({
          ...user,
          avatar_url: formatAvatarUrl(user.avatar_url),
        })),
      },
    };
  }
  return data;
};

export const sendFriendRequest = async (target_user_id: number, message?: string) => {
  const response = await api.post('/friend/friend/apply', {
    target_user_id,
    message,
  });
  return response.data;
};

export const handleFriendRequest = async (request_id: number, action: 'accepted' | 'rejected') => {
  const response = await api.put('/friend/friend/handle', {
    request_id,
    action,
  });
  return response.data;
};

export const removeFriend = async (friend_user_id: number) => {
  const response = await api.delete(`/friend/friend/remove/${friend_user_id}`);
  return response.data;
};

export const getFriendList = async () => {
  const response = await api.get('/friend/friend');
  const data = response.data;
  if (data && Array.isArray(data.data)) {
    return {
      ...data,
      data: data.data.map((friend: FriendInfo) => ({
        ...friend,
        avatar_url: formatAvatarUrl(friend.avatar_url),
      })),
    };
  }
  return data;
};

export const createFriendTag = async (name: string) => {
  const response = await api.post('/friend/friend/tag/new', { name });
  return response.data;
};

export const deleteFriendTag = async (name: string) => {
  const response = await api.post('/friend/friend/tag/delete', { name });
  return response.data;
};

export const addFriendToTag = async (name: string, friend_user_ids: number[]) => {
  const response = await api.post('/friend/friend/tag/add', {
    name,
    friend_user_ids,
  });
  return response.data;
};

export const queryFriendsByTag = async (name: string) => {
  const response = await api.post('/friend/friend/tag/query', { name });
  const data = response.data;
  if (data && Array.isArray(data.data)) {
    return {
      ...data,
      data: data.data.map((friend: FriendInfo) => ({
        ...friend,
        avatar_url: formatAvatarUrl(friend.avatar_url),
      })),
    };
  }
  return data;
};

export const removeFriendFromTag = async (name: string, friend_user_ids: number[]) => {
  const response = await api.post('/friend/friend/tag/remove', {
    name,
    friend_user_ids,
  });
  return response.data;
};
