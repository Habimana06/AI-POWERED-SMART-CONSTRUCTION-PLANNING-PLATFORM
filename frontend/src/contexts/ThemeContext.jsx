import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'buildplan-dashboard-theme';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  });

  const setTheme = (next) => {
    const value = next === 'dark' ? 'dark' : 'light';
    setThemeState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.classList.toggle('dashboard-theme-dark', theme === 'dark');
    document.documentElement.classList.toggle('dashboard-theme-light', theme !== 'dark');
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useDashboardTheme() {
  return useContext(ThemeContext);
}
