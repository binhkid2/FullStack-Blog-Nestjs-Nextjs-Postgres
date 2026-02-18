/**
 * API helpers for server components (forwards cookies) and client components (credentials: include).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const STATE_CHANGING_METHODS = ["POST", "PATCH", "PUT", "DELETE"];

// ─── Read csrfToken cookie in the browser ─────────────────────────────────────
function getClientCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

// ─── Server-side fetch (use in Server Components / Route Handlers) ─────────────

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  // Dynamic import so this module can also be imported in client components
  // The `cookies` call only runs on the server side
  let cookieHeader = "";
  let csrfToken = "";
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    cookieHeader = store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    // Forward the CSRF token from the cookie store for mutating server-side calls
    csrfToken = store.get("csrfToken")?.value ?? "";
  } catch {
    // We're on the client — skip cookie forwarding
  }

  const method = (init?.method ?? "GET").toUpperCase();
  const needsCsrf = STATE_CHANGING_METHODS.includes(method);

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(needsCsrf && csrfToken ? { "x-csrf-token": csrfToken } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.error?.message || body?.message || msg;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }

  // Some endpoints return 204 No Content
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ─── Client-side fetch (use in Client Components) ─────────────────────────────

export async function clientFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const needsCsrf = STATE_CHANGING_METHODS.includes(method);
  const csrfToken = needsCsrf ? getClientCsrfToken() : "";

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(needsCsrf && csrfToken ? { "x-csrf-token": csrfToken } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.error?.message || body?.message || msg;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export { API_URL };
