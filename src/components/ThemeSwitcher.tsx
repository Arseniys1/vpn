import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center justify-between p-4 bg-tg-secondary rounded-lg">
      <span className="text-tg-text font-medium">Тема приложения</span>
      <div className="flex bg-tg-bg rounded-lg p-1 border border-tg-separator">
        <button
          onClick={() => setTheme('system')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            theme === 'system' 
              ? 'bg-tg-blue text-white shadow' 
              : 'text-tg-hint hover:text-tg-text'
          }`}
        >
          Системная
        </button>
        <button
          onClick={() => setTheme('light')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            theme === 'light' 
              ? 'bg-tg-blue text-white shadow' 
              : 'text-tg-hint hover:text-tg-text'
          }`}
        >
          Светлая
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            theme === 'dark' 
              ? 'bg-tg-blue text-white shadow' 
              : 'text-tg-hint hover:text-tg-text'
          }`}
        >
          Темная
        </button>
      </div>
    </div>
  );
};

export default ThemeSwitcher;