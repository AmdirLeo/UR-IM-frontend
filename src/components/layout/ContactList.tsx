import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users as UsersIcon, Plus } from 'lucide-react';
import { AddFriendModal } from './AddFriendModal';
import styles from './ContactList.module.css';
import { FriendInfo, getFriendList } from '../../api/friend';

interface ContactListProps {
  activeContactId: number | null;
  onSelectContact: (id: number) => void;
  width: number;
}

export const dummyGroups = [
  { id: 201, name: '前端开发交流群', avatarColor: 'bg-indigo-500' },
  { id: 202, name: '项目讨论组', avatarColor: 'bg-teal-500' },
  { id: 203, name: '周末篮球俱乐部', avatarColor: 'bg-orange-500' },
];

export const dummyFriends = [
  { id: 101, name: '张三', avatarColor: 'bg-blue-400' },
  { id: 102, name: '李四', avatarColor: 'bg-green-500' },
  { id: 103, name: '王五', avatarColor: 'bg-yellow-500' },
  { id: 104, name: '赵六', avatarColor: 'bg-red-400' },
  { id: 105, name: '孙七', avatarColor: 'bg-purple-400' },
];

export const ContactList: React.FC<ContactListProps> = ({ activeContactId, onSelectContact, width }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const response = await getFriendList();
      if (response.code === 200) {
        setFriends(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const handleModalClose = () => {
    setIsAddFriendModalOpen(false);
    fetchFriends(); // Refresh friends list just in case
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
      className={styles.container}
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
            placeholder="搜索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsAddFriendModalOpen(true)}
          className={styles.addBtn}
          title="Add Friend"
        >
          <Plus className="h-4 w-4 text-secondary" />
        </button>
      </div>

      {/* Fixed Requests Section */}
      <div className={styles.requestsSection}>
         <div className={styles.requestItem}>
            <div className={styles.friendRequestIconWrapper}>
              <UserPlus className={styles.requestIcon} />
            </div>
            <span className="text-base text-secondary">Friend Requests (好友申请)</span>
         </div>
         <div className={styles.requestItem}>
            <div className={styles.groupRequestIconWrapper}>
              <UsersIcon className={styles.requestIcon} />
            </div>
            <span className="text-base text-secondary">Group Requests (群聊申请)</span>
         </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tab} ${
            activeTab === 'friends' ? styles.tabActive : styles.tabInactive
          }`}
          onClick={() => setActiveTab('friends')}
        >
          Friends
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === 'groups' ? styles.tabActive : styles.tabInactive
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

        {loading && activeTab === 'friends' ? (
          <div className="p-4 text-center text-sm text-secondary">Loading...</div>
        ) : (
          currentList.map((contact) => {
            const isGroup = activeTab === 'groups';
            const groupContact = contact as typeof dummyGroups[0];
            const friendContact = contact as FriendInfo;
            const id = isGroup ? groupContact.id : friendContact.user_id;
            const name = isGroup ? groupContact.name : friendContact.username;
            const avatarColor = isGroup ? groupContact.avatarColor : 'bg-blue-400';

            return (
              <div
                key={id}
                onClick={() => onSelectContact(id)}
                className={`${styles.contactItem} ${activeContactId === id ? styles.contactItemActive : ''}`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded overflow-hidden flex-shrink-0 mr-3 ${avatarColor}`}>
                  <div className="w-full h-full flex items-center justify-center text-sm text-white font-bold opacity-90">
                    {name.charAt(0)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex items-center">
                    <span className={`${styles.contactName} ${activeContactId === id ? styles.contactNameActive : ''}`}>
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
    </div>
  );
};
