'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { safeLocalStorage } from '../lib/localStorage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = safeLocalStorage.getItem('theme');
    // IMPORTANT : Ne PAS appliquer automatiquement le thème système
    // Le mode sombre doit être activé manuellement par l'utilisateur
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Par défaut, toujours utiliser 'light'
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    safeLocalStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext; 