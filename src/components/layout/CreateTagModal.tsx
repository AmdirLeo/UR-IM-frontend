import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useContactContext } from '../../context/ContactContext';
import { createFriendTag, addFriendToTag } from '../../api/friend';
import { FriendAvatar } from '../common/FriendAvatar';
import styles from './CreateTagModal.module.css';

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tagName: string, selectedFriendIds: number[]) => void;
}

export const CreateTagModal: React.FC<CreateTagModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { friends } = useContactContext();
  const [tagName, setTagName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTagName('');
      setSelectedFriendIds([]);
      setSearchTerm('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFriendSelection = (id: number) => {
    setSelectedFriendIds(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!tagName.trim()) {
      setError('Tag name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create the tag
      const createResponse = await createFriendTag(tagName.trim());
      if (createResponse.code !== 200) {
         throw new Error(createResponse.msg || 'Failed to create tag');
      }

      // 2. Assign friends to the tag, if any are selected
      if (selectedFriendIds.length > 0) {
        const addResponse = await addFriendToTag(tagName.trim(), selectedFriendIds);
        if (addResponse.code !== 200) {
           throw new Error(addResponse.msg || 'Failed to assign friends to tag');
        }
      }

      onSuccess(tagName.trim(), selectedFriendIds);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during tag creation');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create New Tag</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Tag Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Enter tag name..."
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              maxLength={20}
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <div className="flex justify-between items-end mb-2">
              <label className={styles.label} style={{ marginBottom: 0 }}>
                Select Friends ({selectedFriendIds.length} selected)
              </label>
            </div>

            <div className="relative mb-2">
               <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                 <Search className="h-3.5 w-3.5 text-gray-400" />
               </div>
               <input
                 type="text"
                 className={`${styles.input} pl-8 py-1.5 text-sm`}
                 placeholder="Search friends..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>

            <div className={styles.friendList}>
              {friends.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No friends available.
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No friends match your search.
                </div>
              ) : (
                filteredFriends.map(friend => (
                  <label key={friend.user_id} className={styles.friendItem}>
                    <input
                      type="checkbox"
                      checked={selectedFriendIds.includes(friend.user_id)}
                      onChange={() => toggleFriendSelection(friend.user_id)}
                    />
                    <div className="w-8 h-8 mr-3">
                      <FriendAvatar
                        userId={friend.user_id}
                        avatarUrl={friend.avatar_url}
                        name={friend.username}
                        fallbackColorClass="bg-blue-400"
                      />
                    </div>
                    <span className="text-sm text-gray-700 flex-1 truncate">
                      {friend.username}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={styles.submitButton}
            disabled={submitting || !tagName.trim()}
          >
            {submitting ? 'Creating...' : selectedFriendIds.length === 0 ? 'Create Tag' : 'Create & Assign'}
          </button>
        </div>
      </div>
    </div>
  );
};
