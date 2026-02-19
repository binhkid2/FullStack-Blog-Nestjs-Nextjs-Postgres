"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { clientFetch, ApiError } from "./api";
import { CurrentUser, UserRole } from "./types";

interface AuthContextValue {
  currentUser: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  /** Calls GET /auth/me with the httpOnly cookie to restore the current user.
   *  Returns the JWT payload if valid, clears auth state if 401. */
  const refresh = useCallback(async () => {
    try {
      const data = await clientFetch<{ success: boolean; user: CurrentUser }>(
        "/auth/me"
      );
      if (data.user) {
        const user: CurrentUser = {
          sub: data.user.sub,
          email: data.user.email,
          role: (data.user.role as string).toUpperCase() as UserRole,
          name: data.user.name,
        };
        setCurrentUser(user);
        sessionStorage.setItem("currentUser", JSON.stringify(user));
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setCurrentUser(null);
        sessionStorage.removeItem("currentUser");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await clientFetch<{
      success: boolean;
      user?: CurrentUser;
      accessToken?: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // The NestJS login returns { success, accessToken, user } for JSON clients
    if (data.user) {
      // Normalize role to uppercase enum
      const user: CurrentUser = {
        sub: data.user.sub || (data.user as unknown as { id?: string }).id || "",
        email: data.user.email,
        role: (data.user.role as string).toUpperCase() as UserRole,
        name: data.user.name,
      };
      setCurrentUser(user);
      sessionStorage.setItem("currentUser", JSON.stringify(user));
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await clientFetch<{
        success: boolean;
        user?: CurrentUser;
      }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      if (data.user) {
        const user: CurrentUser = {
          sub: data.user.sub || (data.user as unknown as { id?: string }).id || "",
          email: data.user.email,
          role: (data.user.role as string).toUpperCase() as UserRole,
          name: data.user.name,
        };
        setCurrentUser(user);
        sessionStorage.setItem("currentUser", JSON.stringify(user));
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await clientFetch("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setCurrentUser(null);
    sessionStorage.removeItem("currentUser");
  }, []);

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
