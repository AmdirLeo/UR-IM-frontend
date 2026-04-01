import React, { useState } from 'react';
import { Sidebar, ViewMode } from './Sidebar';
import { ChatList, dummyChats } from './ChatList';
import { ChatPanel } from './ChatPanel';
import { ContactList, dummyFriends, dummyGroups } from './ContactList';
import { ContactDetail } from './ContactDetail';
import { useWebSocket } from '../../hooks/useWebSocket';
import { SettingsOverlay } from './SettingsOverlay';

interface MainLayoutProps {
  currentUserId: string;
  username: string;
  token: string | null;
  onLogout: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentUserId, token, onLogout }) => {
  const { isConnected, messages, sendMessage } = useWebSocket(token);

  // View State
  const [activeView, setActiveView] = useState<ViewMode>('messages');

  // Messages State
  const [activeChatId, setActiveChatId] = useState<number>(0);

  // Contacts State
  const [activeContactId, setActiveContactId] = useState<number | null>(null);

  // Layout State
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

  // Derived state for ContactDetail
  const activeContact =
    dummyFriends.find(f => f.id === activeContactId) ||
    dummyGroups.find(g => g.id === activeContactId);

  const handleSendMessage = (contactId: number) => {
    // In a real app, this might create a new chat or find an existing one
    // For now, we mock it by switching to Messages view and setting the activeChatId
    setActiveChatId(contactId);
    setActiveView('messages');
  };

  return (
    <div className="flex h-screen w-full bg-gray-100 dark:bg-[#111111] overflow-hidden font-sans relative">
      {showSettings && <SettingsOverlay onClose={() => setShowSettings(false)} />}

      {/* 1. Left Narrow Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={onLogout}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* 2. Middle List Area (Chats or Contacts) */}
      {activeView === 'messages' ? (
        <ChatList
          activeChatId={activeChatId}
          onSelectChat={(id) => setActiveChatId(id)}
          width={chatListWidth}
        />
      ) : (
        <ContactList
          activeContactId={activeContactId}
          onSelectContact={(id) => setActiveContactId(id)}
          width={chatListWidth}
        />
      )}

      {/* Drag handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-gray-300 dark:hover:bg-gray-700 active:bg-blue-500 z-10 transition-colors"
        onMouseDown={() => setIsResizingList(true)}
      />

      {/* 3. Main Detail Area (Chat Panel or Profile Detail) */}
      {activeView === 'messages' ? (
        <ChatPanel
          activeChatId={activeChatId}
          activeChatName={dummyChats.find(c => c.id === activeChatId)?.name}
          currentUserId={currentUserId}
          isConnected={isConnected}
          messages={messages}
          sendMessage={sendMessage}
        />
      ) : (
        <ContactDetail
          contactId={activeContactId}
          contactName={activeContact?.name}
          avatarColor={activeContact?.avatarColor}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
};
