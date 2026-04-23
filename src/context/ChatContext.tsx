import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocket, WSMessage, NewChatMessage } from '../hooks/useWebSocket';
import { useChat, LocalMessage } from '../hooks/useChat';
import { ConversationItem } from '../api/chat';

interface ChatContextType {
  // WebSocket State
  isConnected: boolean;
  messages: WSMessage[];
  friendRequests: NewChatMessage[];
  removeFriendRequest: (msgId: number) => void;
  removeMessagesWithUser: (userId: number) => void;

  // REST / History / Chat state (useChat)
  conversations: ConversationItem[];
  messagesMap: Record<number, LocalMessage[]>;
  loadConversations: () => Promise<void>;
  loadMessageHistory: (conversationId: number, startMsgId?: number, limit?: number) => Promise<any[]>;
  sendChatMessage: (conversationId: number, content: string, type?: "text" | "image" | "card" | "notify", quoteMsgId?: number) => Promise<void>;
  markAsRead: (conversationId: number, msgId: number) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode, token: string | null, currentUserId: number }> = ({ children, token, currentUserId }) => {
  const ws = useWebSocket(token);
  const chatState = useChat(currentUserId);

  // Automatically inject new real-time messages into the messagesMap
  React.useEffect(() => {
    const latestMessage = ws.messages[ws.messages.length - 1];
    if (latestMessage && latestMessage.type === 'NEW_CHAT_MESSAGE') {
      // Don't pass friend requests (which should have _applicant_id or sender_id = -1 properly filtered out by this point or within receiveIncomingMessage)
      if (latestMessage.data.sender_id !== -1) {
        chatState.receiveIncomingMessage(latestMessage.data);
      }
    }
  }, [ws.messages, chatState.receiveIncomingMessage]);

  const combinedValue = {
    ...ws,
    ...chatState
  };

  return <ChatContext.Provider value={combinedValue}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
