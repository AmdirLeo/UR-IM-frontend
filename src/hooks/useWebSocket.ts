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
}

export const useWebSocket = (token: string | null): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  // 👈 新增：专门存储好友申请的 State
  const [friendRequests, setFriendRequests] = useState<NewChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

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
          // 拦截到新版结构，向内剥开一层判断 msg_type
          if (data.data && data.data.msg_type === 'friend_apply') {
            console.log('🔔 成功拦截好友申请！放入专属列表。');
            setFriendRequests((prev) => [...prev, data]); // 塞进好友申请列表
          } else if (data.data && data.data.msg_type === 'friend_accept') {
            console.log('🔔 对方同意了好友申请！');
            // 派发全局事件，通知 ContactContext 刷新好友列表
            window.dispatchEvent(new CustomEvent('remote_friend_accept'));
            // 依然放进聊天框，让 System Assistant 渲染通知卡片
            setMessages((prev) => [...prev, data]);
          } else {
            // 如果是其他类型的新消息（比如普通文本），依然放进聊天框
            setMessages((prev) => [...prev, data]);
          }
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

  const sendMessage = useCallback((receiverId: number, content: string, currentUserId: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg = {
        type: 'chat',
        target_id: receiverId,
        content,
      };
      wsRef.current.send(JSON.stringify(msg));

      // Optimistic UI update so the sender sees their own message:
      setMessages((prev) => [...prev, { type: 'chat', sender_id: currentUserId, content }]);
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);


  const removeFriendRequest = useCallback((msgId: number) => {
    setFriendRequests((prev) => prev.filter((req) => req.data.msg_id !== msgId));
  }, []);

  return { isConnected, messages, friendRequests, sendMessage, removeFriendRequest };
};
