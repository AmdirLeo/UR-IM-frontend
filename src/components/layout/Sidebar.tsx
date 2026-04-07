import React, { useState, useRef, useEffect } from 'react';
import { User, MessageCircle, Users, Settings, LogOut } from 'lucide-react';

export type ViewMode = 'messages' | 'contacts' | 'profile';

interface SidebarProps {
  activeView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  onLogout,
  onOpenSettings
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const logoutRef = useRef<HTMLDivElement>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  // Sync avatar from local storage
  useEffect(() => {
    const updateAvatar = () => {
      const cachedAvatar = localStorage.getItem('userAvatar');
      setAvatarSrc(cachedAvatar);
    };

    updateAvatar();

    window.addEventListener('avatarUpdated', updateAvatar);
    return () => {
      window.removeEventListener('avatarUpdated', updateAvatar);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="w-[60px] min-w-[60px] h-full bg-[#2a2a2a] flex flex-col items-center py-4 justify-between border-r border-gray-800 shrink-0 z-10">
      {/* Top Icons */}
      <div className="flex flex-col items-center space-y-6">
        {/* Avatar */}
        <div
          className="w-10 h-10 bg-gray-300 rounded overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border-2 border-transparent hover:border-[#1AAD19]"
          onClick={() => onNavigate('profile')}
          title="Profile"
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="text-gray-600 w-8 h-8 mt-2" />
          )}
        </div>

        {/* Nav Icons */}
        <div
          className="relative cursor-pointer group flex flex-col items-center w-full"
          onClick={() => onNavigate('messages')}
          title="Messages"
        >
          <MessageCircle className={`w-6 h-6 transition-colors ${activeView === 'messages' ? 'text-[#1AAD19]' : 'text-gray-400 group-hover:text-gray-200'}`} />
          {/* Badge */}
          <div className="absolute -top-1 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#2a2a2a]">
            6
          </div>
        </div>

        <div
          className="cursor-pointer group flex flex-col items-center w-full"
          onClick={() => onNavigate('contacts')}
          title="Contacts"
        >
          <Users className={`w-6 h-6 transition-colors ${activeView === 'contacts' ? 'text-[#1AAD19]' : 'text-gray-400 group-hover:text-gray-200'}`} />
        </div>
      </div>

      {/* Bottom Icons */}
      <div className="flex flex-col items-center space-y-6 w-full">
        <div
            className="cursor-pointer group flex flex-col items-center w-full relative"
            title="Settings"
            onClick={onOpenSettings}
        >
            <Settings className="w-6 h-6 text-gray-400 group-hover:text-gray-200" />
        </div>

        <div
            className="relative flex flex-col items-center w-full"
            ref={logoutRef}
        >
          <div
            className="cursor-pointer group"
            onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
            title="Log Out"
          >
            <LogOut className="w-6 h-6 text-gray-400 hover:text-red-400" />
          </div>

          {/* Logout Confirmation Popover */}
          {showLogoutConfirm && (
            <div className="absolute bottom-0 left-12 ml-2 w-48 bg-[#333333] border border-gray-700 rounded-md shadow-lg p-3 z-50 animate-in fade-in zoom-in duration-200">
              <p className="text-gray-200 text-sm mb-3 text-center">Are you sure you want to log out?</p>
              <div className="flex justify-between gap-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-200 bg-[#444444] hover:bg-[#555555] rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onLogout}
                  className="flex-1 px-2 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
