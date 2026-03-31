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

import { SettingsOverlay } from './SettingsOverlay';

export const MainLayout: React.FC<MainLayoutProps> = ({ currentUserId, token, onLogout }) => {
  const { isConnected, messages, sendMessage } = useWebSocket(token);

  const [activeChatId, setActiveChatId] = useState<number>(2);
  const [chatListWidth, setChatListWidth] = useState<number>(300);
  const [isResizingList, setIsResizingList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Resize handler for Chat List
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingList) return;
      // Sidebar is 60px
      let newWidth = e.clientX - 60;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 500) newWidth = 500;
      setChatListWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingList(false);
    };

    if (isResizingList) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingList]);

  return (
    <div className="flex h-screen w-full bg-gray-100 dark:bg-[#111111] overflow-hidden font-sans relative">
      {showSettings && <SettingsOverlay onClose={() => setShowSettings(false)} />}

      {/* 1. Left Narrow Sidebar */}
      <Sidebar onLogout={onLogout} onOpenSettings={() => setShowSettings(true)} />

      {/* 2. Middle Chat List Sidebar */}
      <ChatList
        activeChatId={activeChatId}
        onSelectChat={(id) => setActiveChatId(id)}
        width={chatListWidth}
      />

      {/* Drag handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-gray-300 dark:hover:bg-gray-700 active:bg-blue-500 z-10 transition-colors"
        onMouseDown={() => setIsResizingList(true)}
      />

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
