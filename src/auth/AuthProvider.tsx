import * as SecureStore from "expo-secure-store";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  EmployeeUser,
  login as loginApi,
  logout as logoutApi,
} from "../api/auth";

const ACCESS_TOKEN_KEY = "hrms_access_token";
const USER_KEY = "hrms_user";

type AuthContextValue = {
  user: EmployeeUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<EmployeeUser>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<EmployeeUser | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);

      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to restore session:", error);

      await clearStoredSession();
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(username: string, password: string) {
    const response = await loginApi(username, password);

    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.accessToken),

      SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user)),
    ]);

    setAccessToken(response.accessToken);
    setUser(response.user);

    return response.user;
  }

  async function clearStoredSession() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  }

  async function signOut() {
    try {
      await logoutApi(accessToken);
    } catch (error) {
      console.warn("Server logout failed; clearing local session.", error);
    } finally {
      await clearStoredSession();

      setAccessToken(null);
      setUser(null);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      isAuthenticated: Boolean(accessToken && user),
      signIn,
      signOut,
    }),
    [user, accessToken, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
