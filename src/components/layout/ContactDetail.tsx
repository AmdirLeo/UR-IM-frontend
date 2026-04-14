import React, { useState, useEffect } from 'react';
import { MessageSquare, Trash2, Tag, Edit3 } from 'lucide-react';
import { getFriendList, FriendInfo, removeFriend } from '../../api/friend';
import { FriendAvatar } from '../common/FriendAvatar';
import { ManageFriendTagModal } from './ManageFriendTagModal';
import { useContactContext } from '../../context/ContactContext';
import styles from './ContactDetail.module.css';

interface ContactDetailProps {
  contactId: number | null;
  contactName: string | undefined;
  avatarColor: string | undefined;
  avatarUrl?: string | null;
  onSendMessage: (contactId: number) => void;
}

export const ContactDetail: React.FC<ContactDetailProps> = ({
  contactId,
  contactName,
  avatarColor,
  avatarUrl,
  onSendMessage
}) => {
  const { forceRefresh } = useContactContext();
  const [friendDetails, setFriendDetails] = useState<FriendInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [isManageTagModalOpen, setIsManageTagModalOpen] = useState(false);

  const fetchDetails = async () => {
    if (contactId) {
      setLoading(true);
      try {
        const response = await getFriendList();
        if (response.code === 200) {
           const friend = response.data.find((f: FriendInfo) => f.user_id === contactId);
           if (friend) {
             setFriendDetails(friend);
           } else {
             setFriendDetails(null);
           }
        }
      } catch (error) {
        console.error("Failed to fetch friend details", error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [contactId]);

  const handleRemoveFriend = async () => {
    if (!contactId) return;
    if (window.confirm('Are you sure you want to remove this friend?')) {
      setRemoving(true);
      try {
        await removeFriend(contactId);
        // We'd ideally need a way to notify the parent to clear selection and refresh list
        alert('Friend removed successfully. Please refresh the page or click a different contact.');
      } catch (error) {
        console.error("Failed to remove friend", error);
        alert('Failed to remove friend');
      } finally {
        setRemoving(false);
      }
    }
  };

  if (!contactId || !contactName) {
    return (
      <div className={styles.contactDetail}>
        <div className="text-secondary">
          Select a contact to view their profile
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contactDetail}>
      <div className={styles.detailCard}>

        {/* Large Avatar */}
        <div className="w-24 h-24 rounded-lg overflow-hidden flex items-center justify-center mb-6 shadow-md mx-auto">
          {friendDetails ? (
            <FriendAvatar
              userId={contactId!}
              avatarUrl={avatarUrl || friendDetails.avatar_url}
              name={contactName}
              fallbackColorClass={avatarColor || 'bg-gray-400'}
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${avatarColor || 'bg-gray-400'}`}>
              <span className="text-4xl text-white font-bold opacity-90">
                {contactName.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <h2 className="text-2xl font-medium text-primary mb-2">
          {contactName}
        </h2>
        <p className="text-sm text-secondary mb-2">
          User ID: {contactId}
        </p>

        {loading ? (
           <p className="text-sm text-secondary mb-6">Loading details...</p>
        ) : friendDetails ? (
           <div className="mb-8 flex flex-col items-center w-full max-w-xs">
             <p className="text-xs text-secondary mb-3">Added: {new Date(friendDetails.be_friend_time).toLocaleDateString()}</p>

             {/* Tag Section */}
             <div className="w-full bg-gray-50 rounded-lg p-3 border border-gray-100 flex flex-col items-center">
               <div className="flex items-center justify-between w-full mb-2">
                 <div className="flex items-center text-sm font-medium text-gray-700">
                   <Tag className="w-4 h-4 mr-1 text-gray-400" />
                   Tags
                 </div>
                 <button
                   onClick={() => setIsManageTagModalOpen(true)}
                   className="text-xs flex items-center text-blue-500 hover:text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded"
                 >
                   <Edit3 className="w-3 h-3 mr-1" />
                   Edit
                 </button>
               </div>

               <div className="flex flex-wrap justify-center gap-2 mt-1 w-full">
                  {friendDetails.tags && friendDetails.tags.length > 0 ? (
                    friendDetails.tags.map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-white text-blue-700 text-xs rounded-md border border-blue-200 shadow-sm">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic py-1">No tags assigned</span>
                  )}
               </div>
             </div>
           </div>
        ) : (
           <div className="mb-8"></div>
        )}

        {/* Action Button */}
        <button
          onClick={() => onSendMessage(contactId)}
          className={styles.actionButton}
        >
          <MessageSquare className="w-5 h-5" />
          <span>Send Message</span>
        </button>

        {friendDetails && (
          <button
            onClick={handleRemoveFriend}
            disabled={removing}
            className={styles.removeButton}
          >
            <Trash2 className="w-4 h-4" />
            <span>{removing ? 'Removing...' : 'Remove Friend'}</span>
          </button>
        )}

      </div>

      {friendDetails && (
        <ManageFriendTagModal
          isOpen={isManageTagModalOpen}
          onClose={() => setIsManageTagModalOpen(false)}
          friendId={friendDetails.user_id}
          friendName={friendDetails.username}
          currentTags={friendDetails.tags || []}
          onSuccess={() => {
             fetchDetails(); // Refetch local details
             forceRefresh(); // Update global context
          }}
        />
      )}
    </div>
  );
};
