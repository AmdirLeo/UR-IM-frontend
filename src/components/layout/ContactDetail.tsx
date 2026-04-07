import React, { useState, useEffect } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { getFriendList, FriendInfo, removeFriend } from '../../api/friend';
import styles from './ContactDetail.module.css';

interface ContactDetailProps {
  contactId: number | null;
  contactName: string | undefined;
  avatarColor: string | undefined;
  onSendMessage: (contactId: number) => void;
}

export const ContactDetail: React.FC<ContactDetailProps> = ({
  contactId,
  contactName,
  avatarColor,
  onSendMessage
}) => {
  const [friendDetails, setFriendDetails] = useState<FriendInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
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
        <div className={`w-24 h-24 rounded-lg overflow-hidden flex items-center justify-center mb-6 shadow-md ${avatarColor || 'bg-gray-400'}`}>
           <span className="text-4xl text-white font-bold opacity-90">
             {contactName.charAt(0)}
           </span>
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
           <div className="mb-8 flex flex-col items-center">
             <p className="text-xs text-secondary">Added: {new Date(friendDetails.created_at).toLocaleDateString()}</p>
             {friendDetails.tags && friendDetails.tags.length > 0 && (
                <div className={styles.tagContainer}>
                  {friendDetails.tags.map(tag => (
                     <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
             )}
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
    </div>
  );
};
