"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { clientFetch } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2, LogIn, UserPlus, KeyRound, Mail } from "lucide-react";
import { API_URL } from "@/lib/api";
import { UserRole } from "@/lib/types";

// Default export wraps the inner component in Suspense (required by Next.js
// when useSearchParams() is used inside a "use client" page).
export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  );
}

function AuthPageInner() {
  const { currentUser, login, register, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token") || "";
  const initialTab = resetToken ? "reset" : "signin";

  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) router.replace("/dashboard");
  }, [currentUser, router]);

  // ── Sign In ───────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ───────────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Account created! Welcome!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Magic Link ────────────────────────────────────────────────────────────
  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    setLoading(true);
    try {
      await clientFetch("/auth/magic-link", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.success("Magic link sent! Check your email.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  // ── Password Reset Request ────────────────────────────────────────────────
  const handleResetRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    setLoading(true);
    try {
      await clientFetch("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.success("Reset link sent! Check your email.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Password Reset Confirm ────────────────────────────────────────────────
  const handleResetConfirm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const token = fd.get("token") as string;
    const password = fd.get("password") as string;
    setLoading(true);
    try {
      await clientFetch("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      toast.success("Password updated! You can now sign in.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Tabs defaultValue={initialTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
          <TabsTrigger value="reset">Reset</TabsTrigger>
        </TabsList>

        {/* ── Sign In Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="signin">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" /> Sign In
              </CardTitle>
              <CardDescription>
                Sign in to your account to access the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="flex gap-2">
                    <Input
                      id="signin-password"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowPwd((v) => !v)}
                    >
                      {showPwd ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>

              <Separator />

              <form onSubmit={handleMagicLink} className="space-y-2">
                <Input
                  id="magic-email"
                  name="email"
                  type="email"
                  placeholder="Magic link: enter your email"
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send magic link
                </Button>
              </form>

              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  (window.location.href = `${API_URL}/auth/google`)
                }
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sign Up Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Create Account
              </CardTitle>
              <CardDescription>
                New sign-ups are assigned the default MEMBER role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    name="name"
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="flex gap-2">
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      placeholder="Create a password"
                      required
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowPwd((v) => !v)}
                    >
                      {showPwd ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reset Password Tab ──────────────────────────────────────────── */}
        <TabsContent value="reset">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" /> Reset Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1: Request */}
              <form onSubmit={handleResetRequest} className="space-y-3">
                <Label>Request reset link</Label>
                <div className="flex gap-2">
                  <Input name="email" type="email" placeholder="your@email.com" />
                  <Button type="submit" variant="outline" disabled={loading}>
                    {loading && (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    )}
                    Send
                  </Button>
                </div>
              </form>

              <Separator />

              {/* Step 2: Confirm */}
              <form onSubmit={handleResetConfirm} className="space-y-3">
                <Label>Confirm new password</Label>
                <Input
                  name="token"
                  placeholder="Reset token from email"
                  defaultValue={resetToken}
                  required
                />
                <div className="flex gap-2">
                  <Input
                    name="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="New password"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPwd((v) => !v)}
                  >
                    {showPwd ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Demo credentials card ─────────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="pt-5 space-y-3">
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <p className="font-semibold">Demo Admin Account</p>
            <p className="text-sm text-muted-foreground">
              Email: <strong>admin@gmail.com</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Password: <strong>Whatever123$</strong>
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => {
                const emailInput = document.getElementById(
                  "signin-email"
                ) as HTMLInputElement | null;
                const pwdInput = document.getElementById(
                  "signin-password"
                ) as HTMLInputElement | null;
                if (emailInput) emailInput.value = "admin@gmail.com";
                if (pwdInput) pwdInput.value = "Whatever123$";
                document.querySelector<HTMLButtonElement>('[value="signin"]')?.click();
              }}
            >
              Use these credentials
            </Button>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Role Permissions</p>
            <div className="space-y-1 text-muted-foreground">
              <p>
                <span className="font-medium text-blue-600">MEMBER</span> — View
                blog posts only
              </p>
              <p>
                <span className="font-medium text-amber-600">MANAGER</span> —
                View all + create (draft only)
              </p>
              <p>
                <span className="font-medium text-red-600">ADMIN</span> — Full
                CRUD access + user management
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
