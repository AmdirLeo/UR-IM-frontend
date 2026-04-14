import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getUserInfo } from '../api/user';
import { logoutUser } from '../api';
import { formatAvatarUrl } from '../utils/url';

export interface UserInfo {
  id: number;
  username: string;
  avatar_url: string | null;
  email: string;
}

const fileToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface UserContextType {
  userInfo: UserInfo | null;
  setUserInfo: React.Dispatch<React.SetStateAction<UserInfo | null>>;
  fetchUserInfo: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  token: string | null;
  handleLoginSuccess: (newToken: string) => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const fetchUserInfo = useCallback(async () => {
    try {
      const data = await getUserInfo();
      // data should be { code: number, id: number, username: string, avatar_url: string | null, email: string }
      if (data) {
        const rawAvatarUrl = formatAvatarUrl(data.avatar_url);
        let finalAvatarUrl = rawAvatarUrl;

        // Caching logic
        if (rawAvatarUrl) {
          const cachedUrl = localStorage.getItem('cached_avatar_url');
          const cachedData = localStorage.getItem('cached_avatar_data');

          if (cachedUrl === rawAvatarUrl && cachedData) {
            // Use cached base64 image
            finalAvatarUrl = cachedData;
          } else {
            // Fetch from network and cache
            try {
              const response = await fetch(rawAvatarUrl);
              if (response.ok) {
                const blob = await response.blob();
                const base64data = await fileToBase64(blob);
                localStorage.setItem('cached_avatar_url', rawAvatarUrl);
                localStorage.setItem('cached_avatar_data', base64data);
                finalAvatarUrl = base64data;
              }
            } catch (err) {
              console.error('Failed to fetch and cache avatar:', err);
            }
          }
        }

        const info: UserInfo = {
          id: data.id,
          username: data.username,
          avatar_url: finalAvatarUrl,
          email: data.email,
        };
        setUserInfo(info);

        // Also save formatted URL info for future reloads
        const cacheInfo = { ...info, avatar_url: rawAvatarUrl };
        localStorage.setItem('userInfo', JSON.stringify(cacheInfo));
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  }, []);

  // Initialization
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUserInfo = localStorage.getItem('userInfo');

    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      if (savedUserInfo) {
        try {
          const parsedInfo = JSON.parse(savedUserInfo);

          // Use cached base64 image if available
          if (parsedInfo.avatar_url) {
            const cachedUrl = localStorage.getItem('cached_avatar_url');
            const cachedData = localStorage.getItem('cached_avatar_data');
            if (cachedUrl === parsedInfo.avatar_url && cachedData) {
              parsedInfo.avatar_url = cachedData;
            }
          }
          setUserInfo(parsedInfo);
        } catch (e) {
          console.error('Failed to parse cached userInfo:', e);
        }
      }
      // Re-fetch info to ensure it is up-to-date
      fetchUserInfo();
    }
  }, [fetchUserInfo]);

  const handleLoginSuccess = async (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    setIsAuthenticated(true);
    await fetchUserInfo();
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('cached_avatar_url');
      localStorage.removeItem('cached_avatar_data');
      localStorage.removeItem('cached_friend_requests');
      setToken(null);
      setUserInfo(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <UserContext.Provider value={{ userInfo, setUserInfo, fetchUserInfo, logout, isAuthenticated, token, handleLoginSuccess }}>
      {children}
    </UserContext.Provider>
  );
};
