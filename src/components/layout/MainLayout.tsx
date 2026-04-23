import React, { useState } from 'react';
import { Sidebar, ViewMode } from './Sidebar';
import { ChatList } from './ChatList';
import { ChatPanel } from './ChatPanel';
import { ContactList, dummyGroups } from './ContactList';
import { ContactDetail } from './ContactDetail';
import { TagManagementPanel } from './TagManagementPanel';
import { useContactContext } from '../../context/ContactContext';
import { useChatContext } from '../../context/ChatContext';
import { chatApi } from '../../api/chat';
import { UserContext } from '../../context/UserContext';
import { SettingsOverlay } from './SettingsOverlay';
import { UserProfile } from './UserProfile';

interface MainLayoutProps {
  currentUserId: string;
  username: string;
  token: string | null;
  onLogout: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentUserId, username, onLogout }) => {
  const { isConnected, messages, sendChatMessage, removeMessagesWithUser, loadConversations, conversations } = useChatContext();
  const { friends } = useContactContext();
  const userContext = React.useContext(UserContext);
  const currentUserAvatar = userContext?.userInfo?.avatar_url || null;

  // View State
  const [activeView, setActiveView] = useState<ViewMode>('messages');
  const [previousView, setPreviousView] = useState<ViewMode>('messages');

  // Messages State
  const [activeChatId, setActiveChatId] = useState<number | null>(null);

  // Contacts State
  const [activeContactId, setActiveContactId] = useState<number | null>(null);
  const [contactViewMode, setContactViewMode] = useState<'contact' | 'tags'>('contact');

  // Layout State
  const [chatListWidth, setChatListWidth] = useState<number>(300);
  const [isResizingList, setIsResizingList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Sync initialization
  React.useEffect(() => {
    if (currentUserId) {
      loadConversations();
    }
  }, [currentUserId, loadConversations]); // Strict dependency to prevent infinite fetch loop

  // Handle friend removal event
  React.useEffect(() => {
    const handleFriendRemoved = (event: CustomEvent) => {
      const { friendId } = event.detail;
      if (activeContactId === friendId) {
        setActiveContactId(null);
      }
      // Also clear active chat if it was with the removed friend
      if (activeChatId === friendId) {
        setActiveChatId(null);
      }
      // Remove all messages with the removed friend
      removeMessagesWithUser(friendId);
    };

    window.addEventListener('friendRemoved', handleFriendRemoved as EventListener);
    return () => {
      window.removeEventListener('friendRemoved', handleFriendRemoved as EventListener);
    };
  }, [activeContactId, activeChatId, removeMessagesWithUser]);

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

  const handleSendMessage = async (contactId: number) => {
    // Find if we already have a conversation
    let convId = contactId;
    try {
      // Fetch the real direct conversation ID from the backend using the friend's user ID
      const directConv = await chatApi.getDirectConversation(contactId);
      if (directConv && directConv.conversation_id) {
        convId = directConv.conversation_id;
      }
    } catch (e) {
      console.error('Failed to get direct conversation ID for friend', e);
      // Fallback: try to find it in the sync list
      const existingConv = conversations.find(
        (c) => c.type === 'private' && (c.target_id === contactId || c.target_user_id === contactId || c.last_msg_sender_id === contactId) // fallback approximation
      );
      if (existingConv) {
        convId = existingConv.conversation_id;
      }
    }

    setActiveChatId(convId);
    setPreviousView(activeView);
    setActiveView('messages');
  };

  const handleNavigate = (view: ViewMode) => {
    if (view === 'profile' && activeView !== 'profile') {
      setPreviousView(activeView);
    }
    setActiveView(view);
  };

  const handleSelectContact = (id: number) => {
    setActiveContactId(id);
    setContactViewMode('contact');
  };

  const handleSelectTagsView = () => {
    setContactViewMode('tags');
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
              currentUserId={currentUserId}
            />
          ) : (
            <ContactList
              activeContactId={activeContactId}
              activeView={contactViewMode}
              onSelectContact={handleSelectContact}
              onSelectTagsView={handleSelectTagsView}
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
                activeChatName={`Chat ${activeChatId}`} // Fallback for now if friend isn't mapped
                activeChatAvatar={null}
                currentUserId={currentUserId}
                currentUserAvatar={currentUserAvatar}
                isConnected={isConnected}
                sendMessage={sendChatMessage}
              />
            )
          ) : contactViewMode === 'tags' ? (
            <div className="flex-1 min-w-[400px] h-full">
              <TagManagementPanel />
            </div>
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
