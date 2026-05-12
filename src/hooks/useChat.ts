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
  extra?: Record<string, any>;
}

export const useChat = (currentUserId: number) => {
  const activeChatIdRef = useRef<number | null>(null);
  const setCurrentActiveChatId = useCallback((id: number | null) => {
    activeChatIdRef.current = id;
  }, []);

  const processedQuoteIncrements = useRef<Set<number>>(new Set());
  const incrementQuoteCount = useCallback((newMsgId: number, targetMsgId: number, conversationId: number) => {
    // 如果这条新消息已经贡献过计数了，直接返回
    if (processedQuoteIncrements.current.has(newMsgId)) return;
    processedQuoteIncrements.current.add(newMsgId);

    // 同步更新字典（不直接修改对象属性，而是替换对象）
    const quotedMsg = quotedMessagesMap[targetMsgId];
    if (quotedMsg) {
      const updatedMsg = { ...quotedMsg, quote_num: (quotedMsg.quote_num || 0) + 1 };
      setQuotedMessagesMap(prev => ({ ...prev, [targetMsgId]: updatedMsg }));
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
  const [quotedMessagesMap, setQuotedMessagesMap] = useState<Record<number, LocalMessage>>(() => {
    const dict: Record<number, LocalMessage> = {};
    try {
      const cached = localStorage.getItem(`chat_messages_map_${currentUserId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        Object.values(parsed).forEach((msgs: any) => {
          msgs.forEach((msg: any) => {
            if (msg.msg_id) dict[msg.msg_id] = msg;
          });
        });
      }
    } catch (e) { console.error(e); }
    return dict;
  });

  const updateQuoteDict = useCallback((messages: (HistoryMessageItem | LocalMessage)[]) => {
    setQuotedMessagesMap(prev => {
      const newDict = { ...prev };
      let changed = false;
      messages.forEach(msg => {
        if (msg.msg_id && !newDict[msg.msg_id]) {
          newDict[msg.msg_id] = msg as LocalMessage;
          changed = true;
        }
      });
      return changed ? newDict : prev;
    });
  }, []);

  // 3. 自动补全缺失的引用内容
  const fetchMissingQuotes = useCallback(async (conversationId: number, messages: LocalMessage[]) => {
    // 找出所有本地字典里没有的 quote_msg_id
    const missingIds = Array.from(new Set(
      messages
        .map(m => m.quote_msg_id)
        .filter((id): id is number => !!id && !quotedMessagesMap[id])
    ));

    if (missingIds.length === 0) return;

    await Promise.all(missingIds.map(async (id) => {
      try {
        // 【修正 1】：必须传入真实的 conversationId，否则后端会报权限错误
        const res = await chatApi.getMessageHistory({ 
          conversation_id: conversationId, 
          start_msg_id: id + 1, // 因为后端的游标是 < msg_id，所以查特定 id 需要 +1
          limit: 1 
        });

        // 【修正 2】：使用与 loadMessageHistory 相同的安全解包逻辑
        const historyArray = Array.isArray(res) ? res : ((res as any).data || []);
        const msg = historyArray[0];

        if (msg && msg.msg_id === id) {
          updateQuoteDict([msg]);
        }
      } catch (e) {
        console.warn(`无法补全消息内容 ${id}`, e);
      }
    }));
  }, [quotedMessagesMap, updateQuoteDict]);

  // Store messages by conversation_id, lazily initialized from localStorage
  const [messagesMap, setMessagesMap] = useState<Record<number, LocalMessage[]>>(() => {
    try {
      const cached = localStorage.getItem(`chat_messages_map_${currentUserId}`);
      if (cached) {
        return JSON.parse(cached);
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

  // Listen for real-time group join/leave events to update the conversation list
  useEffect(() => {
    const handleRemoteGroupJoin = () => {
      loadConversations();
    };

    window.addEventListener('remote_group_join', handleRemoteGroupJoin);
    
    return () => {
      window.removeEventListener('remote_group_join', handleRemoteGroupJoin);
    };
  }, [loadConversations]);
  
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

      // 1. 先更新字典
      updateQuoteDict(history);
      
      // 2. 异步补全缺失的引用消息（【修改】：传入 conversationId）
      fetchMissingQuotes(conversationId, history as any);

      // Update our quotedMessagesMap reference Map
      updateQuoteDict(history);

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
        const finalMessage = { ...optimisticMessage, msg_id, create_time: server_time };

        let isDuplicate = false; // 设置一个局部信号枪

        // 1. 将数据插入和去重检查合并，确保使用的是绝对最新的列表
        setMessagesMap(prev => {
          const conversationMessages = prev[conversationId] || [];
          // 真正的防重检查：在这个回调里查最新的状态！
          if (conversationMessages.some(m => m.msg_id === msg_id)) {
            isDuplicate = true; // 发现重复，开枪！
            return prev;        // 啥也不干，原样返回
          }
          return {
            ...prev,
            [conversationId]: [...conversationMessages, finalMessage]
          };
        });

        // 2. 如果刚才开枪了（被 WebSocket 抢先了），HTTP 任务直接提前下班！
        if (isDuplicate) return;

        // 3. 只有当 HTTP 是赢家时，才执行后续的写字典和增加引用操作
        setQuotedMessagesMap(prev => ({ ...prev, [msg_id]: finalMessage as LocalMessage }));

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
             const targetQuoteId = msgToDelete.quote_msg_id;

             updatedMessages = updatedMessages.map(m =>
               m.msg_id === targetQuoteId
                 ? { ...m, quote_num: Math.max(0, (m.quote_num || 0) - 1) }
                 : m
             );
             
             // 同步更新全局的引用字典
             // 使用 prev 函数式更新，不依赖外部的 quotedMessagesMap，并保持对象不可变
             setQuotedMessagesMap(prevDict => {
                const qMsg = prevDict[targetQuoteId];
                if (qMsg && qMsg.quote_num) {
                   return {
                      ...prevDict,
                      [targetQuoteId]: {
                         ...qMsg,
                         quote_num: Math.max(0, qMsg.quote_num - 1)
                      }
                   };
                }
                return prevDict;
             });
          }

          // 3. Update the conversations' last message if we just deleted the latest one
          setConversations(prevConvs => {
            return prevConvs.map(conv => {
              if (conv.conversation_id === conversationId) {
                if (conv.last_msg_id === msgId || conv.last_msg_content === msgToDelete?.msg_content) {
                  const newLastMsg = updatedMessages[updatedMessages.length - 1];
                  if (newLastMsg) {
                    return {
                      ...conv,
                      last_msg_id: newLastMsg.msg_id,
                      last_msg_content: newLastMsg.msg_content,
                      last_msg_send_time: newLastMsg.create_time,
                      last_msg_sender_id: newLastMsg.sender_id,
                      last_msg_type: newLastMsg.msg_type,
                    };
                  } else {
                    return {
                      ...conv,
                      last_msg_id: undefined,
                      last_msg_content: '',
                      last_msg_send_time: undefined,
                      last_msg_sender_id: undefined,
                      last_msg_type: undefined,
                    };
                  }
                }
              }
              return conv;
            });
          });

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
      setQuotedMessagesMap(prev => ({ ...prev, [newMsg.msg_id!]: newMsg }));
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
          const isOwnMessage = newMsg.sender_id === parseInt(currentUserId as any, 10);
          
          // 👉 【核心判断】：看看发来消息的这个会话，是不是我们当前正在看的会话？
          const isCurrentActiveChat = activeChatIdRef.current === convId;
          
          // 如果不是我自己发的，且我没在看这个会话，才增加未读数！
          let shouldAddUnread = !isOwnMessage && !isCurrentActiveChat; 

          // 1. 如果是系统通知（-1）或群助手（-2），一律不增加未读数（解决退群/被踢等通知导致 +1）
          if (newMsg.msg_type === 'notify' && (newMsg.sender_id === -2 || newMsg.sender_id === -1)) {
             shouldAddUnread = false;
          }

          // 2. 如果当前会话状态已经是 abnormal（已退群/被踢），不再接受任何新消息的未读提醒
          if (conv.status === 'abnormal') {
            shouldAddUnread = false;
          }

          return {
            ...conv,
            last_msg_content: newMsg.msg_content,
            last_msg_send_time: newMsg.create_time,
            last_msg_sender_id: newMsg.sender_id,
            last_msg_type: newMsg.msg_type,

            // 3. 应用判断逻辑
            unread_count: shouldAddUnread ? conv.unread_count + 1 : conv.unread_count
          };
        }
        return conv;
      });
    });
  }, [incrementQuoteCount, loadConversations, currentUserId]);

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
    quotedMessagesMap,
    loadConversations,
    loadMessageHistory,
    sendChatMessage,
    markAsRead,
    receiveIncomingMessage,
    deleteChatMessage,
    togglePinConversation,
    toggleMuteConversation,
    setCurrentActiveChatId,
  };
};
