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
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

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

  // A global map to easily lookup quoted messages by their actual msg_id
  // This is a ref because we don't need to trigger re-renders when it updates
  // and we want it immediately available.
  const quotedMessagesMap = useRef<Map<number, HistoryMessageItem | LocalMessage>>(new Map());

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
      const userConversations = data.conversations.filter((c: any) => c.last_msg_sender_id !== -1 && c.conversation_id !== -1);
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

    // If retrying, remove the old failed message from the UI while we retry
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

      // Support both 0 and 200 as valid backend success codes
      if ((res.code === 0 || res.code === 200) && res.data) {
        // Success: Add the message to UI with real msg_id and server_time
        const { msg_id, server_time } = res.data;
        const finalMessage = { ...optimisticMessage, msg_id, create_time: server_time };

        setMessagesMap(prev => {
          const conversationMessages = prev[conversationId] || [];
          // If WebSocket already pushed this message, don't duplicate
          if (conversationMessages.some(m => m.msg_id === msg_id)) {
             return prev;
          }
          return {
            ...prev,
            [conversationId]: [...conversationMessages, finalMessage]
          };
        });

        // Add to our reference map so others can quote it
        quotedMessagesMap.current.set(msg_id, finalMessage as LocalMessage);

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
            // It's a brand new conversation, asynchronously load to fetch full metadata
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
      // Mark as failed and append it so the user can retry
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

  const receiveIncomingMessage = useCallback((msgData: any) => {
    const convId = msgData.conversation_id;
    if (!convId) return;

    // Build a LocalMessage from the raw WS data
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

    setMessagesMap(prev => {
      const existing = prev[convId] || [];
      // Prevent duplicates (e.g. pushed by history or API response already)
      if (existing.find(m => m.msg_id === newMsg.msg_id)) {
        return prev;
      }

      // Special case: if we have a failed message with the identical content, and the WS pushes
      // the message back (maybe it actually succeeded on the server but our client timed out),
      // we might want to clean up the failed message, though usually failed messages don't exist
      // on the server. For now, we simply append the incoming WS message.

      // If we had an optimistic UI strategy, we would deduplicate pending messages here,
      // but since we removed it, we just append any new messages not already in the list.
      return {
        ...prev,
        [convId]: [...existing, newMsg]
      };
    });

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
          return {
            ...conv,
            last_msg_content: newMsg.msg_content,
            last_msg_send_time: newMsg.create_time,
            last_msg_sender_id: newMsg.sender_id,
            last_msg_type: newMsg.msg_type,
            unread_count: conv.unread_count + 1
          };
        }
        return conv;
      });
    });
  }, [loadConversations]);

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
  };
};
