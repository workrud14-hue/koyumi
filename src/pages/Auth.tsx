import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { CheckCircle, Eye, EyeOff, Mail } from "lucide-react";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/shop";
  const navigate = useNavigate();
  const { signIn, signUp, resendConfirmation, loading: authLoading } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin border-2 border-outline-variant border-t-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isSignUp) {
      const result = await signUp(email, password);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else if (result.message) {
        setSuccess(result.message);
        // Auto sign-in after successful signup
        setTimeout(async () => {
          const signInResult = await signIn(email, password);
          if (!signInResult.error) {
            navigate(returnTo, { replace: true });
          }
        }, 1500);
      }
    } else {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        navigate(returnTo, { replace: true });
      }
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const result = await resendConfirmation(resendEmail);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (result.message) {
      setSuccess(result.message);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mb-6 inline-block border border-outline-variant/30 px-3 py-1">
            <span className="font-mono text-[9px] tracking-[0.2em] text-outline">
              {showResend ? "RESEND CONFIRMATION" : isSignUp ? "NEW MEMBER" : "WELCOME BACK"}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-signal">
            {showResend ? "RESEND EMAIL" : isSignUp ? "JOIN THE ARCADE" : "SIGN IN"}
          </h1>
          <p className="mt-3 font-body text-sm text-shadow/70">
            {showResend
              ? "Enter your email to resend the confirmation link."
              : isSignUp
                ? "Create your account to access exclusive drops and pricing."
                : "Sign in to your KIYUMI account."}
          </p>
        </div>

        {/* Resend Confirmation Form */}
        {showResend ? (
          <form onSubmit={handleResend} className="mt-10 flex flex-col gap-6">
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
                EMAIL
              </label>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
                className="w-full border-b-2 border-outline-variant/40 bg-transparent py-3 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant/50 focus:border-primary"
                placeholder="your@email.com"
                autoFocus
              />
            </div>

            {error && (
              <div className="border border-error/20 bg-error/5 px-4 py-3">
                <p className="font-mono text-[11px] text-error">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 border border-primary/20 bg-primary/5 px-4 py-3">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                <p className="font-mono text-[11px] text-primary">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-gradient-to-r from-primary-container to-secondary-container py-4 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container transition-all hover:shadow-[0_0_20px_rgba(107,33,168,0.2)] disabled:opacity-50"
            >
              {loading ? "SENDING..." : "RESEND CONFIRMATION"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowResend(false);
                setError("");
                setSuccess("");
              }}
              className="text-center font-mono text-xs tracking-[0.1em] text-outline transition-colors hover:text-signal"
            >
              ← BACK TO SIGN IN
            </button>
          </form>
        ) : (
          /* Main Sign In / Sign Up Form */
          <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-b-2 border-outline-variant/40 bg-transparent py-3 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant/50 focus:border-primary"
                placeholder="your@email.com"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border-b-2 border-outline-variant/40 bg-transparent py-3 pr-10 font-body text-sm text-signal outline-none transition-colors placeholder:text-outline-variant/50 focus:border-primary"
                  placeholder={isSignUp ? "Min 6 characters" : "••••••••"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-outline/50 transition-colors hover:text-outline"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="border border-error/20 bg-error/5 px-4 py-3">
                <p className="font-mono text-[11px] text-error">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 border border-primary/20 bg-primary/5 px-4 py-3">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                <p className="font-mono text-[11px] text-primary">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-gradient-to-r from-primary-container to-secondary-container py-4 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container transition-all hover:shadow-[0_0_20px_rgba(107,33,168,0.2)] disabled:opacity-50"
            >
              {loading ? "..." : isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
            </button>

            {!isSignUp && (
              <button
                type="button"
                onClick={() => {
                  setResendEmail(email);
                  setShowResend(true);
                  setError("");
                  setSuccess("");
                }}
                className="text-center font-mono text-[10px] tracking-[0.1em] text-outline/60 transition-colors hover:text-primary"
              >
                <Mail size={12} className="mr-1 inline" />
                Didn't get confirmation email? Resend
              </button>
            )}
          </form>
        )}

        {!showResend && (
          <p className="mt-8 text-center font-body text-sm text-shadow/60">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setSuccess("");
              }}
              className="font-mono text-xs tracking-[0.1em] text-primary transition-colors hover:text-signal"
            >
              {isSignUp ? "SIGN IN" : "SIGN UP"}
            </button>
          </p>
        )}

        <p className="mt-6 text-center font-mono text-[10px] tracking-[0.1em] text-outline/50">
          Admin access: workrud14@gmail.com
        </p>
      </div>
    </div>
  );
}
