import React from 'react';
import { User, MessageCircle, Users, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, onOpenSettings }) => {
  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      if (window.confirm('Please confirm again that you want to log out.')) {
        onLogout();
      }
    }
  };

  return (
    <div className="w-[60px] min-w-[60px] h-full bg-[#2a2a2a] flex flex-col items-center py-4 justify-between border-r border-gray-800 shrink-0 z-10">
      {/* Top Icons */}
      <div className="flex flex-col items-center space-y-6">
        {/* Avatar */}
        <div className="w-10 h-10 bg-gray-300 rounded overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
          <User className="text-gray-600 w-8 h-8 mt-2" />
        </div>

        {/* Nav Icons */}
        <div className="relative cursor-pointer group flex flex-col items-center w-full">
          <MessageCircle className="w-6 h-6 text-[#1AAD19] group-hover:text-green-400" />
          {/* Badge */}
          <div className="absolute -top-1 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#2a2a2a]">
            6
          </div>
        </div>

        <div className="cursor-pointer group flex flex-col items-center w-full">
          <Users className="w-6 h-6 text-gray-400 group-hover:text-gray-200" />
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
             {/* Small red dot on settings */}
             <div className="absolute top-1 right-4 w-2 h-2 bg-red-500 rounded-full"></div>
        </div>

        <div
            className="cursor-pointer group flex flex-col items-center w-full"
            onClick={handleLogoutClick}
            title="Log Out"
        >
          <LogOut className="w-6 h-6 text-gray-400 hover:text-red-400" />
        </div>
      </div>
    </div>
  );
};
