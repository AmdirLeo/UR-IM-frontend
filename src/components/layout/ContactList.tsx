import React, { useState } from 'react';
import { Search, UserPlus, Users as UsersIcon, Plus, Tag } from 'lucide-react';
import { AddFriendModal } from './AddFriendModal';
import { RequestsModal } from './RequestsModal';
import styles from './ContactList.module.css';
import { FriendInfo } from '../../api/friend';
import { useChatContext } from '../../context/ChatContext';
import { useContactContext } from '../../context/ContactContext';
import { FriendAvatar } from '../common/FriendAvatar';

interface ContactListProps {
  activeContactId: number | null;
  activeView: 'contact' | 'tags';
  onSelectContact: (id: number) => void;
  onSelectTagsView: () => void;
  width: number;
}

export const dummyGroups = [
  { id: 201, name: '前端开发交流群', avatarColor: 'bg-indigo-500' },
  { id: 202, name: '项目讨论组', avatarColor: 'bg-teal-500' },
  { id: 203, name: '周末篮球俱乐部', avatarColor: 'bg-orange-500' },
];

export const ContactList: React.FC<ContactListProps> = ({ activeContactId, activeView, onSelectContact, onSelectTagsView, width }) => {
  const { friendRequests, groupRequests } = useChatContext();
  const { friends, loading, forceRefresh } = useContactContext();
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);

  const handleModalClose = () => {
    setIsAddFriendModalOpen(false);
    forceRefresh(); // Refresh friends list just in case
  };

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = dummyGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentList = activeTab === 'friends' ? filteredFriends : filteredGroups;

  return (
    <div
      style={{ width: `${width}px`, minWidth: '200px' }}
      className={styles.contactList}
    >
      {/* Search Header */}
      <div className={styles.searchHeader}>
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-secondary" />
          </div>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsAddFriendModalOpen(true)}
          className={styles.addButton}
          title="Add Friend"
        >
          <Plus className="h-4 w-4 text-secondary" />
        </button>
      </div>

      {/* Fixed Requests Section */}
      <div className={styles.requestsSection}>
         <div
           className={styles.requestItem}
           onClick={() => setIsRequestsModalOpen(true)}
         >
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 mr-3 bg-orange-400 flex items-center justify-center relative">
              <UserPlus className="h-5 w-5 text-white" />
              {(friendRequests.length > 0 || groupRequests.length > 0) && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-primary" />
              )}
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-base text-secondary">System Requests</span>
              {(friendRequests.length > 0 || groupRequests.length > 0) && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  {friendRequests.length + groupRequests.length}
                </span>
              )}
            </div>
         </div>
         <div
           className={`${styles.requestItem} ${activeView === 'tags' ? styles.requestItemActive : ''}`}
           onClick={onSelectTagsView}
         >
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 mr-3 bg-blue-600 flex items-center justify-center">
              <Tag className="h-5 w-5 text-white" />
            </div>
            <span className="text-base text-secondary">Tags</span>
         </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${
            activeTab === 'friends' ? styles.tabActive : styles.tabButton
          }`}
          onClick={() => setActiveTab('friends')}
        >
          Friends
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === 'groups' ? styles.tabActive : styles.tabButton
          }`}
          onClick={() => setActiveTab('groups')}
        >
          Groups
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
        <div className="px-4 pb-2 text-xs text-secondary font-medium">
          {activeTab === 'friends' ? 'My Friends' : 'My Groups'}
        </div>

        {loading && activeTab === 'friends' && friends.length === 0 ? (
          <div className="p-4 text-center text-sm text-secondary">Loading...</div>
        ) : (
          currentList.map((contact) => {
            const isGroup = activeTab === 'groups';
            const groupContact = contact as typeof dummyGroups[0];
            const friendContact = contact as FriendInfo;
            const id = isGroup ? groupContact.id : friendContact.user_id;
            const name = isGroup ? groupContact.name : friendContact.username;
            const avatarUrl = isGroup ? null : friendContact.avatar_url;
            const avatarColor = isGroup ? groupContact.avatarColor : 'bg-blue-400';

            return (
              <div
                key={id}
                onClick={() => onSelectContact(id)}
                className={`${styles.contactItem} ${activeContactId === id && activeView === 'contact' ? styles.contactItemActive : ''}`}
              >
                {/* Avatar */}
                {isGroup ? (
                   <div className={`w-10 h-10 rounded overflow-hidden flex-shrink-0 mr-3 ${avatarColor}`}>
                     <div className="w-full h-full flex items-center justify-center text-sm text-white font-bold opacity-90">
                       {name.charAt(0)}
                     </div>
                   </div>
                ) : (
                   <div className="mr-3">
                     <FriendAvatar userId={id} avatarUrl={avatarUrl} name={name} fallbackColorClass={avatarColor} />
                   </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 flex items-center">
                    <span className={`${styles.contactName} ${activeContactId === id && activeView === 'contact' ? styles.contactNameActive : ''}`}>
                      {name}
                    </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddFriendModal
        isOpen={isAddFriendModalOpen}
        onClose={handleModalClose}
      />

      <RequestsModal
        isOpen={isRequestsModalOpen}
        onClose={() => setIsRequestsModalOpen(false)}
        onSuccess={() => forceRefresh()}
      />
    </div>
  );
};
