import { useEffect, useRef, useState, useCallback } from 'react';

export interface ChatMessage {
  type: 'chat' | 'private' | 'broadcast';
  sender_id?: number;
  receiver_id?: number;
  from?: number; // 增加后端使用的来源字段
  content: string;
}

export interface SystemMessage {
  type: 'system';
  message: string;
}

// 1. 新增：匹配后端下发的真实系统通知/好友申请结构
export interface NewChatMessage {
  type: 'NEW_CHAT_MESSAGE';
  data: {
    conversation_id: number;
    msg_id: number;
    sender_id: number;
    msg_type: string;  // 例如 'friend_apply'
    content: string;   // JSON 字符串
    create_time: string;
    quote_message_id?: number | null;
  };
}

export type WSMessage = ChatMessage | SystemMessage | NewChatMessage;

interface UseWebSocketReturn {
  isConnected: boolean;
  messages: WSMessage[];
  friendRequests: NewChatMessage[];
  sendMessage: (receiverId: number, content: string, currentUserId: number) => void;
  removeFriendRequest: (msgId: number) => void;
  removeMessagesWithUser: (userId: number) => void;
}

export const useWebSocket = (token: string | null): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  // 👈 新增：专门存储好友申请的 State
  const [friendRequests, setFriendRequests] = useState<NewChatMessage[]>(() => {
    const cached = localStorage.getItem('cached_friend_requests');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached friend requests:', e);
      }
    }
    return [];
  });
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  // Sync friend requests to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cached_friend_requests', JSON.stringify(friendRequests));
  }, [friendRequests]);

  useEffect(() => {
    if (!token) return;

    // We use the same host as the API but with the ws:// protocol
    // Assuming backend is at localhost:8000 as defined by user
    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/api/websocket/ws';
    const wsUrl = `${baseUrl}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);

      // Start 30s heartbeat
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📥 收到后端消息:', data);

        // 分流逻辑开始
        if (['chat', 'system', 'private', 'broadcast'].includes(data.type)) {
          // 常规的旧版消息，直接进聊天框
          setMessages((prev) => [...prev, data]);

        } else if (data.type === 'NEW_CHAT_MESSAGE') {

          const innerData = data.data;

          // 1. 拦截卡片类消息 (好友申请)
          if (innerData?.msg_type === 'card' && innerData?.extra?.card_type === 'friend_apply') {
            console.log('🔔 成功拦截好友申请！放入专属列表。');
            setFriendRequests((prev) => [...prev, data]);
            return; // 提前退出，别塞进聊天框
          }

          // 2. 拦截通知类消息 (同意好友) - ⚠️ 注意：根据之前的后端文档，同意好友可能是 notify + action
          if (
            (innerData?.msg_type === 'notify' && innerData?.extra?.action === 'friend_accept') ||
            (innerData?.msg_type === 'card' && innerData?.extra?.card_type === 'friend_accept') // 兼容你之前的写法
          ) {
            console.log('🔔 对方同意了好友申请！');
            window.dispatchEvent(new CustomEvent('remote_friend_accept'));
            setMessages((prev) => [...prev, data]);
            return;
          }

          // 3. 其他类型的 NEW_CHAT_MESSAGE（文本、图片等常规消息）
          setMessages((prev) => [...prev, data]);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      if (pingIntervalRef.current !== null) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (pingIntervalRef.current !== null) {
        clearInterval(pingIntervalRef.current);
      }
      ws.close();
    };
  }, [token]);

  const sendMessage = useCallback(async (receiverId: number, content: string, currentUserId: number) => {
    // 乐观更新 UI
    setMessages((prev) => [...prev, { type: 'chat', sender_id: currentUserId, target_id: receiverId, content } as ChatMessage]);

    try {
      // 导入 chatApi，改为调用 HTTP 接口发消息 (根据 Sprint 1 后端重构的要求)
      // 注意：这里需要你实际导入 chatApi, 如果你在同一个文件，或者从 api 导入
      const { chatApi } = await import('../api/chat');
      const { v4: uuidv4 } = await import('uuid');

      const reqPayload = {
        conversation_id: receiverId, // 这里复用 receiverId 作为 conversation_id，实际应用中可能需要查找
        local_id: uuidv4(),
        message_content: content,
        msg_type: "text" as const,
      };

      await chatApi.sendMessage(reqPayload);

      // 注意：发送成功后，如果后端不通过 WS 将自己的消息回推给你，
      // 这个乐观更新就可以保留。如果有回推，可以在收到 NEW_CHAT_MESSAGE 后根据 local_id 去重。
    } catch (err) {
      console.error('发送消息失败', err);
      // 可以补充发送失败的 UI 逻辑
    }
  }, []);


  const removeFriendRequest = useCallback((msgId: number) => {
    setFriendRequests((prev) => prev.filter((req) => req.data.msg_id !== msgId));
  }, []);

  const removeMessagesWithUser = useCallback((userId: number) => {
    setMessages((prev) => prev.filter((msg) => {
      if (msg.type === 'NEW_CHAT_MESSAGE') {
        const senderId = msg.data.sender_id;
        const receiverId = msg.data.conversation_id;
        return senderId !== userId && receiverId !== userId;
      }
      return true;
    }));
  }, []);

  return { isConnected, messages, friendRequests, sendMessage, removeFriendRequest, removeMessagesWithUser };
};
