'use client';

import { createContext, useContext, useEffect, useState } from 'react';

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
    // Vérifier le thème stocké dans localStorage
    // IMPORTANT : Ne PAS appliquer automatiquement le thème système
    // Le mode sombre doit être activé manuellement par l'utilisateur
    const storedTheme = localStorage.getItem('theme');
    
    // Utiliser uniquement le thème stocké, ou 'light' par défaut
    setTheme(storedTheme || 'light');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // Sauvegarder le thème dans localStorage
      localStorage.setItem('theme', theme);
      
      // Appliquer le thème au document
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    mounted
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
