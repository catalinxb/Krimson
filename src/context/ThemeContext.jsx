import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Try to read from cookie
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'app_theme') {
        return decodeURIComponent(value) || 'dark';
      }
    }
    return 'dark';
  });

  const saveTheme = (newTheme) => {
    // Save to cookie (365 days)
    const date = new Date();
    date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = `app_theme=${encodeURIComponent(newTheme)}; expires=${date.toUTCString()}; path=/`;
    
    // Update state
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, saveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
