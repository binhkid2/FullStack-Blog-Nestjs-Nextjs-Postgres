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

  /** Decode the JWT access token stored in the browser cookie (non-httpOnly portion).
   *  Since accessToken is httpOnly, we detect auth state by calling a lightweight
   *  authenticated endpoint. If it returns 401 → not logged in. */
  const refresh = useCallback(async () => {
    try {
      // Call GET /blog-posts?pageSize=1 — requires auth. If cookie is valid, returns data.
      // We only care about the response headers/status here, not the body.
      const data = await clientFetch<{
        posts?: unknown[];
        total?: number;
        // The JWT payload fields we need come from the cookie;
        // we parse them via a lightweight /auth/me-style endpoint.
        // Since we don't have /auth/me, we use the blog-posts endpoint response
        // and get user info from a separate call to /users (ADMIN only) or just
        // decode what we need from the refresh token.
        // Simpler: call GET /blog-posts and use the response to confirm auth,
        // then store minimal info from localStorage if previously set.
      }>(
        "/blog-posts?pageSize=1"
      );
      // Auth succeeded — try to restore user from sessionStorage
      const cached = sessionStorage.getItem("currentUser");
      if (cached) {
        setCurrentUser(JSON.parse(cached));
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
