'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

export default function DarkModeToggle({ className = '' }) {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    // Pendant le chargement, afficher un placeholder
    return (
      <div className={`w-12 h-6 bg-gray-200 rounded-full ${className}`}></div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      aria-label={`Basculer vers le mode ${theme === 'light' ? 'sombre' : 'clair'}`}
    >
      {/* Track */}
      <div className={`w-12 h-6 rounded-full transition-colors duration-200 ${
        theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
      }`}>
        {/* Thumb */}
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 flex items-center justify-center ${
          theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
        }`}>
          {theme === 'dark' ? (
            <FaMoon className="text-blue-600 text-xs" />
          ) : (
            <FaSun className="text-yellow-500 text-xs" />
          )}
        </div>
      </div>
    </button>
  );
}
