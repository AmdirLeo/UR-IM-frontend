import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatList } from './ChatList';
import { ChatPanel } from './ChatPanel';
import { useWebSocket } from '../../hooks/useWebSocket';

interface MainLayoutProps {
  currentUserId: string;
  username: string;
  token: string | null;
  onLogout: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentUserId, token, onLogout }) => {
  const { isConnected, messages, sendMessage } = useWebSocket(token);

  // Dummy active chat for now. In a real app, clicking a user in ChatList would update this.
  const [activeChatId, setActiveChatId] = useState<number>(2);

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden font-sans">
      {/* 1. Left Narrow Sidebar */}
      <Sidebar onLogout={onLogout} />

      {/* 2. Middle Chat List Sidebar */}
      <ChatList activeChatId={activeChatId} onSelectChat={(id) => setActiveChatId(id)} />

      {/* 3. Main Chat Panel */}
      <ChatPanel
        activeChatId={activeChatId}
        currentUserId={currentUserId}
        isConnected={isConnected}
        messages={messages}
        sendMessage={sendMessage}
      />
    </div>
  );
};
