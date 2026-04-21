import React, { useState, useEffect } from 'react';
import { X, Tag } from 'lucide-react';
import { useContactContext } from '../../context/ContactContext';
import { addFriendToTag, removeFriendFromTag } from '../../api/friend';
import styles from './ManageFriendTagModal.module.css';

interface ManageFriendTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendId: number;
  friendName: string;
  currentTags: string[];
  onSuccess: () => void;
}

export const ManageFriendTagModal: React.FC<ManageFriendTagModalProps> = ({
  isOpen,
  onClose,
  friendId,
  friendName,
  currentTags,
  onSuccess
}) => {
  const { tags } = useContactContext();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTags([...currentTags]);
      setError(null);
    }
  }, [isOpen, currentTags]);

  if (!isOpen) return null;

  const toggleTagSelection = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const tagsToAdd = selectedTags.filter(t => !currentTags.includes(t));
      const tagsToRemove = currentTags.filter(t => !selectedTags.includes(t));

      // Process additions
      for (const tag of tagsToAdd) {
         const res = await addFriendToTag(tag, [friendId]);
         if (res.code !== 200) throw new Error(res.msg || `Failed to add tag: ${tag}`);
      }

      // Process removals
      for (const tag of tagsToRemove) {
         const res = await removeFriendFromTag(tag, friendId);
         if (res.code !== 200) throw new Error(res.msg || `Failed to remove tag: ${tag}`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'An error occurred while updating tags');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const hasChanges =
    selectedTags.length !== currentTags.length ||
    !selectedTags.every(t => currentTags.includes(t)) ||
    !currentTags.every(t => selectedTags.includes(t));

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Manage Tags</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.subtitle}>
            Select tags for <span className="font-semibold text-primary">{friendName}</span>
          </p>

          {error && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
              {error}
            </div>
          )}

          {tags.length === 0 ? (
            <div className={styles.emptyState}>
              No tags available in the system. Create tags first from the Tag Management panel.
            </div>
          ) : (
            <div className={styles.tagList}>
              {tags.map(tag => (
                <label key={tag} className={styles.tagItem}>
                  <div className={styles.tagLabel}>
                    <Tag className="w-4 h-4 mr-2 text-blue-500" />
                    {tag}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => toggleTagSelection(tag)}
                  />
                </label>
              ))}
            </div>
          )}
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
            disabled={submitting || !hasChanges}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
