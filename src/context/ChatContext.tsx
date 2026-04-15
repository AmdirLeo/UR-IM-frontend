import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocket, WSMessage, NewChatMessage } from '../hooks/useWebSocket';

interface ChatContextType {
  isConnected: boolean;
  messages: WSMessage[];
  friendRequests: NewChatMessage[];
  sendMessage: (receiverId: number, content: string, currentUserId: number) => void;
  removeFriendRequest: (msgId: number) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode, token: string | null }> = ({ children, token }) => {
  const ws = useWebSocket(token);
  return <ChatContext.Provider value={ws}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
