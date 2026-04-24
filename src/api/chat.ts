import api from '../api';

// ==========================================
// Type Definitions (Requests & Responses)
// ==========================================

export interface SendMessageRequest {
  conversation_id: number;
  local_id: string;
  message_content: string;
  msg_type: "text" | "image" | "card" | "notify";
  extra_data?: Record<string, any>;
  quote_message_id?: number;
}

export interface SendMessageResponse {
  code: number;
  msg: string;
  data: {
    msg_id: number;
    server_time: string; // ISO 8601 string
    local_id: string;
  };
}

export interface ConversationItem {
  conversation_id: number;
  type: "private" | "group";
  unread_count: number;
  last_ack_msg_id?: number;
  last_msg_id?: number;
  last_msg_type?: string;
  last_msg_sender_id?: number;
  last_msg_content?: string;
  last_msg_send_time?: string; // ISO 8601 string
  muted?: boolean;
  pinned?: boolean;
  // Optional target mapping fields returned by sync API
  target_id?: number;
  target_user_id?: number;
  name?: string;
  avatar_url?: string;
}

export interface SyncAggregatedResponse {
  conversations: ConversationItem[];
  pending_friend_requests: number;
  pending_group_requests: number;
}

export type SyncConversationsResponse = SyncAggregatedResponse;

export interface ReadAckRequest {
  conversation_id: number;
  msg_id: number;
}

export interface ReadAckResponse {
  code: number;
  msg: string;
}

export interface GetHistoryRequest {
  conversation_id: number;
  start_msg_id?: number;
  limit: number;
}

export interface HistoryMessageItem {
  msg_id: number;
  msg_type: "text" | "image" | "card" | "notify";
  sender_id: number;
  msg_content: string;
  create_time: string; // ISO 8601 string
  quote_msg_id?: number;
  quote_num: number;
}

export type GetHistoryResponse = HistoryMessageItem[];

export interface SearchMessagesRequest {
  conversation_id?: number;
  sender_id?: number;
  start_time?: string; // ISO 8601 string
  end_time?: string; // ISO 8601 string
  keyword?: string;
  limit: number;
  cursor_msg_id?: number;
}

export interface SearchMessageItem {
  user_id: number;
  conversation_id: number;
  msg_id: number;
  msg: string;
  time: string; // ISO 8601 string
}

export type SearchMessagesResponse = SearchMessageItem[];

export interface DeleteMessageRequest {
  conversation_id: number;
  message_id: number;
}

export interface DeleteMessageResponse {
  code: number;
  msg: string;
}

export interface MuteConversationRequest {
  conversation_id: number;
  is_muted: boolean;
}

export interface PinConversationRequest {
  conversation_id: number;
  is_pinned: boolean;
}

export interface DirectConversationData {
  conversation_id: number;
}


// ==========================================
// API Layer (Axios wrapper functions)
// ==========================================

export const chatApi = {
  sendMessage: async (data: SendMessageRequest): Promise<SendMessageResponse> => {
    const response = await api.post('/message/send', data);
    return response.data;
  },

  syncConversations: async (): Promise<SyncConversationsResponse> => {
    const response = await api.get('/conversation/sync');
    return response.data;
  },

  readAck: async (data: ReadAckRequest): Promise<ReadAckResponse> => {
    const response = await api.post('/conversation/read_ack', data);
    return response.data;
  },

  getMessageHistory: async (data: GetHistoryRequest): Promise<GetHistoryResponse> => {
    const response = await api.post('/message/history', data);
    return response.data;
  },

  searchMessages: async (data: SearchMessagesRequest): Promise<SearchMessagesResponse> => {
    const response = await api.post('/message/search', data);
    return response.data;
  },

  deleteMessage: async (data: DeleteMessageRequest): Promise<DeleteMessageResponse> => {
    const response = await api.delete('/message', { data });
    return response.data;
  },

  muteConversation: async (data: MuteConversationRequest): Promise<{code: number, msg: string}> => {
    const response = await api.put('/conversation/mute', data);
    return response.data;
  },

  pinConversation: async (data: PinConversationRequest): Promise<{code: number, msg: string}> => {
    const response = await api.put('/conversation/pin', data);
    return response.data;
  },

  getDirectConversation: async (friend_user_id: number): Promise<DirectConversationData> => {
    const response = await api.get(`/conversation/direct/${friend_user_id}`);
    return response.data.data;
  }
};
