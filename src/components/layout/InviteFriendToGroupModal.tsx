import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useContactContext } from '../../context/ContactContext';
import { inviteToGroup, GroupMember } from '../../api/group';
import { FriendAvatar } from '../common/FriendAvatar';
import styles from './AddFriendsToTagModal.module.css';

interface InviteFriendToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  existingMembers?: GroupMember[];
}

export const InviteFriendToGroupModal: React.FC<InviteFriendToGroupModalProps> = ({ isOpen, onClose, conversationId, existingMembers = [] }) => {
  const { friends } = useContactContext();
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedFriendIds([]);
      setSearchTerm('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const existingMemberIds = new Set(existingMembers.map(m => m.user_id));

  const filteredFriends = friends.filter(friend =>
    !existingMemberIds.has(friend.user_id) && friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFriendSelection = (id: number) => {
    setSelectedFriendIds(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedFriendIds.length === 0) {
      setError('Please select at least one friend to invite.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    let hasError = false;
    let inviteCount = 0;

    for (const userId of selectedFriendIds) {
      try {
        const response = await inviteToGroup({ conversation_id: conversationId, user_id: userId });
        if (response.code !== 200) {
           throw new Error(response.msg || 'Failed to invite user');
        }
        inviteCount++;
      } catch (err: unknown) {
        hasError = true;
        const errorObj = err as { response?: { data?: { msg?: string } }, message?: string };
        const msg = errorObj?.response?.data?.msg || errorObj.message || 'An error occurred';
        setError(`Error inviting user ${userId}: ${msg}`);
        break; // Stop on first error
      }
    }

    setSubmitting(false);

    if (!hasError) {
      setSuccess(`Successfully sent invitations to ${inviteCount} friends.`);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Invite Friends to Group</h2>
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
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 text-sm rounded-md">
              {success}
            </div>
          )}

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
                  You have no friends to invite.
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
            disabled={submitting || selectedFriendIds.length === 0}
          >
            {submitting ? 'Inviting...' : 'Invite'}
          </button>
        </div>
      </div>
    </div>
  );
};
