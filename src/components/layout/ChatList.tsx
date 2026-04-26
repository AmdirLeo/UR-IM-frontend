import React, { useState, useMemo } from 'react';
import { Search, Plus, BellOff, Pin, PinOff, Bell } from 'lucide-react';
import { useContactContext } from '../../context/ContactContext';
import { useChatContext } from '../../context/ChatContext';
import { formatAvatarUrl } from '../../utils/url';
import { formatChatListTime } from '../../utils/timeFormat';
import { useContextMenu } from '../common/ContextMenu/useContextMenu';
import { ContextMenu, ContextMenuItem } from '../common/ContextMenu/ContextMenu';
import { CreateGroupModal } from './CreateGroupModal';

interface ChatListProps {
  activeChatId: number | null;
  onSelectChat: (id: number) => void;
  width: number;
  currentUserId: string;
}

interface ChatItem {
  id: number;
  name: string;
  time: string;
  timestamp: number;
  unread: number;
  avatarUrl?: string | null;
  avatarColor: string;
  isMuted: boolean;
  lastMessage?: string;
  pinned?: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({ activeChatId, onSelectChat, width, currentUserId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { friends } = useContactContext();
  const { conversations, togglePinConversation, toggleMuteConversation, loadConversations } = useChatContext();

  const { xPos, yPos, showMenu, setShowMenu, handleContextMenu } = useContextMenu();
  const [contextMenuChatId, setContextMenuChatId] = useState<number | null>(null);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

  const handleRightClick = (e: React.MouseEvent, chatId: number) => {
    setContextMenuChatId(chatId);
    handleContextMenu(e);
  };

  const activeContextMenuChat = useMemo(() => {
    return conversations.find(c => c.conversation_id === contextMenuChatId);
  }, [conversations, contextMenuChatId]);

  const menuItems: ContextMenuItem[] = useMemo(() => {
    if (!activeContextMenuChat) return [];

    return [
      {
        label: activeContextMenuChat.pinned ? '取消置顶' : '置顶会话',
        icon: activeContextMenuChat.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />,
        onClick: () => {
          if (contextMenuChatId) {
            togglePinConversation(contextMenuChatId, !activeContextMenuChat.pinned);
          }
        }
      },
      {
        label: activeContextMenuChat.muted ? '取消免打扰' : '消息免打扰',
        icon: activeContextMenuChat.muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />,
        onClick: () => {
          if (contextMenuChatId) {
            toggleMuteConversation(contextMenuChatId, !activeContextMenuChat.muted);
          }
        }
      }
    ];
  }, [activeContextMenuChat, contextMenuChatId, togglePinConversation, toggleMuteConversation]);

  // Generate dynamic chat list from conversations context directly
  const chats: ChatItem[] = useMemo(() => {
    const chatItems: ChatItem[] = [];

    conversations.forEach(conv => {
      let chatName = `Chat ${conv.conversation_id}`;
      let chatAvatarUrl: string | null = null;

      // 严格根据类型进行分支处理
      if (conv.type === 'private') {
        // --- 【单聊逻辑】 ---
        const targetId = conv.target_id || conv.target_user_id;
        
        if (targetId && targetId !== parseInt(currentUserId, 10)) {
          const matchedFriend = friends.find(f => f.user_id === targetId);
          
          if (matchedFriend) {
            // A. 好友优先
            chatName = matchedFriend.username;
            chatAvatarUrl = matchedFriend.avatar_url;
          } else {
            // B. 临时会话/非好友兜底
            chatName = conv.name || `User ${targetId}`;
            chatAvatarUrl = conv.avatar_url;
          }
        }
      } else if (conv.type === 'group') {
        // --- 【群聊逻辑】 ---
        // 严格使用 interface 中定义的 name 和 avatar_url
        chatName = conv.name || `群聊 ${conv.conversation_id}`;
        chatAvatarUrl = conv.avatar_url;
      }

      // Safely parse JSON message content if applicable
      let parsedLastMessage = conv.last_msg_content || 'No messages yet';
      if (conv.last_msg_content && conv.last_msg_content.startsWith('{')) {
        try {
          const parsed = JSON.parse(conv.last_msg_content);
          parsedLastMessage = parsed.content || parsedLastMessage;
        } catch (e) {
          // fallback to raw string
        }
      }

      chatItems.push({
        id: conv.conversation_id, // STRICTLY map to conversation_id
        name: chatName,
        avatarUrl: chatAvatarUrl,
        avatarColor: 'bg-gray-300', // Default or derived color
        isMuted: conv.muted || false,
        unread: activeChatId === conv.conversation_id ? 0 : (conv.unread_count || 0),
        lastMessage: parsedLastMessage,
        time: conv.last_msg_send_time ? formatChatListTime(conv.last_msg_send_time) : '',
        timestamp: conv.last_msg_send_time ? new Date(conv.last_msg_send_time).getTime() : 0,
        pinned: conv.pinned
      });
    });

    // Sort chronologically but respect pinned
    return chatItems.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.timestamp - a.timestamp;
    });
  }, [friends, conversations, activeChatId, currentUserId]);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      style={{ width: `${width}px`, minWidth: '200px' }}
      className="h-full bg-secondary border-r border-primary flex flex-col relative shrink-0"
    >
      {/* Search Header */}
      <div className="h-[60px] flex items-center px-4 space-x-2 shrink-0">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-secondary" />
          </div>
          <input
            type="text"
            className="w-full bg-panel text-primary rounded text-sm pl-8 pr-2 py-1.5 focus:outline-none focus:bg-primary focus:ring-1 focus:ring-border-focus transition-colors"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          className="w-7 h-7 bg-panel rounded flex items-center justify-center hover:bg-hover transition-colors shrink-0"
          onClick={() => setIsCreateGroupModalOpen(true)}
        >
          <Plus className="h-4 w-4 text-secondary" />
        </button>
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onSuccess={async (conversationId) => {
          await loadConversations();
          onSelectChat(conversationId);
        }}
      />

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            onContextMenu={(e) => handleRightClick(e, chat.id)}
            className={`flex items-center px-4 py-3 cursor-pointer ${activeChatId === chat.id
              ? 'bg-active'
              : 'hover:bg-hover dark:hover:bg-hover'
              }`}
          >
            {/* Avatar */}
            <div className={`w-10 h-10 rounded overflow-hidden flex-shrink-0 mr-3 ${chat.avatarColor}`}>
              {chat.avatarUrl && formatAvatarUrl(chat.avatarUrl) ? (
                <img src={formatAvatarUrl(chat.avatarUrl)!} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-white font-bold opacity-75">
                  {chat.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-0.5">
                <span className={`text-base truncate font-normal ${activeChatId === chat.id
                  ? 'text-primary'
                  : 'text-secondary'
                  }`}>
                  {chat.name}
                </span>
                <span className="text-xs text-tertiary shrink-0 ml-2">{chat.time}</span>
              </div>
              <div className="text-xs text-secondary truncate flex items-center justify-between">
                <span className="truncate w-full pr-2">{chat.lastMessage || '[No messages yet]'}</span>
                {chat.unread > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2">
                    {chat.unread}
                  </span>
                )}
                {chat.isMuted && <BellOff className="h-3 w-3 text-tertiary shrink-0 ml-1" />}
              </div>
            </div>
          </div>
        ))}
      </div>
      <ContextMenu
        x={xPos}
        y={yPos}
        show={showMenu}
        onClose={() => setShowMenu(false)}
        items={menuItems}
      />
    </div>
  );
};
