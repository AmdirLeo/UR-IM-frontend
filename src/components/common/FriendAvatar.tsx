import React, { useState, useEffect } from 'react';
import { getAvatar } from '../../utils/avatarDB';

interface FriendAvatarProps {
  userId: number;
  avatarUrl: string | null;
  name: string;
  className?: string;
  fallbackColorClass?: string;
}

export const FriendAvatar: React.FC<FriendAvatarProps> = ({
  userId,
  avatarUrl,
  name,
  className = "w-10 h-10",
  fallbackColorClass = "bg-blue-400"
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAvatar = async () => {
      // 1. Try to load from IndexedDB first
      const cachedBase64 = await getAvatar(userId);
      if (cachedBase64 && isMounted) {
        setImgSrc(cachedBase64);
        return;
      }

      // 2. If not in DB, use the remote URL (it will be cached later by ContactContext forceRefresh)
      if (avatarUrl && isMounted) {
         setImgSrc(avatarUrl);
      }
    };

    loadAvatar();

    return () => {
      isMounted = false;
    };
  }, [userId, avatarUrl]);

  if (imgSrc) {
    return (
      <div className={`${className} rounded overflow-hidden flex-shrink-0`}>
        <img src={imgSrc} alt={`${name}'s avatar`} className="w-full h-full object-cover" />
      </div>
    );
  }

  // Fallback to initial letter
  return (
    <div className={`${className} rounded overflow-hidden flex-shrink-0 ${fallbackColorClass}`}>
      <div className="w-full h-full flex items-center justify-center text-sm text-white font-bold opacity-90">
        {name ? name.charAt(0).toUpperCase() : '?'}
      </div>
    </div>
  );
};
