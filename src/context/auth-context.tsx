import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ needsVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Turns backend errors into calm, human sentences. Raw errors never reach the screen. */
export function friendlyAuthError(error: unknown): string {
  const raw = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  if (!raw) return "Something went wrong. Please try again.";
  if (raw.includes("already registered") || raw.includes("already been registered") || raw.includes("user already"))
    return "An account with this email already exists. Try logging in instead.";
  if (raw.includes("invalid login") || raw.includes("invalid credentials"))
    return "That email and password don't match. Please check and try again.";
  if (raw.includes("email not confirmed")) return "Please confirm your email address first — check your inbox.";
  if (raw.includes("password") && (raw.includes("short") || raw.includes("at least") || raw.includes("weak")))
    return "Choose a stronger password — at least 8 characters with a letter and a number.";
  if (raw.includes("invalid email") || raw.includes("valid email")) return "Enter a valid email address.";
  if (raw.includes("rate limit") || raw.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  if (raw.includes("failed to fetch") || raw.includes("network") || raw.includes("timeout"))
    return "We couldn't reach Kindred. Check your connection and try again.";
  if (raw.includes("jwt") || raw.includes("session")) return "Your session expired. Please log in again.";
  return "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0)
          throw new Error("User already registered");
        return { needsVerification: !data.session };
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      requestPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
