import React, { useEffect, useState } from 'react';
import { X, Moon, Sun } from 'lucide-react';

interface SettingsOverlayProps {
  onClose: () => void;
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ onClose }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if dark mode is active
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-primary rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary">
          <h2 className="text-lg font-medium text-secondary">Settings</h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-secondary dark:hover:text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-6">

            {/* Appearance Section */}
            <div>
              <h3 className="text-sm font-medium text-secondary mb-4">Appearance</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary">Dark Mode</span>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDarkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-primary transition-transform ${
                      isDarkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                  {/* Icons inside the toggle for visual flair */}
                  <span className={`absolute left-1 ${isDarkMode ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                      <Moon className="w-3 h-3 text-white" />
                  </span>
                  <span className={`absolute right-1 ${isDarkMode ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                      <Sun className="w-3 h-3 text-secondary" />
                  </span>
                </button>
              </div>
            </div>

            <hr className="border-primary" />

            {/* Other Mock Settings */}
            <div>
              <h3 className="text-sm font-medium text-secondary mb-4">Notifications</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary">Sound</span>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-primary translate-x-6" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
