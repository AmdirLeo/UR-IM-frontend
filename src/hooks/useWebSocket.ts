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
    content: string;   // 文本或者 JSON 字符串
    extra?: any;       // 附加数据，例如卡片信息
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
  groupRequests: NewChatMessage[];
  removeGroupRequest: (applyId: number) => void;
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
  // 专门存储入群申请的 State
  const [groupRequests, setGroupRequests] = useState<NewChatMessage[]>(() => {
    const cached = localStorage.getItem('cached_group_requests');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached group requests:', e);
      }
    }
    return [];
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  // Initial load of pending friend requests & group requests
  useEffect(() => {
    if (!token) return;

    const fetchPendingRequests = async () => {
      try {
        const { getPendingFriendRequests } = await import('../api/friend');
        const rawRequests = await getPendingFriendRequests();

        const mappedRequests = rawRequests.map(req => {
          return {
            type: 'NEW_CHAT_MESSAGE' as const,
            data: {
              conversation_id: -1,
              msg_id: req.request_id, // Brilliant deduplication key
              sender_id: -1,
              msg_type: 'card',
              content: JSON.stringify({
                type: 'card',
                content: `[收到一条好友申请]`,
                extra: {
                  card_type: req.card_type,
                  request_id: req.request_id,
                  sender_id: req.sender_id,
                  sender_name: req.sender_name, // Pass the name through so UI doesn't have to fetch it!
                  sender_avatar: req.sender_avatar,
                  reason: req.reason,
                  status: req.status
                }
              }),
              create_time: new Date(req.create_time * 1000).toISOString(),
              _applicant_id: req.sender_id
            }
          };
        });

        if (mappedRequests.length > 0) {
          // Replace or deduplicate the cached list
          setFriendRequests(prev => {
            const newReqs = [...prev];
            mappedRequests.forEach(req => {
              const existingIdx = newReqs.findIndex(r => r.data.msg_id === req.data.msg_id);
              if (existingIdx >= 0) {
                // Update existing request status
                newReqs[existingIdx] = req;
              } else {
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

    const fetchPendingGroupRequests = async () => {
      try {
        const { getPendingGroupInvites } = await import('../api/group');
        const res = await getPendingGroupInvites();
        const rawRequests = res.data || [];

        const mappedRequests = rawRequests.map(req => {
          return {
            type: 'NEW_CHAT_MESSAGE' as const,
            data: {
              conversation_id: -1,
              msg_id: req.apply_id, // Use apply_id as unique msg_id for local deduplication
              sender_id: -2,
              msg_type: 'card',
              content: JSON.stringify({
                type: 'card',
                content: `[收到一条入群申请]`,
                extra: req // The REST API response structure has all the info we need
              }),
              create_time: new Date(req.create_time * 1000).toISOString(),
            }
          };
        });

        if (mappedRequests.length > 0) {
          setGroupRequests(prev => {
            const newReqs = [...prev];
            mappedRequests.forEach(req => {
              const existingIdx = newReqs.findIndex(r => r.data.msg_id === req.data.msg_id);
              if (existingIdx >= 0) {
                newReqs[existingIdx] = req;
              } else {
                newReqs.push(req);
              }
            });
            return newReqs;
          });
        } else {
            setGroupRequests([]); // clear if none from API
        }
      } catch (e) {
        console.error("Failed to load pending group requests", e);
      }
    };

    fetchPendingRequests();
    fetchPendingGroupRequests();
  }, [token]);

  // Sync friend requests to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cached_friend_requests', JSON.stringify(friendRequests));
  }, [friendRequests]);

  // Sync group requests to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cached_group_requests', JSON.stringify(groupRequests));
  }, [groupRequests]);

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

          // 专门处理来自系统的好友申请通知（sender_id === -1）
          if (innerData?.sender_id === -1) {
            const msgType = innerData.msg_type; // 'card' 或者是 'notify'

            // 兼容直接在 extra 字段下发，或者在 content 中 stringify 的情况
            let extra = innerData.extra || {};
            if (Object.keys(extra).length === 0 && innerData.content) {
              try {
                const parsedContent = JSON.parse(innerData.content);
                if (parsedContent.extra) {
                  extra = parsedContent.extra;
                }
              } catch (e) {
                // Not valid JSON, which is expected for plain text content
              }
            }

            // 🌟 情况 A：这确实是一条【好友申请】
            if (msgType === 'card' && extra.card_type === 'friend_apply') {
              console.log('🔔 成功拦截好友申请！放入专属列表。');
              
              const realSenderId = extra.sender_id || -1;
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
              return; // 处理完毕，退出
            }

            // 🌟 情况 B：这是一条【同意好友的系统通知】
            if (msgType === 'notify' && extra.action === 'friend_accept') {
              console.log('🔔 对方同意了好友申请！系统通知：', extra.tips);
              // 触发全局事件，让其他组件去刷新通讯录等
              window.dispatchEvent(new CustomEvent('remote_friend_accept'));
              
              // 视你的需求而定：如果你想在聊天界面显示一条灰色的系统提示，就把取消下面这行的注释
              // setMessages((prev) => [...prev, data]);
              
              return; // 处理完毕，退出
            }

            // 其他未知的系统消息，直接忽略或交由兜底逻辑
            console.log('收到未知的好友系统消息:', data);
            return;
          }

          // 专门处理来自系统群助手的入群申请通知（sender_id === -2）
          if (innerData?.sender_id === -2) {
            const msgType = innerData.msg_type;

            let extra = innerData.extra || {};
            if (Object.keys(extra).length === 0 && innerData.content) {
              try {
                const parsedContent = JSON.parse(innerData.content);
                if (parsedContent.extra) {
                  extra = parsedContent.extra;
                }
              } catch (e) {}
            }

            // 🌟 情况 C：这确实是一条【入群申请】
            if (msgType === 'card' && extra.card_type === 'group_apply') {
              console.log('🔔 成功拦截入群申请！放入专属列表，尝试重新拉取完整列表。');
              // Optionally trigger a re-fetch since WS might only have partial data
              import('../api/group').then(({ getPendingGroupInvites }) => {
                getPendingGroupInvites().then(res => {
                    const rawRequests = res.data || [];
                    const mappedRequests = rawRequests.map(req => ({
                        type: 'NEW_CHAT_MESSAGE' as const,
                        data: {
                            conversation_id: -1,
                            msg_id: req.apply_id,
                            sender_id: -2,
                            msg_type: 'card',
                            content: JSON.stringify({
                                type: 'card',
                                content: `[收到一条入群申请]`,
                                extra: req
                            }),
                            create_time: new Date(req.create_time * 1000).toISOString(),
                        }
                    }));
                    setGroupRequests(mappedRequests);
                }).catch(e => console.error("Failed to re-fetch group requests on WS event", e));
              });

              return; // 处理完毕，退出
            }

            // 处理群相关系统通知
            if (msgType === 'notify') {
              const action = extra.action;

              if (action === 'added_to_group' || action === 'group_created') {
                console.log('🔔 加入新群聊！系统通知：', extra.tips);
                window.dispatchEvent(new CustomEvent('remote_group_join'));
                return;
              }

              if (action === 'group_admin_set' || action === 'group_admin_unset' || action === 'group_owner_transferred') {
                console.log('🔔 群权限变更！系统通知：', extra.tips);
                window.dispatchEvent(new CustomEvent('remote_group_update', {
                  detail: { conversation_id: extra.conversation_id || innerData.conversation_id }
                }));
                return;
              }

              if (action === 'kicked_from_group' || action === 'left_group') {
                console.log('🔔 移出群聊！系统通知：', extra.tips);
                if (action === 'kicked_from_group') {
                  alert('您已被移出该群聊');
                }
                const targetGroupId = extra.conversation_id || innerData.conversation_id;
                // Dispatch event to close chat panel safely
                window.dispatchEvent(new CustomEvent('remote_group_removed', { detail: { conversation_id: targetGroupId } }));
                // Dispatch event to refresh list
                window.dispatchEvent(new CustomEvent('remote_group_join'));
                return;
              }
            }
            
            console.log('收到未知的群系统消息:', data);
            return; 
          }

          // 3. 其他常规用户的消息（文本、图片等）
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

  const removeGroupRequest = useCallback((applyId: number) => {
    // using msg_id which mapped to applyId
    setGroupRequests((prev) => prev.filter((req) => req.data.msg_id !== applyId));
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

  return { isConnected, messages, friendRequests, removeFriendRequest, groupRequests, removeGroupRequest, removeMessagesWithUser };
};
