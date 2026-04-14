import React, { useState, useMemo } from 'react';
import { Tag, Plus, Trash2, X } from 'lucide-react';
import { useContactContext } from '../../context/ContactContext';
import { deleteFriendTag, removeFriendFromTag } from '../../api/friend';
import { CreateTagModal } from './CreateTagModal';
import { FriendAvatar } from '../common/FriendAvatar';
import styles from './TagManagementPanel.module.css';

export const TagManagementPanel: React.FC = () => {
  const { friends, forceRefresh } = useContactContext();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [processingTag, setProcessingTag] = useState<string | null>(null);

  // Derive unique tags from the friends list
  const groupedTags = useMemo(() => {
    const map = new Map<string, typeof friends>();

    friends.forEach(friend => {
      if (friend.tags && friend.tags.length > 0) {
        friend.tags.forEach(tag => {
          if (!map.has(tag)) {
            map.set(tag, []);
          }
          map.get(tag)!.push(friend);
        });
      }
    });

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [friends]);

  const handleDeleteTag = async (tagName: string) => {
    if (window.confirm(`Are you sure you want to delete the tag "${tagName}"? This will not remove the friends, only the tag.`)) {
      setProcessingTag(tagName);
      try {
        const response = await deleteFriendTag(tagName);
        if (response.code === 200) {
          await forceRefresh();
        } else {
          alert(response.msg || 'Failed to delete tag');
        }
      } catch (err) {
        console.error('Failed to delete tag', err);
        alert('An error occurred while deleting the tag');
      } finally {
        setProcessingTag(null);
      }
    }
  };

  const handleRemoveFriendFromTag = async (tagName: string, friendId: number, friendName: string) => {
    if (window.confirm(`Remove ${friendName} from tag "${tagName}"?`)) {
      try {
        const response = await removeFriendFromTag(tagName, friendId);
        if (response.code === 200) {
          await forceRefresh();
        } else {
          alert(response.msg || 'Failed to remove friend from tag');
        }
      } catch (err) {
        console.error('Failed to remove friend from tag', err);
        alert('An error occurred while removing the friend from the tag');
      }
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className="flex items-center">
          <Tag className="w-5 h-5 text-blue-500 mr-2" />
          <h2 className={styles.title}>Tag Management</h2>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className={styles.createButton}
        >
          <Plus className="w-4 h-4 mr-1" />
          Create New Tag
        </button>
      </div>

      <div className={styles.content}>
        {groupedTags.length === 0 ? (
          <div className={styles.emptyState}>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Tag className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 mb-4">No tags found. Create one to organize your friends!</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-blue-500 hover:text-blue-600 font-medium text-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Tag
            </button>
          </div>
        ) : (
          <div className={styles.tagList}>
            {groupedTags.map(([tagName, taggedFriends]) => (
              <div key={tagName} className={styles.tagCard}>
                <div className={styles.tagCardHeader}>
                  <div className={styles.tagName}>
                    <Tag className="w-4 h-4 mr-2 text-gray-400" />
                    {tagName}
                    <span className={styles.tagBadge}>
                      {taggedFriends.length} {taggedFriends.length === 1 ? 'friend' : 'friends'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteTag(tagName)}
                    disabled={processingTag === tagName}
                    className={styles.deleteButton}
                    title="Delete entire tag"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className={styles.tagMembers}>
                  {taggedFriends.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No friends in this tag.</p>
                  ) : (
                    <div className={styles.memberGrid}>
                      {taggedFriends.map(friend => (
                        <div key={friend.user_id} className={`${styles.memberCard} group`}>
                          <div className="w-8 h-8 flex-shrink-0">
                            <FriendAvatar
                              userId={friend.user_id}
                              avatarUrl={friend.avatar_url}
                              name={friend.username}
                              fallbackColorClass="bg-blue-400"
                            />
                          </div>
                          <span className={styles.memberName}>{friend.username}</span>
                          <button
                            onClick={() => handleRemoveFriendFromTag(tagName, friend.user_id, friend.username)}
                            className={styles.removeMemberButton}
                            title={`Remove from ${tagName}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateTagModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => forceRefresh()}
      />
    </div>
  );
};
