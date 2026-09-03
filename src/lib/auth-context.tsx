import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

const ADMIN_EMAIL = "workrud14@gmail.com";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error?: string; message?: string }>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Provide more helpful error messages
      if (error.message.includes("Email not confirmed")) {
        return {
          error: "Email not confirmed. Please check your inbox for a confirmation link, or click 'Resend Confirmation' below.",
        };
      }
      if (error.message.includes("Invalid login")) {
        return { error: "Invalid email or password. Please try again." };
      }
      if (error.message.includes("Email address")) {
        return { error: "Please enter a valid email address." };
      }
      return { error: error.message };
    }

    return {};
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        return { error: "This email is already registered. Try signing in instead." };
      }
      if (error.message.includes("valid email")) {
        return { error: "Please enter a valid email address." };
      }
      if (error.message.includes("at least 6")) {
        return { error: "Password must be at least 6 characters." };
      }
      return { error: error.message };
    }

    // Check if user was auto-confirmed (auto-confirm enabled in Supabase)
    if (data.user && data.user.confirmed_at) {
      // Auto-confirmed, can sign in immediately
      return { message: "Account created! Signing you in..." };
    }

    // Email confirmation required
    if (data.user && !data.user.confirmed_at) {
      return {
        message: "Account created! Check your email for a confirmation link. If you don't see it, try signing in — auto-confirm may be enabled.",
      };
    }

    return { message: "Account created! Check your email for confirmation." };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      return { error: error.message };
    }
    return { message: "Confirmation email sent! Check your inbox." };
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signOut, resendConfirmation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
