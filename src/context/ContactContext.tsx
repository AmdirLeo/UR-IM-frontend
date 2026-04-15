import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { getFriendList, FriendInfo } from '../api/friend';
import { saveAvatar } from '../utils/avatarDB';
import { UserContext } from './UserContext';

const fileToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface ContactContextType {
  friends: FriendInfo[];
  loading: boolean;
  forceRefresh: () => Promise<void>;
}

export const ContactContext = createContext<ContactContextType | undefined>(undefined);

interface ContactProviderProps {
  children: ReactNode;
}

export const ContactProvider: React.FC<ContactProviderProps> = ({ children }) => {
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const userContext = useContext(UserContext);
  const isAuthenticated = userContext?.isAuthenticated;

  const loadFriendsFromCache = useCallback(() => {
    const cachedMeta = localStorage.getItem('friend_list_meta');
    if (cachedMeta) {
      try {
        const parsed = JSON.parse(cachedMeta);
        setFriends(parsed);
      } catch (e) {
        console.error('Failed to parse cached friend list meta', e);
      }
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getFriendList();
      if (response.code === 200 && Array.isArray(response.data)) {
        const freshFriends: FriendInfo[] = response.data;

        // Cache meta data in localStorage
        localStorage.setItem('friend_list_meta', JSON.stringify(freshFriends));

        // Asynchronously update avatars in IndexedDB
        freshFriends.forEach(async (friend) => {
           if (friend.avatar_url) {
               try {
                 const cachedUrlKey = `cached_friend_avatar_url_${friend.user_id}`;
                 const cachedUrl = localStorage.getItem(cachedUrlKey);

                 // If the URL has changed, or we don't have it cached
                 if (cachedUrl !== friend.avatar_url) {
                    const fetchResponse = await fetch(friend.avatar_url);
                    if (fetchResponse.ok) {
                        const blob = await fetchResponse.blob();
                        const base64Data = await fileToBase64(blob);
                        await saveAvatar(friend.user_id, base64Data);
                        localStorage.setItem(cachedUrlKey, friend.avatar_url);
                    }
                 }
               } catch (err) {
                   console.error(`Failed to cache avatar for user ${friend.user_id}:`, err);
               }
           }
        });

        setFriends(freshFriends);
      }
    } catch (error) {
      console.error('Failed to force refresh friends:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
        // Load from cache first for fast rendering
        loadFriendsFromCache();
        // Then force refresh to get latest data from API
        forceRefresh();
    } else {
        // Clear friends when logged out
        setFriends([]);
        localStorage.removeItem('friend_list_meta');
        // Note: we don't clear avatars from IndexedDB on logout, it acts as a permanent cache
    }
  }, [isAuthenticated, loadFriendsFromCache, forceRefresh]);

  useEffect(() => {
    const handleRemoteFriendAccept = () => {
      if (isAuthenticated) {
        forceRefresh();
      }
    };

    window.addEventListener('remote_friend_accept', handleRemoteFriendAccept);

    return () => {
      window.removeEventListener('remote_friend_accept', handleRemoteFriendAccept);
    };
  }, [isAuthenticated, forceRefresh]);

  return (
    <ContactContext.Provider value={{ friends, loading, forceRefresh }}>
      {children}
    </ContactContext.Provider>
  );
};

export const useContactContext = () => {
  const context = useContext(ContactContext);
  if (context === undefined) {
    throw new Error('useContactContext must be used within a ContactProvider');
  }
  return context;
};
