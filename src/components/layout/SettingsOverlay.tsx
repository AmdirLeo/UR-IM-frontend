import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface SettingsOverlayProps {
  onClose: () => void;
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ onClose }) => {
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'purple' | 'dark'>('default');

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setSelectedTheme('dark');
    } else if (document.documentElement.classList.contains('theme-purple')) {
      setSelectedTheme('purple');
    } else {
      setSelectedTheme('default');
    }
  }, []);

  const applyTheme = (theme: 'default' | 'purple' | 'dark') => {
    document.documentElement.classList.remove('dark', 'theme-purple');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'purple') {
      document.documentElement.classList.add('theme-purple');
    }
    localStorage.setItem('theme', theme);
    setSelectedTheme(theme);
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
              <h3 className="text-sm font-medium text-secondary mb-4">Theme</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => applyTheme('default')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${selectedTheme === 'default'
                    ? 'bg-brand text-white'
                    : 'bg-gray-100 text-secondary hover:bg-gray-200'
                    }`}
                >
                  默认主题
                </button>
                <button
                  type="button"
                  onClick={() => applyTheme('purple')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${selectedTheme === 'purple'
                    ? 'bg-[#7B1FA2] text-white'
                    : 'bg-gray-100 text-secondary hover:bg-gray-200'
                    }`}
                >
                  清华紫主题
                </button>
                <button
                  type="button"
                  onClick={() => applyTheme('dark')}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${selectedTheme === 'dark'
                    ? 'bg-slate-800 text-white'
                    : 'bg-gray-100 text-secondary hover:bg-gray-200'
                    }`}
                >
                  深色模式
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
