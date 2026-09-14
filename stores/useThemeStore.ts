import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

const STORAGE_KEY = 'reharth-theme';

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
};

const resolveIsDark = (theme: ThemeMode): boolean => {
  if (typeof window === 'undefined') return false;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const applyThemeToDOM = (isDark: boolean) => {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  isDark: resolveIsDark(getInitialTheme()),

  setTheme: (newTheme: ThemeMode) => {
    const isDark = resolveIsDark(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyThemeToDOM(isDark);
    set({ theme: newTheme, isDark });
  },

  toggleTheme: () => {
    const currentIsDark = get().isDark;
    const nextTheme: ThemeMode = currentIsDark ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },

  initTheme: () => {
    const theme = get().theme;
    const isDark = resolveIsDark(theme);
    applyThemeToDOM(isDark);
    set({ isDark });

    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (get().theme === 'system') {
          const systemIsDark = mediaQuery.matches;
          applyThemeToDOM(systemIsDark);
          set({ isDark: systemIsDark });
        }
      };
      mediaQuery.removeEventListener?.('change', handleChange);
      mediaQuery.addEventListener?.('change', handleChange);
    }
  },
}));
