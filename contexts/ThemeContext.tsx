import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { AppThemeColors, getColors, ThemeMode } from "@/lib/theme";

const STORAGE_KEY = "app_theme_mode";

function parseMode(v: string | null): ThemeMode | null {
  return v === "light" || v === "dark" ? v : null;
}

async function readStoredMode(): Promise<ThemeMode | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
        return parseMode(
          (globalThis as unknown as { localStorage: Storage }).localStorage.getItem(STORAGE_KEY)
        );
      }
      return null;
    }
    return parseMode(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStoredMode(m: ThemeMode): void {
  try {
    if (Platform.OS === "web") {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
        (globalThis as unknown as { localStorage: Storage }).localStorage.setItem(STORAGE_KEY, m);
      }
      return;
    }
    void AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  } catch {
    // ignore
  }
}

type ThemeContextValue = {
  mode: ThemeMode;
  colors: AppThemeColors;
  setMode: (m: ThemeMode) => void;
  toggleMode: () => void;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await readStoredMode();
      if (!cancelled && stored) setModeState(stored);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    writeStoredMode(m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === "light" ? "dark" : "light";
      writeStoredMode(next);
      return next;
    });
  }, []);

  const colors = useMemo(() => getColors(mode), [mode]);

  const value = useMemo(
    () => ({ mode, colors, setMode, toggleMode, ready }),
    [mode, colors, setMode, toggleMode, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
