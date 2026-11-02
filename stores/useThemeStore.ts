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
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  const themeColor = isDark ? '#000000' : '#F8F5F1';

  // Update or create meta[name="theme-color"]
  const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
  if (themeColorMetas.length > 0) {
    themeColorMetas.forEach((meta) => {
      meta.removeAttribute('media');
      meta.setAttribute('content', themeColor);
    });
  } else {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', themeColor);
    document.head.appendChild(meta);
  }

  // Update apple-mobile-web-app-status-bar-style for iOS status bar
  let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleStatusBar) {
    appleStatusBar = document.createElement('meta');
    appleStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
    document.head.appendChild(appleStatusBar);
  }
  appleStatusBar.setAttribute('content', isDark ? 'black-translucent' : 'default');
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
