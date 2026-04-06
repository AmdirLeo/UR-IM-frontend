import React, { useState } from 'react';
import { Search, UserPlus, Users as UsersIcon, Plus } from 'lucide-react';
import { AddFriendModal } from './AddFriendModal';

interface ContactListProps {
  activeContactId: number | null;
  onSelectContact: (id: number) => void;
  width: number;
}

export const dummyFriends = [
  { id: 101, name: '张三', avatarColor: 'bg-blue-400' },
  { id: 102, name: '李四', avatarColor: 'bg-green-500' },
  { id: 103, name: '王五', avatarColor: 'bg-yellow-500' },
  { id: 104, name: '赵六', avatarColor: 'bg-red-400' },
  { id: 105, name: '孙七', avatarColor: 'bg-purple-400' },
];

export const dummyGroups = [
  { id: 201, name: '前端开发交流群', avatarColor: 'bg-indigo-500' },
  { id: 202, name: '项目讨论组', avatarColor: 'bg-teal-500' },
  { id: 203, name: '周末篮球俱乐部', avatarColor: 'bg-orange-500' },
];

export const ContactList: React.FC<ContactListProps> = ({ activeContactId, onSelectContact, width }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);

  const currentList = activeTab === 'friends' ? dummyFriends : dummyGroups;

  return (
    <div
      style={{ width: `${width}px`, minWidth: '200px' }}
      className="h-full bg-[#EFEFEF] dark:bg-[#1A1A1A] border-r border-gray-300 dark:border-black flex flex-col relative shrink-0"
    >
      {/* Search Header */}
      <div className="h-[60px] flex items-center px-4 shrink-0 border-b border-gray-300 dark:border-gray-800 space-x-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <input
            type="text"
            className="w-full bg-[#E2E2E2] dark:bg-[#2A2A2A] dark:text-gray-300 rounded text-sm pl-8 pr-2 py-1.5 focus:outline-none focus:bg-white dark:focus:bg-[#111111] focus:ring-1 focus:ring-gray-300 transition-colors"
            placeholder="搜索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsAddFriendModalOpen(true)}
          className="w-[30px] h-[30px] flex items-center justify-center bg-[#E2E2E2] hover:bg-[#D4D4D4] dark:bg-[#2A2A2A] dark:hover:bg-[#333333] rounded transition-colors flex-shrink-0 focus:outline-none"
          title="Add Friend"
        >
          <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Fixed Requests Section */}
      <div className="flex flex-col border-b border-gray-300 dark:border-gray-800 shrink-0">
         <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-[#DCDCDC] dark:hover:bg-[#242424] transition-colors">
            <div className="w-10 h-10 rounded bg-orange-400 flex items-center justify-center mr-3 text-white">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-[15px] text-gray-900 dark:text-gray-200">Friend Requests (好友申请)</span>
         </div>
         <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-[#DCDCDC] dark:hover:bg-[#242424] transition-colors">
            <div className="w-10 h-10 rounded bg-blue-500 flex items-center justify-center mr-3 text-white">
              <UsersIcon className="w-5 h-5" />
            </div>
            <span className="text-[15px] text-gray-900 dark:text-gray-200">Group Requests (群聊申请)</span>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-300 dark:border-gray-800 shrink-0">
        <button
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'friends'
              ? 'text-green-600 dark:text-green-500 border-b-2 border-green-600 dark:border-green-500'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('friends')}
        >
          Friends
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === 'groups'
              ? 'text-green-600 dark:text-green-500 border-b-2 border-green-600 dark:border-green-500'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('groups')}
        >
          Groups
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
        <div className="px-4 pb-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
          {activeTab === 'friends' ? 'My Friends' : 'My Groups'}
        </div>
        {currentList.map((contact) => (
          <div
            key={contact.id}
            onClick={() => onSelectContact(contact.id)}
            className={`flex items-center px-4 py-3 cursor-pointer ${
              activeContactId === contact.id
                ? 'bg-[#C6C6C6] dark:bg-[#2C2C2C]'
                : 'hover:bg-[#DCDCDC] dark:hover:bg-[#242424]'
            }`}
          >
            {/* Avatar */}
            <div className={`w-10 h-10 rounded overflow-hidden flex-shrink-0 mr-3 ${contact.avatarColor}`}>
              <div className="w-full h-full flex items-center justify-center text-sm text-white font-bold opacity-90">
                 {contact.name.charAt(0)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex items-center">
                <span className={`text-[15px] truncate font-normal ${
                  activeContactId === contact.id
                    ? 'text-black dark:text-white'
                    : 'text-gray-900 dark:text-gray-300'
                }`}>
                  {contact.name}
                </span>
            </div>
          </div>
        ))}
      </div>

      <AddFriendModal
        isOpen={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
      />
    </div>
  );
};
