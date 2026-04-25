import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface RemoveFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteHistory: boolean) => Promise<void>;
  friendName?: string;
}

export const RemoveFriendModal: React.FC<RemoveFriendModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  friendName,
}) => {
  const [deleteHistory, setDeleteHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(deleteHistory);
      onClose();
    } catch (error) {
      console.error("Failed to remove friend", error);
      // Optional: Handle error message
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-panel w-full max-w-sm rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="h-12 flex items-center justify-between px-4 border-b border-primary">
          <h3 className="text-base font-medium text-primary">Remove Friend</h3>
          <button onClick={onClose} disabled={loading} className="p-1 hover:bg-hover rounded-full transition-colors">
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-primary text-sm mb-4">
            确定要删除该好友{friendName ? ` "${friendName}"` : ''}吗？
          </p>

          <label className="flex items-center space-x-2 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={deleteHistory}
              onChange={(e) => setDeleteHistory(e.target.checked)}
              className="w-4 h-4 text-green-500 rounded border-gray-300 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
            />
            <span className="text-sm text-secondary">同时删除与该联系人的聊天记录</span>
          </label>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-secondary bg-secondary hover:bg-hover rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors flex items-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
