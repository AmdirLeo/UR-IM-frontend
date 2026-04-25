import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chatApi, ConversationItem, HistoryMessageItem, SendMessageRequest } from '../api/chat';

// Define our local Message model (extending the history item with local state)
export interface LocalMessage extends Partial<HistoryMessageItem> {
  local_id: string; // Used for optimistic UI
  isSending?: boolean;
  isFailed?: boolean;
  // Make sure these are filled out for local rendering even if backend doesn't have it yet
  msg_type: "text" | "image" | "card" | "notify";
  msg_content: string;
  create_time: string;
  sender_id: number;
}

export const useChat = (currentUserId: number) => {
  const processedQuoteIncrements = useRef<Set<number>>(new Set());
  const incrementQuoteCount = useCallback((newMsgId: number, targetMsgId: number, conversationId: number) => {
    // 如果这条新消息已经贡献过计数了，直接返回
    if (processedQuoteIncrements.current.has(newMsgId)) return;
    processedQuoteIncrements.current.add(newMsgId);

    // 同步更新字典（不直接修改对象属性，而是替换对象）
    const quotedMsg = quotedMessagesMap.current.get(targetMsgId);
    if (quotedMsg) {
      const updatedMsg = { ...quotedMsg, quote_num: (quotedMsg.quote_num || 0) + 1 };
      quotedMessagesMap.current.set(targetMsgId, updatedMsg);
    }

    // 更新状态
    setMessagesMap(prev => {
      const msgs = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: msgs.map(m => 
          m.msg_id === targetMsgId 
            ? { ...m, quote_num: (m.quote_num || 0) + 1 } 
            : m
        )
      };
    });
  }, []);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  // A global map to easily lookup quoted messages by their actual msg_id
  // This is a ref because we don't need to trigger re-renders when it updates
  // and we want it immediately available.
  const quotedMessagesMap = useRef<Map<number, HistoryMessageItem | LocalMessage>>(new Map());

  // Store messages by conversation_id, lazily initialized from localStorage
  const [messagesMap, setMessagesMap] = useState<Record<number, LocalMessage[]>>(() => {
    try {
      const cached = localStorage.getItem(`chat_messages_map_${currentUserId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // 【核心修复】：把缓存里的消息同步塞进字典里！
        Object.values(parsed).forEach((msgs: any) => {
          msgs.forEach((msg: any) => {
            if (msg.msg_id) {
              quotedMessagesMap.current.set(msg.msg_id, msg);
            }
          });
        });
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load cached messages map', e);
    }
    return {};
  });

  // Persist messagesMap to localStorage on change
  // Limit to 50 messages per conversation to avoid QuotaExceeded errors
  useEffect(() => {
    try {
      const mapToCache: Record<number, LocalMessage[]> = {};
      for (const [convId, msgs] of Object.entries(messagesMap)) {
        // keep only the last 50 messages per conversation
          mapToCache[Number(convId)] = (msgs as LocalMessage[]).slice(-50);
      }
      localStorage.setItem(`chat_messages_map_${currentUserId}`, JSON.stringify(mapToCache));
    } catch (e) {
      console.error('Failed to cache messages map', e);
    }
  }, [messagesMap, currentUserId]);

  /**
   * Sort conversations:
   * 1. Pinned conversations first
   * 2. Then by last_msg_send_time (descending)
   */
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      // 1. Pinned
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // 2. Sort by time
      const timeA = a.last_msg_send_time ? new Date(a.last_msg_send_time).getTime() : 0;
      const timeB = b.last_msg_send_time ? new Date(b.last_msg_send_time).getTime() : 0;
      return timeB - timeA;
    });
  }, [conversations]);

  const loadConversations = useCallback(async () => {
    try {
      const response = await chatApi.syncConversations();
      const data = (response as any).data || response;

      if (!data || !Array.isArray(data.conversations)) return;

      // Filter out the system conversation (-1) so it doesn't show in the standard UI lists
      const userConversations = data.conversations
        .filter((c: any) => c.last_msg_sender_id !== -1 && c.conversation_id !== -1)
        .map((c: any) => ({
          ...c,
          pinned: c.is_pinned ?? c.pinned,
          muted: c.is_muted ?? c.muted
        }));
      setConversations(userConversations);

    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  }, []);

  const loadMessageHistory = useCallback(async (conversationId: number, startMsgId?: number, limit: number = 50) => {
    try {
      // For initial load (no startMsgId), we could potentially use the cache to avoid a network call.
      // But standard practice dictates we fetch the latest anyway to catch up on missed messages.
      // The cache provides immediate UI rendering in ChatPanel before this promise resolves.
      const historyResponse = await chatApi.getMessageHistory({ conversation_id: conversationId, start_msg_id: startMsgId, limit });
      // Safely unwrap the standard backend payload wrapper if it exists
      const history: HistoryMessageItem[] = Array.isArray(historyResponse)
        ? historyResponse
        : ((historyResponse as any).data || []);

      if (!Array.isArray(history)) {
        throw new Error("Invalid history response format");
      }


      // Update our quotedMessagesMap reference Map
      history.forEach(msg => {
        quotedMessagesMap.current.set(msg.msg_id, msg);
      });

      // Reverse history so oldest is first (index 0)
      const reversedHistory = [...history].reverse();

      const localHistory: LocalMessage[] = reversedHistory.map(msg => ({
        ...msg,
        local_id: uuidv4(), // Give it a local ID just for React key mapping consistency
        isSending: false,
        isFailed: false,
      }));

      setMessagesMap(prev => {
        const existing = prev[conversationId] || [];

        // Deduplicate the loaded history against what's already cached.
        // If we have a startMsgId, we prepend. If not (initial load), we replace or merge safely.
        if (startMsgId) {
          return {
            ...prev,
            [conversationId]: [...localHistory, ...existing]
          };
        } else {
          // Merge initial fetch with optimistic messages currently unsent or newly arrived WS messages
          // taking care not to duplicate
          const existingIds = new Set(localHistory.map(m => m.msg_id));
          const nonDuplicatedExisting = existing.filter(m => m.msg_id == null || !existingIds.has(m.msg_id));
          return {
            ...prev,
            [conversationId]: [...localHistory, ...nonDuplicatedExisting]
          };
        }
      });
      return history;
    } catch (err) {
      console.error('Failed to load history', err);
      return [];
    }
  }, []);

  const sendChatMessage = useCallback(async (
    conversationId: number,
    content: string,
    type: "text" | "image" | "card" | "notify" = "text",
    quoteMsgId?: number,
    existingLocalId?: string
  ) => {
    const localId = existingLocalId || uuidv4();
    const nowIso = new Date().toISOString();

    const optimisticMessage: LocalMessage = {
      local_id: localId,
      msg_type: type,
      msg_content: content,
      create_time: nowIso,
      sender_id: currentUserId,
      isSending: false, 
      isFailed: false,
      quote_msg_id: quoteMsgId,
    };

    if (existingLocalId) {
      setMessagesMap(prev => {
        const existing = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: existing.filter(msg => msg.local_id !== existingLocalId)
        };
      });
    }

    try {
      const reqPayload: SendMessageRequest = {
        conversation_id: conversationId,
        local_id: localId,
        message_content: content,
        msg_type: type,
        quote_message_id: quoteMsgId,
      };

      const res = await chatApi.sendMessage(reqPayload);

      if ((res.code === 0 || res.code === 200) && res.data) {
        const { msg_id, server_time } = res.data;

        if (quotedMessagesMap.current.has(msg_id)) {
          return; // 发现重复，果断全身而退！
        }

        const finalMessage = { ...optimisticMessage, msg_id, create_time: server_time };

        quotedMessagesMap.current.set(msg_id, finalMessage as LocalMessage); 

        setMessagesMap(prev => {
          const conversationMessages = prev[conversationId] || [];
          return {
            ...prev,
            [conversationId]: [...conversationMessages, finalMessage]
          };
        });

        if (quoteMsgId && msg_id) {
          incrementQuoteCount(msg_id, quoteMsgId, conversationId);
        }

        setConversations(prev => {
          let updated = false;
          const newConvs = prev.map(conv => {
            if (conv.conversation_id === conversationId) {
              updated = true;
              return {
                ...conv,
                last_msg_content: content,
                last_msg_send_time: server_time,
                last_msg_sender_id: currentUserId,
                last_msg_type: type
              };
            }
            return conv;
          });
          if (!updated) {
            loadConversations();
            return prev;
          }
          return newConvs;
        });

      } else {
        throw new Error(res.msg || `Send failed with backend code: ${res.code}`);
      }
    } catch (err) {
      console.error('Send message failed', err);
      // 6. 发送失败：把带有 isFailed 标记的消息塞回列表末尾，供用户点击重试
      setMessagesMap(prev => {
        const conversationMessages = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: [...conversationMessages, { ...optimisticMessage, isFailed: true }]
        };
      });
    }
  }, [currentUserId, loadConversations]);

  
  const markAsRead = useCallback(async (conversationId: number, msgId: number) => {
    try {
      await chatApi.readAck({ conversation_id: conversationId, msg_id: msgId });
      // Update local unread count
      setConversations(prev => prev.map(conv =>
        conv.conversation_id === conversationId ? { ...conv, unread_count: 0, last_ack_msg_id: msgId } : conv
      ));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  }, []);

  const deleteChatMessage = useCallback(async (conversationId: number, msgId: number) => {
    try {
      const res = await chatApi.deleteMessage({ conversation_id: conversationId, message_id: msgId });
      if (res.code === 200) {
        // Optimistically remove the message from local state
        setMessagesMap(prev => {
          const conversationMessages = prev[conversationId] || [];
          
          // 1. 揪出马上要被枪毙的消息，看看它有没有引用别人
          const msgToDelete = conversationMessages.find(msg => msg.msg_id === msgId);
          let updatedMessages = conversationMessages.filter(msg => msg.msg_id !== msgId);

          // 2. 如果它引用了别人，帮别人把引用计数减 1
          if (msgToDelete && msgToDelete.quote_msg_id) {
             updatedMessages = updatedMessages.map(m =>
               m.msg_id === msgToDelete.quote_msg_id
                 ? { ...m, quote_num: Math.max(0, (m.quote_num || 0) - 1) }
                 : m
             );
             
             // 同步更新全局的引用字典
             const quotedMsg = quotedMessagesMap.current.get(msgToDelete.quote_msg_id);
             if (quotedMsg && quotedMsg.quote_num) {
                quotedMsg.quote_num = Math.max(0, quotedMsg.quote_num - 1);
             }
          }

          return {
            ...prev,
            [conversationId]: updatedMessages
          };
        });
        return true;
      }
    } catch (err) {
      console.error('Failed to delete message', err);
    }
    return false;
  }, []);

  const togglePinConversation = useCallback(async (conversationId: number, isPinned: boolean) => {
    try {
      await chatApi.pinConversation({ conversation_id: conversationId, is_pinned: isPinned });
      // Optimistically update
      setConversations(prev => prev.map(conv =>
        conv.conversation_id === conversationId ? { ...conv, pinned: isPinned } : conv
      ));
      return true;
    } catch (err) {
      console.error('Failed to pin conversation', err);
      return false;
    }
  }, []);

  const toggleMuteConversation = useCallback(async (conversationId: number, isMuted: boolean) => {
    try {
      await chatApi.muteConversation({ conversation_id: conversationId, is_muted: isMuted });
      // Optimistically update
      setConversations(prev => prev.map(conv =>
        conv.conversation_id === conversationId ? { ...conv, muted: isMuted } : conv
      ));
      return true;
    } catch (err) {
      console.error('Failed to mute conversation', err);
      return false;
    }
  }, []);

  const receiveIncomingMessage = useCallback((msgData: any) => {
    const convId = msgData.conversation_id;
    if (!convId) return;

    const newMsg: LocalMessage = {
      local_id: uuidv4(),
      msg_id: msgData.msg_id,
      msg_type: msgData.msg_type,
      msg_content: msgData.content,
      create_time: msgData.create_time,
      sender_id: msgData.sender_id,
      quote_msg_id: msgData.quote_message_id,
      isSending: false,
      isFailed: false,
    };

    // 1. 新增一个变量来记录是否是重复消息
    let isDuplicate = false;

    setMessagesMap(prev => {
      const existing = prev[convId] || [];
      if (existing.find(m => m.msg_id === newMsg.msg_id)) {
        isDuplicate = true; // 标记为重复
        return prev;
      }

      // ⚠️ 这里非常干净，只负责把新消息塞进数组，其他什么都不做
      return {
        ...prev,
        [convId]: [...existing, newMsg]
      };
    });

    // 2. 【核心修复】：把引用的更新逻辑挪到 setMessagesMap 的外面！
    // 只有当这条消息不是重复的，并且带有引用信息时，才去触发 +1 操作
    if (!isDuplicate && newMsg.quote_msg_id && newMsg.msg_id) {
      incrementQuoteCount(newMsg.msg_id, newMsg.quote_msg_id, convId);
    }

    if (newMsg.msg_id) {
      quotedMessagesMap.current.set(newMsg.msg_id, newMsg as any);
    }

    setConversations(prev => {
      const exists = prev.find(c => c.conversation_id === convId);
      if (!exists) {
        // Unknown conversation coming from WS, sync to fetch full metadata
        loadConversations();
        return prev;
      }

      return prev.map(conv => {
        if (conv.conversation_id === convId) {
          const isOwnMessage = newMsg.sender_id === currentUserId;
          return {
            ...conv,
            last_msg_content: newMsg.msg_content,
            last_msg_send_time: newMsg.create_time,
            last_msg_sender_id: newMsg.sender_id,
            last_msg_type: newMsg.msg_type,
            unread_count: isOwnMessage ? conv.unread_count : conv.unread_count + 1
          };
        }
        return conv;
      });
    });
  }, [incrementQuoteCount, loadConversations]);

  /**
   * BUSINESS ADVICE FOR WEBSOCKET INTEGRATION:
   *
   * When you receive a `NEW_CHAT_MESSAGE` via WebSocket (in `useWebSocket.ts`), you should:
   * 1. Extract the `data` (which contains conversation_id, msg_id, content, etc.)
   * 2. If it's a chat message for an active conversation, you can expose a function like `receiveIncomingMessage(data)` here
   *    and call it from your component that listens to the WebSocket.
   * 3. Inside `receiveIncomingMessage`:
   *    - Check if we already have this msg_id to avoid duplicates.
   *    - Add it to `messagesMap[data.conversation_id]`.
   *    - Add it to `quotedMessagesMap.current` in case someone quotes it.
   *    - Update the `conversations` array (bump the last_msg_send_time, content, unread_count++ if not active).
   */

  return {
    conversations: sortedConversations,
    messagesMap,
    quotedMessagesMap: quotedMessagesMap.current,
    loadConversations,
    loadMessageHistory,
    sendChatMessage,
    markAsRead,
    receiveIncomingMessage,
    deleteChatMessage,
    togglePinConversation,
    toggleMuteConversation,
  };
};
