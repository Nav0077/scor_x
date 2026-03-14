'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const THEMES = ['dark', 'blue', 'green', 'purple'];
const SCOREBOARD_THEMES = ['modern', 'classic', 'minimal', 'ipl'];

const ThemeContext = createContext({});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [scoreboardTheme, setScoreboardTheme] = useState('modern');
  const [primaryColor, setPrimaryColor] = useState('#22c55e');
  const [accentColor, setAccentColor] = useState('#f59e0b');

  useEffect(() => {
    const stored = localStorage.getItem('scorx-theme');
    if (stored) {
      const parsed = JSON.parse(stored);
      setTheme(parsed.theme || 'dark');
      setScoreboardTheme(parsed.scoreboardTheme || 'modern');
      setPrimaryColor(parsed.primaryColor || '#22c55e');
      setAccentColor(parsed.accentColor || '#f59e0b');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('scorx-theme', JSON.stringify({
      theme, scoreboardTheme, primaryColor, accentColor,
    }));
    // Apply CSS variables
    document.documentElement.style.setProperty('--accent-green', primaryColor);
    document.documentElement.style.setProperty('--accent-amber', accentColor);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme, scoreboardTheme, primaryColor, accentColor]);

  return (
    <ThemeContext.Provider value={{
      theme, setTheme,
      scoreboardTheme, setScoreboardTheme,
      primaryColor, setPrimaryColor,
      accentColor, setAccentColor,
      THEMES,
      SCOREBOARD_THEMES,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
