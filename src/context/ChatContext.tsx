import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocket, WSMessage, NewChatMessage } from '../hooks/useWebSocket';

import { ConversationItem } from '../api/chat';

interface ChatContextType {
  isConnected: boolean;
  messages: WSMessage[];
  friendRequests: NewChatMessage[];
  sendMessage: (receiverId: number, content: string, currentUserId: number) => void;
  removeFriendRequest: (msgId: number) => void;
  removeMessagesWithUser: (userId: number) => void;
  conversations: ConversationItem[];
  loadConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

import { useChat } from '../hooks/useChat';
import { UserContext } from './UserContext';

export const ChatProvider: React.FC<{ children: ReactNode, token: string | null }> = ({ children, token }) => {
  const ws = useWebSocket(token);
  const userContext = useContext(UserContext);
  const currentUserId = userContext?.userInfo?.id ? Number(userContext.userInfo.id) : 0;

  const chat = useChat(currentUserId);

  // We wrap chat.sendChatMessage to match the signature of the old sendMessage
  // (receiverId: number, content: string, currentUserId: number) => void
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sendMessage = (receiverId: number, content: string, _senderId: number) => {
    // The previous implementation used text type, we call sendChatMessage which defaults to "text"
    chat.sendChatMessage(receiverId, content, "text");
  };

  const contextValue = {
    ...ws,
    sendMessage,
    conversations: chat.conversations,
    loadConversations: chat.loadConversations,
    // Note: If you need to access messagesMap later, you can expand ChatContextType and include `...chat` here
  };

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
