import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { loginUser, registerUser, loginWithGoogle, fetchCurrentUser } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
          renderButton: (
            element: HTMLElement,
            options: { theme?: string; size?: string; width?: number; text?: string }
          ) => void;
        };
      };
    };
  }
}

interface LoginPageProps {
  initialMode?: 'login' | 'register';
  onModeChange?: (mode: 'login' | 'register') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialMode = 'login',
  onModeChange,
}) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form states
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const googleClientId: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Sync mode with prop
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleTabChange = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  // Google OAuth GIS initialization when client_id exists
  useEffect(() => {
    if (!googleClientId) return;

    const handleGoogleCredentialResponse = async (response: { credential: string }) => {
      setError(null);
      setIsSubmitting(true);
      try {
        const tokenData = await loginWithGoogle(response.credential);
        const userData = await fetchCurrentUser(tokenData.access_token);
        login(tokenData.access_token, userData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Google authentication failed');
      } finally {
        setIsSubmitting(false);
      }
    };

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
      });
    } else {
      // Load Google script dynamically if missing
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.google?.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
      };
      document.head.appendChild(script);
    }
  }, [googleClientId, login]);

  const handleGoogleClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (username.trim().length < 3) {
        setError('Tên đăng nhập phải có ít nhất 3 ký tự');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không trùng khớp');
        return;
      }
      if (password.length < 6) {
        setError('Mật khẩu phải có ít nhất 6 ký tự');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const tokenData = await loginUser(username, password);
        const userData = await fetchCurrentUser(tokenData.access_token);
        login(tokenData.access_token, userData);
      } else {
        const tokenData = await registerUser(username, password, email);
        const userData = await fetchCurrentUser(tokenData.access_token);
        login(tokenData.access_token, userData);
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Xác thực thất bại';
      if (rawMsg.includes('Username already taken')) {
        setError('Tên đăng nhập đã tồn tại trên hệ thống. Vui lòng chọn tên khác.');
      } else if (rawMsg.includes('Email already registered')) {
        setError('Địa chỉ email này đã được đăng ký tài khoản.');
      } else if (rawMsg.includes('Incorrect username or password')) {
        setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
      } else {
        setError(rawMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6 relative">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-xs">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">xray-proxy</h1>
            <Badge variant="slate" size="sm">VLESS-Reality</Badge>
          </div>
          <p className="text-xs text-slate-500">
            {mode === 'login'
              ? 'Sign in to access your proxy dashboard or manage control plane'
              : 'Create a customer account to rent high-speed proxy bandwidth'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Create Account
            </button>
          </div>

          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {mode === 'login' ? 'Account Authentication' : 'New Customer Registration'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'login'
                ? 'Enter your credentials to continue'
                : 'Fill in your details to start using proxy services'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Input
              label="Username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. johndoe"
              leftIcon={<UserIcon className="w-4 h-4" />}
            />

            {mode === 'register' && (
              <Input
                label="Email (Optional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            )}

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            {mode === 'register' && (
              <div className="space-y-1">
                <Input
                  label="Confirm Password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                />
                {confirmPassword.length > 0 && (
                  <p
                    className={`text-[11px] flex items-center gap-1 font-medium ${
                      confirmPassword === password ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {confirmPassword === password ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mật khẩu trùng khớp</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Mật khẩu xác nhận không khớp</span>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Conditional Google Sign In Button (Graceful Fallback) */}
          {googleClientId && (
            <div className="space-y-3 pt-2">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider relative">
                  Or continue with
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 py-2 px-4 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          )}

          {/* Dev Hint for Administrator */}
          {mode === 'login' && (
            <div className="pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">admin</code> / <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono"></code>
              </p>
            </div>
          )}

          {mode === 'register' && (
            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant access upon registration</span>
              </p>
            </div>
          )}
        </div>

        {/* Security Footer Note */}
        <div className="text-center text-xs text-slate-400">
          Protected by JWT token encryption &amp; bcrypt password hashing
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

