import { useState, useCallback, useMemo, useRef } from 'react';
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
  // Store messages by conversation_id
  const [messagesMap, setMessagesMap] = useState<Record<number, LocalMessage[]>>({});

  // A global map to easily lookup quoted messages by their actual msg_id
  // This is a ref because we don't need to trigger re-renders when it updates
  // and we want it immediately available.
  const quotedMessagesMap = useRef<Map<number, HistoryMessageItem | LocalMessage>>(new Map());

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
      const data = await chatApi.syncConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  }, []);

  const loadMessageHistory = useCallback(async (conversationId: number, startMsgId?: number, limit: number = 50) => {
    try {
      const history = await chatApi.getMessageHistory({ conversation_id: conversationId, start_msg_id: startMsgId, limit });

      // Update our quotedMessagesMap reference Map
      history.forEach(msg => {
        quotedMessagesMap.current.set(msg.msg_id, msg);
      });

      const localHistory: LocalMessage[] = history.map(msg => ({
        ...msg,
        local_id: uuidv4(), // Give it a local ID just for React key mapping consistency
        isSending: false,
        isFailed: false,
      }));

      setMessagesMap(prev => {
        const existing = prev[conversationId] || [];
        // If we are loading older messages, prepend them. If it's a fresh load, replace.
        // For simplicity, we just merge and deduplicate by msg_id if needed, but here we assume it's a prepend
        return {
          ...prev,
          [conversationId]: startMsgId ? [...localHistory, ...existing] : localHistory
        };
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
    quoteMsgId?: number
  ) => {
    const localId = uuidv4();
    const nowIso = new Date().toISOString();

    const optimisticMessage: LocalMessage = {
      local_id: localId,
      msg_type: type,
      msg_content: content,
      create_time: nowIso,
      sender_id: currentUserId,
      isSending: true,
      isFailed: false,
      quote_msg_id: quoteMsgId,
    };

    // Optimistic UI update
    setMessagesMap(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMessage]
    }));

    // Optimistic Conversation Update
    setConversations(prev => prev.map(conv => {
      if (conv.conversation_id === conversationId) {
        return {
          ...conv,
          last_msg_content: content,
          last_msg_send_time: nowIso,
          last_msg_sender_id: currentUserId,
          last_msg_type: type
        };
      }
      return conv;
    }));

    try {
      const reqPayload: SendMessageRequest = {
        conversation_id: conversationId,
        local_id: localId,
        message_content: content,
        msg_type: type, // "text"
        extra_data: {},
        quote_message_id: quoteMsgId,
      };

      console.log('API Send Payload:', reqPayload);

      const res = await chatApi.sendMessage(reqPayload);

      if (res.code === 0 && res.data) {
        // Success: Update the local message with the real msg_id and server_time
        const { msg_id, server_time } = res.data;

        setMessagesMap(prev => {
          const conversationMessages = prev[conversationId] || [];
          return {
            ...prev,
            [conversationId]: conversationMessages.map(msg =>
              msg.local_id === localId
                ? { ...msg, msg_id, create_time: server_time, isSending: false }
                : msg
            )
          };
        });

        // Add to our reference map so others can quote it
        optimisticMessage.msg_id = msg_id;
        quotedMessagesMap.current.set(msg_id, { ...optimisticMessage, msg_id, create_time: server_time, isSending: false } as LocalMessage);

      } else {
        throw new Error(res.msg || "Send failed");
      }
    } catch (err: any) {
      console.error('API Send Failed:', err.response?.data || err);
      // Mark as failed
      setMessagesMap(prev => {
        const conversationMessages = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: conversationMessages.map(msg =>
            msg.local_id === localId ? { ...msg, isSending: false, isFailed: true } : msg
          )
        };
      });
    }
  }, [currentUserId]);

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
  };
};
