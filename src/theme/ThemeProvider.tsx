import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "app_theme";

export type ThemeMode = "light" | "dark";

type ThemeColors = {
  background: string;
  surface: string;
  surfaceSecondary: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  border: string;

  primary: string;
  primaryLight: string;

  success: string;
  successBackground: string;

  warning: string;
  warningBackground: string;

  danger: string;
  dangerBackground: string;

  white: string;
  black: string;
};

const LIGHT_COLORS: ThemeColors = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceSecondary: "#F3F4F6",

  textPrimary: "#171717",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",

  border: "#E5E7EB",

  primary: "#5B4BDB",
  primaryLight: "#EEECFF",

  success: "#16A34A",
  successBackground: "#EAF8F0",

  warning: "#D97706",
  warningBackground: "#FFF4E5",

  danger: "#EF4444",
  dangerBackground: "#FEE2E2",

  white: "#FFFFFF",
  black: "#000000",
};

const DARK_COLORS: ThemeColors = {
  background: "#0F1115",
  surface: "#171A21",
  surfaceSecondary: "#20242C",

  textPrimary: "#F9FAFB",
  textSecondary: "#A7AFBF",
  textMuted: "#737C8D",

  border: "#2B313D",

  primary: "#7465F0",
  primaryLight: "#272342",

  success: "#22C55E",
  successBackground: "#15311F",

  warning: "#F59E0B",
  warningBackground: "#33270F",

  danger: "#F87171",
  dangerBackground: "#35181A",

  white: "#FFFFFF",
  black: "#000000",
};

type ThemeContextType = {
  theme: ThemeMode;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => void;
  isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);

      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme);
        Appearance.setColorScheme(savedTheme);
      } else {
        setThemeState("light");
        Appearance.setColorScheme("light");
      }
    } catch (error) {
      console.warn("Unable to load saved theme:", error);
      setThemeState("light");
      Appearance.setColorScheme("light");
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);

    // Apply theme to native UI as well.
    Appearance.setColorScheme(nextTheme);

    try {
      await AsyncStorage.setItem(THEME_KEY, nextTheme);
    } catch (error) {
      console.warn("Unable to save theme:", error);
    }
  };

  const colors = useMemo(
    () => (theme === "light" ? LIGHT_COLORS : DARK_COLORS),
    [theme],
  );

  const value = useMemo(
    () => ({
      theme,
      colors,
      setTheme,
      isLoading,
    }),
    [theme, colors, isLoading],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
