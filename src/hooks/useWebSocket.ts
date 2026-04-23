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

  // Initial load of pending friend requests
  useEffect(() => {
    if (!token) return;

    const fetchPendingRequests = async () => {
      try {
        const { getPendingFriendRequests } = await import('../api/friend');
        const rawRequests = await getPendingFriendRequests();

        const mappedRequests = rawRequests.map(msg => {
          let realSenderId = -1;
          try {
            if (msg.msg_type === 'card' || msg.msg_type === 'notify') {
              const contentObj = JSON.parse(msg.msg_content);
              realSenderId = contentObj.extra?.sender_id || -1;
            }
          } catch (e) {
            // ignore
          }

          return {
            type: 'NEW_CHAT_MESSAGE' as const,
            data: {
              conversation_id: -1, // Use -1 or whatever aligns with system UI
              msg_id: msg.msg_id,
              sender_id: msg.sender_id,
              msg_type: msg.msg_type,
              content: msg.msg_content,
              create_time: msg.create_time,
              quote_message_id: msg.quote_msg_id,
              _applicant_id: realSenderId
            }
          };
        });

        if (mappedRequests.length > 0) {
          setFriendRequests(prev => {
            const newReqs = [...prev];
            mappedRequests.forEach(req => {
              if (!newReqs.find(r => r.data.msg_id === req.data.msg_id)) {
                newReqs.push(req);
              }
            });
            return newReqs;
          });
        }
      } catch (e) {
        console.error("Failed to load pending friend requests", e);
      }
    };

    fetchPendingRequests();
  }, [token]);

  // Sync friend requests to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cached_friend_requests', JSON.stringify(friendRequests));
  }, [friendRequests]);

  useEffect(() => {
    if (!token) return;

    // We use the same host as the API but with the ws:// protocol
    // Assuming backend is at localhost:8000 as defined by user
    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/websocket/ws';
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

          // 1. 拦截好友申请消息 (sender_id === -1)
          if (innerData?.sender_id === -1) {
            console.log('🔔 成功拦截好友申请！放入专属列表。');
            // Parse actual sender id from JSON extra payload
            let realSenderId = -1;
            try {
              if (innerData.msg_type === 'card' || innerData.msg_type === 'notify') {
                const contentObj = JSON.parse(innerData.content);
                realSenderId = contentObj.extra?.sender_id || -1;
              }
            } catch (e) {
               // ignore
            }

            const enrichedData = {
              ...data,
              data: {
                ...innerData,
                _applicant_id: realSenderId
              }
            };

            setFriendRequests((prev) => {
              if (prev.find(r => r.data.msg_id === innerData.msg_id)) return prev;
              return [...prev, enrichedData];
            });
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

  return { isConnected, messages, friendRequests, removeFriendRequest, removeMessagesWithUser };
};
