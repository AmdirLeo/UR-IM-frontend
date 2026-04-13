import React, { useState } from 'react';
import { Sidebar, ViewMode } from './Sidebar';
import { ChatList, dummyChats } from './ChatList';
import { ChatPanel } from './ChatPanel';
import { ContactList, dummyGroups } from './ContactList';
import { ContactDetail } from './ContactDetail';
import { useContactContext } from '../../context/ContactContext';
import { useChatContext } from '../../context/ChatContext';
import { SettingsOverlay } from './SettingsOverlay';
import { UserProfile } from './UserProfile';

interface MainLayoutProps {
  currentUserId: string;
  username: string;
  token: string | null;
  onLogout: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentUserId, username, onLogout }) => {
  const { isConnected, messages, sendMessage } = useChatContext();
  const { friends } = useContactContext();

  // View State
  const [activeView, setActiveView] = useState<ViewMode>('messages');
  const [previousView, setPreviousView] = useState<ViewMode>('messages');

  // Messages State
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

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
  const activeFriend = friends.find((f) => f.user_id === activeContactId);
  const activeGroup = dummyGroups.find((g) => g.id === activeContactId);

  const activeContactName = activeFriend?.username || activeGroup?.name;
  const activeContactAvatarColor = activeGroup?.avatarColor; // Only groups have fallback color now, friends will use real avatar
  const activeContactAvatarUrl = activeFriend?.avatar_url;

  const handleSendMessage = (contactId: number) => {
    // In a real app, this might create a new chat or find an existing one
    // For now, we mock it by switching to Messages view and setting the activeChatId
    setActiveChatId(contactId);
    setPreviousView(activeView);
    setActiveView('messages');
  };

  const handleNavigate = (view: ViewMode) => {
    if (view === 'profile' && activeView !== 'profile') {
      setPreviousView(activeView);
    }
    setActiveView(view);
  };

  return (
    <div className="flex h-screen w-full bg-primary overflow-hidden font-sans relative">
      {showSettings && <SettingsOverlay onClose={() => setShowSettings(false)} />}

      {/* 1. Left Narrow Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        onOpenSettings={() => setShowSettings(true)}
      />

      {activeView === 'profile' ? (
        <UserProfile onClose={() => setActiveView(previousView)} currentUserId={currentUserId} onLogout={onLogout} />
      ) : (
        <>
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
            activeChatId === null ? (
              <div className="flex-1 h-full bg-primary flex items-center justify-center min-w-[400px]">
                <h1 className="text-2xl text-primary font-medium">Welcome back, {username}</h1>
              </div>
            ) : (
              <ChatPanel
                activeChatId={activeChatId}
                activeChatName={dummyChats.find((c: { id: number; name: string; avatarColor: string; isMuted: boolean; time: string; unread: number; }) => c.id === activeChatId)?.name}
                currentUserId={currentUserId}
                isConnected={isConnected}
                messages={messages}
                sendMessage={sendMessage}
              />
            )
          ) : (
            <ContactDetail
              contactId={activeContactId}
              contactName={activeContactName}
              avatarColor={activeContactAvatarColor}
              avatarUrl={activeContactAvatarUrl}
              onSendMessage={handleSendMessage}
            />
          )}
        </>
      )}
    </div>
  );
};
