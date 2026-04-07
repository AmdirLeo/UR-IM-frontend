import React, { useState } from 'react';
import { Search, Plus, BellOff } from 'lucide-react';

interface ChatListProps {
  activeChatId: number;
  onSelectChat: (id: number) => void;
  width: number;
}

export const dummyChats = [
  { id: 1, name: 'xxx', time: 'yesterday', unread: 0, avatarColor: 'bg-gray-300', isMuted: false },
];

export const ChatList: React.FC<ChatListProps> = ({ activeChatId, onSelectChat, width }) => {
  const [searchTerm, setSearchTerm] = useState('');

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
            placeholder="搜索"
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
        {dummyChats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`flex items-center px-4 py-3 cursor-pointer ${
              activeChatId === chat.id
                ? 'bg-active'
                : 'hover:bg-hover dark:hover:bg-hover'
            }`}
          >
            {/* Avatar */}
            <div className={`w-10 h-10 rounded overflow-hidden flex-shrink-0 mr-3 ${chat.avatarColor}`}>
              {/* Dummy Image logic (using color blocks for simplicity) */}
              <div className="w-full h-full flex items-center justify-center text-xs text-white font-bold opacity-75">
                 {chat.name.charAt(0)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-0.5">
                <span className={`text-base truncate font-normal ${
                  activeChatId === chat.id
                    ? 'text-primary'
                    : 'text-secondary'
                }`}>
                  {chat.name}
                </span>
                <span className="text-xs text-tertiary shrink-0 ml-2">{chat.time}</span>
              </div>
              <div className="text-xs text-secondary truncate flex items-center justify-between">
                <span className="truncate w-full pr-2">[Mock Message Content Here]</span>
                {chat.isMuted && <BellOff className="h-3 w-3 text-tertiary shrink-0" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
