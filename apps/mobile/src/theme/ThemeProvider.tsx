import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { shadows } from "./shadows";
import { radii } from "./radii";
import { sizes } from "./sizes";
import {
  getColorsForResolvedMode,
  resolveThemeMode,
  type ResolvedThemeMode,
  type ThemeMode,
} from "./colorSchemes";

const THEME_MODE_KEY = "@dreamfinora:theme_mode";

export type AppTheme = {
  colors: ReturnType<typeof getColorsForResolvedMode>;
  spacing: typeof spacing;
  typography: typeof typography;
  shadows: typeof shadows;
  radii: typeof radii;
  sizes: typeof sizes;
};

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  theme: AppTheme;
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const stored = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (cancelled) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedMode = resolveThemeMode(mode, systemScheme);
  const colors = useMemo(
    () => getColorsForResolvedMode(resolvedMode),
    [resolvedMode],
  );

  const theme: AppTheme = useMemo(
    () => ({
      colors,
      spacing,
      typography,
      shadows,
      radii,
      sizes,
    }),
    [colors],
  );

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    await AsyncStorage.setItem(THEME_MODE_KEY, next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      setMode,
      theme,
      isReady,
    }),
    [mode, resolvedMode, setMode, theme, isReady],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
