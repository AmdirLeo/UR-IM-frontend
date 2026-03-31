import { useEffect, useRef, useState, useCallback } from 'react';

export interface ChatMessage {
  type: 'chat';
  sender_id?: number;
  receiver_id?: number;
  content: string;
}

export interface SystemMessage {
  type: 'system';
  message: string;
}

export type WSMessage = ChatMessage | SystemMessage;

interface UseWebSocketReturn {
  isConnected: boolean;
  messages: WSMessage[];
  sendMessage: (receiverId: number, content: string, currentUserId: number) => void;
}

export const useWebSocket = (token: string | null): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) return;

    // We use the same host as the API but with the ws:// protocol
    // Assuming backend is at localhost:8000 as defined by user
    const wsUrl = `ws://127.0.0.1:8000/api/ws/chat?token=${token}`;
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
        if (data.type === 'chat' || data.type === 'system') {
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

  const sendMessage = useCallback((receiverId: number, content: string, currentUserId: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: ChatMessage = {
        type: 'chat',
        receiver_id: receiverId,
        content,
      };
      wsRef.current.send(JSON.stringify(msg));

      // Optimistic UI update so the sender sees their own message:
      setMessages((prev) => [...prev, { type: 'chat', sender_id: currentUserId, content }]);
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  return { isConnected, messages, sendMessage };
};
