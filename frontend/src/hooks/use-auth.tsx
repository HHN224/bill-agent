import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getAuthToken, setAuthToken, setOnUnauthorized } from "@/api/client";

interface AuthContextValue {
  /** 内存中的后台凭证；刷新页面后为 null，需要重新登录。 */
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAuthToken());

  const login = useCallback((nextToken: string) => {
    setAuthToken(nextToken);
    setToken(nextToken);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
  }, []);

  useEffect(() => {
    // API client 收到 401 时清空内存凭证，路由守卫会送回登录页。
    setOnUnauthorized(logout);
    return () => setOnUnauthorized(null);
  }, [logout]);

  const value = useMemo(
    () => ({ token, login, logout }),
    [token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
