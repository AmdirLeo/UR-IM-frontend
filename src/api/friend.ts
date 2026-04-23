import api from '../api';
import { formatAvatarUrl } from '../utils/url';

// --- Interfaces ---

export interface SearchUserResponse {
  user_id: number;
  username: string;
  avatar_url: string | null;
}

export interface UserInfoResponse {
  code: number;
  id: number;
  username: string;
  avatar_url: string | null;
  email: string;
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
  tags: string[];
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

export interface FriendTagListResponse {
  code: number;
  msg: string;
  data: string[];
}

export interface PendingFriendRequestItem {
  msg_id: number;
  msg_type: string;
  sender_id: number;
  msg_content: string;
  create_time: string;
  quote_msg_id?: number | null;
  quote_num?: number;
}

export interface PendingFriendRequestsResponse {
  code: number;
  msg: string;
  data: PendingFriendRequestItem[];
}

// --- API Functions ---

export const searchUsers = async (keyword: string, page = 1, size = 20) => {
  const response = await api.get('/friend/search', {
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
  const response = await api.post('/friend/apply', {
    target_user_id,
    message,
  });
  return response.data;
};

export const getUserInfo = async (userId: number | string): Promise<UserInfoResponse> => {
  const response = await api.get(`/friend/info/${userId}`);
  return response.data;
};

export const handleFriendRequest = async (request_id: number, action: 'accepted' | 'rejected') => {
  const response = await api.post('/friend/handle', {
    request_id,
    action,
  });
  return response.data;
};

export const removeFriend = async (friend_user_id: number) => {
  const response = await api.delete(`/friend/remove/${friend_user_id}`);
  return response.data;
};

export const getFriendList = async () => {
  const response = await api.get('/friend');
  const data = response.data;
  if (data && Array.isArray(data.data)) {
    return {
      ...data,
      data: data.data.map((friend: any) => {
        // Handle both legacy string tag format and new array tags format
        let parsedTags: string[] = [];
        if (Array.isArray(friend.tags)) {
          parsedTags = friend.tags;
        } else if (typeof friend.tag === 'string' && friend.tag) {
          parsedTags = friend.tag.split(',').map((t: string) => t.trim()).filter((t: string) => t);
        }

        return {
          ...friend,
          avatar_url: formatAvatarUrl(friend.avatar_url),
          tags: parsedTags,
        };
      }),
    };
  }
  return data;
};

export const getFriendTags = async () => {
  const response = await api.get('/friend/tag/list');
  return response.data;
};

export const createFriendTag = async (name: string) => {
  const payload = { tag_name: name };
  console.log('Request Payload:', payload);
  const response = await api.post('/friend/tag/new', payload);
  return response.data;
};

export const deleteFriendTag = async (name: string) => {
  const payload = { tag_name: name };
  console.log('Request Payload:', payload);
  const response = await api.post('/friend/tag/delete', payload);
  return response.data;
};

export const addFriendToTag = async (name: string, friend_user_ids: number[]) => {
  const payload = {
    tag_name: name,
    friend_ids: friend_user_ids,
  };
  console.log('Request Payload:', payload);
  const response = await api.post('/friend/tag/add', payload);
  return response.data;
};

export const queryFriendsByTag = async (name: string) => {
  const payload = { tag_name: name };
  console.log('Request Payload:', payload);
  const response = await api.post('/friend/tag/query', payload);
  const data = response.data;
  if (data && Array.isArray(data.data)) {
    return {
      ...data,
      data: data.data.map((friend: any) => {
        let parsedTags: string[] = [];
        if (Array.isArray(friend.tags)) {
          parsedTags = friend.tags;
        } else if (typeof friend.tag === 'string' && friend.tag) {
          parsedTags = friend.tag.split(',').map((t: string) => t.trim()).filter((t: string) => t);
        }

        return {
          ...friend,
          avatar_url: formatAvatarUrl(friend.avatar_url),
          tags: parsedTags,
        };
      }),
    };
  }
  return data;
};

export const removeFriendFromTag = async (name: string, friend_user_id: number) => {
  const payload = {
    tag_name: name,
    friend_id: friend_user_id,
  };
  console.log('Request Payload:', payload);
  const response = await api.post('/friend/tag/remove', payload);
  return response.data;
};

export const getPendingFriendRequests = async (): Promise<PendingFriendRequestItem[]> => {
  const response = await api.get('/friend/requests/pending');
  // Safely unwrap standard data response
  return response.data?.data || [];
};
