import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { CheckCircle, Eye, EyeOff, Mail } from "lucide-react";

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/shop";
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, signInWithApple, verifyOtp, resendConfirmation, loading: authLoading, user } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // Already signed in? Send them to their destination instead of showing the form.
  useEffect(() => {
    if (user && !authLoading) {
      navigate(returnTo, { replace: true });
    }
  }, [user, authLoading, navigate, returnTo]);

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
      } else if (result.message?.includes("6-digit code")) {
        // OTP flow: show the code entry view.
        setOtpEmail(email);
        setShowOtp(true);
        setSuccess("");
      } else if (result.message) {
        setSuccess(result.message);
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

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    // Carry the intended destination through the Google OAuth round-trip.
    const result = await signInWithGoogle(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // OAuth redirects, so no need to navigate here
  };

  const handleAppleSignIn = async () => {
    setError("");
    setLoading(true);
    const result = await signInWithApple(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // OAuth redirects, so no need to navigate here
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const result = await verifyOtp(otpEmail, otpCode.trim());
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      navigate(returnTo, { replace: true });
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
              {showOtp ? "VERIFY EMAIL" : showResend ? "RESEND CODE" : isSignUp ? "NEW MEMBER" : "WELCOME BACK"}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-signal">
            {showOtp ? "ENTER CODE" : showResend ? "RESEND EMAIL" : isSignUp ? "JOIN THE ARCADE" : "SIGN IN"}
          </h1>
          <p className="mt-3 font-body text-sm text-shadow/70">
            {showOtp
              ? `Enter the 6-digit code we sent to ${otpEmail}.`
              : showResend
                ? "Enter your email to get a new verification code."
                : isSignUp
                  ? "Create your account to access exclusive drops and pricing."
                  : "Sign in to your KIYUMI account."}
          </p>
        </div>

        {/* OTP Verification View */}
        {showOtp ? (
          <form onSubmit={handleVerifyOtp} className="mt-10 flex flex-col gap-6">
            <div>
              <label className="mb-2 block font-mono text-[10px] tracking-[0.15em] text-outline">
                6-DIGIT CODE
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                required
                className="w-full border-b-2 border-outline-variant/40 bg-transparent py-3 text-center font-display text-2xl tracking-[0.6em] text-signal outline-none transition-colors placeholder:text-outline-variant/30 focus:border-primary"
                placeholder="______"
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
              disabled={loading || otpCode.length < 6}
              className="mt-4 w-full bg-gradient-to-r from-primary-container to-secondary-container py-4 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container transition-all hover:shadow-[0_0_20px_rgba(107,33,168,0.2)] disabled:opacity-50"
            >
              {loading ? "VERIFYING..." : "VERIFY CODE"}
            </button>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={async () => {
                  const result = await resendConfirmation(otpEmail);
                  if (result.error) setError(result.error);
                  else if (result.message) setSuccess(result.message);
                }}
                className="font-mono text-[10px] tracking-[0.1em] text-outline/60 transition-colors hover:text-primary"
              >
                RESEND CODE
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOtp(false);
                  setOtpCode("");
                  setError("");
                  setSuccess("");
                }}
                className="font-mono text-[10px] tracking-[0.1em] text-outline/60 transition-colors hover:text-signal"
              >
                ← CHANGE EMAIL
              </button>
            </div>
          </form>
        ) : showResend ? (
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
              }}                  className="text-center font-mono text-xs tracking-[0.1em] text-outline transition-colors hover:text-signal"
            >
              ← BACK TO SIGN IN
            </button>
          </form>
        ) : (
          <>
            {/* Social Sign In Buttons */}
            <div className="mt-10 grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 border border-outline-variant/40 bg-white py-3.5 font-mono text-[10px] font-bold tracking-[0.08em] text-void transition-all hover:bg-gray-50 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50"
              >
                <GoogleIcon />
                GOOGLE
              </button>
              <button
                onClick={handleAppleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 border border-outline-variant/40 bg-black py-3.5 font-mono text-[10px] font-bold tracking-[0.08em] text-white transition-all hover:bg-[#111] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50"
              >
                <AppleIcon />
                APPLE
              </button>
            </div>

            {/* Divider */}
            <div className="mt-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-outline-variant/20" />
              <span className="font-mono text-[10px] tracking-[0.15em] text-outline/50">OR</span>
              <div className="h-px flex-1 bg-outline-variant/20" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
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
                className="mt-2 w-full bg-gradient-to-r from-primary-container to-secondary-container py-4 font-mono text-xs font-bold tracking-[0.15em] text-on-primary-container transition-all hover:shadow-[0_0_20px_rgba(107,33,168,0.2)] disabled:opacity-50"
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
                  Didn't get the code? Resend
                </button>
              )}
            </form>

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
          </>
        )}

        <p className="mt-6 text-center font-mono text-[10px] tracking-[0.1em] text-outline/50">
          Admin access: workrud14@gmail.com
        </p>
      </div>
    </div>
  );
}
