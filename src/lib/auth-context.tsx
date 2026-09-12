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
  signInWithGoogle: (redirectToPath?: string) => Promise<{ error?: string }>;
  signInWithApple: (redirectToPath?: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
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

    if (data.user && data.user.confirmed_at) {
      return { message: "Account created! Welcome to the arcade." };
    }

    if (data.user && !data.user.confirmed_at) {
      return {
        message: `Account created! We sent a 6-digit code to ${email}.`,
      };
    }

    return { message: "Account created! Check your email for your verification code." };
  };

  const signInWithGoogle = async (redirectToPath?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Send the user back to where they started (e.g. /auth?returnTo=/wishlist)
        // so the intended destination survives the Google round-trip.
        redirectTo: redirectToPath
          ? `${window.location.origin}${redirectToPath}`
          : window.location.origin,
      },
    });

    if (error) {
      return { error: error.message };
    }
    return {};
  };

  const signInWithApple = async (redirectToPath?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        // Same pattern as Google: the intended destination survives the OAuth round-trip.
        redirectTo: redirectToPath
          ? `${window.location.origin}${redirectToPath}`
          : window.location.origin,
      },
    });

    if (error) {
      return { error: error.message };
    }
    return {};
  };

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("expired")) {
        return { error: "This code has expired. Request a new one below." };
      }
      if (msg.includes("already confirmed")) {
        return { error: "Email already verified — just sign in." };
      }
      if (msg.includes("invalid") || msg.includes("not found")) {
        return { error: "Invalid code. Double-check the 6 digits and try again." };
      }
      return { error: error.message };
    }
    return {};
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
    return { message: "New code sent! Check your inbox." };
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signInWithGoogle, signInWithApple, verifyOtp, signOut, resendConfirmation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
