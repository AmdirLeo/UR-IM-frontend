import React, { useState, useMemo } from 'react';
import { Search, Plus, BellOff } from 'lucide-react';
import { useContactContext } from '../../context/ContactContext';
import { useChatContext } from '../../context/ChatContext';
import { formatAvatarUrl } from '../../utils/url';

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
  unread: number;
  avatarUrl?: string | null;
  avatarColor: string;
  isMuted: boolean;
  lastMessage?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ activeChatId, onSelectChat, width, currentUserId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { friends } = useContactContext();
  const { messages } = useChatContext();

  // Generate dynamic chat list from friends and messages
  const chats: ChatItem[] = useMemo(() => {
    const chatMap = new Map<number, ChatItem>();

    // Add friends as potential chats
    friends.forEach(friend => {
      chatMap.set(friend.user_id, {
        id: friend.user_id,
        name: friend.username,
        time: 'recent',
        unread: 0,
        avatarUrl: friend.avatar_url,
        avatarColor: 'bg-gray-300',
        isMuted: false,
        lastMessage: 'No messages yet'
      });
    });

    // Update with message data
    messages.forEach(message => {
      if (message.type === 'NEW_CHAT_MESSAGE') {
        const senderId = message.data.sender_id;
        const receiverId = message.data.conversation_id; // Use conversation_id as receiver for private chats

        // Find the chat partner (not current user)
        const chatPartnerId = senderId === parseInt(currentUserId) ? receiverId : senderId;

        if (chatMap.has(chatPartnerId)) {
          const chat = chatMap.get(chatPartnerId)!;
          chat.lastMessage = message.data.content || 'New message';
          chat.time = new Date(message.data.create_time).toLocaleDateString();
          // Increment unread count if message is not from current user
          if (senderId !== parseInt(currentUserId)) {
            chat.unread += 1;
          }
        }
      }
    });

    return Array.from(chatMap.values());
  }, [friends, messages]);

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
        <button className="w-7 h-7 bg-panel rounded flex items-center justify-center hover:bg-hover transition-colors shrink-0">
          <Plus className="h-4 w-4 text-secondary" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
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
    </div>
  );
};
