import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { LanguageSelector } from './ui/LanguageSelector';

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
  const { t } = useTranslation();
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
        setError(err instanceof Error ? err.message : t('auth.googleFailed'));
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
  }, [googleClientId, login, t]);

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
        setError(t('auth.usernameShort'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('auth.passwordsMismatch'));
        return;
      }
      if (password.length < 6) {
        setError(t('auth.passwordShort'));
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
      setError(err instanceof Error ? err.message : t('auth.authenticationFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Aurora Ambient Mesh Background */}
      <div className="absolute inset-0 bg-aurora-mesh opacity-80" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex justify-end"><LanguageSelector /></div>
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 ring-4 ring-white/80 transition-transform hover:scale-105 duration-300">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">xray-proxy</h1>
            <Badge variant="violet" size="sm" dot={true}>VLESS-Reality</Badge>
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {mode === 'login'
              ? t('auth.loginDescription')
              : t('auth.registerDescription')}
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-3xl border border-white/80 shadow-xl shadow-slate-200/50 p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 opacity-90" />

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100/90 backdrop-blur-sm rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('auth.signIn')}
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('auth.createAccount')}
            </button>
          </div>

          <div className="border-b border-slate-100/80 pb-2">
            <h2 className="text-sm font-bold text-slate-900">
              {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'login'
                ? t('auth.loginHint')
                : t('auth.registerHint')}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('auth.username')}
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.usernamePlaceholder')}
              leftIcon={<UserIcon className="w-4 h-4 text-slate-400" />}
            />

            {mode === 'register' && (
              <Input
                label={t('auth.emailOptional')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
              />
            )}

            <Input
              label={t('auth.password')}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            />

            {mode === 'register' && (
              <div className="space-y-1">
                <Input
                  label={t('auth.confirmPassword')}
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
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
                        <span>{t('auth.passwordsMatch')}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{t('auth.passwordsMismatch')}</span>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="md"
              className="w-full mt-3 font-semibold shadow-md shadow-indigo-500/20"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {mode === 'login' ? t('auth.submitLogin') : t('auth.submitRegister')}
            </Button>
          </form>

          {/* Conditional Google Sign In Button */}
          {googleClientId && (
            <div className="space-y-3 pt-2">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200/80 w-full" />
                <span className="bg-white/90 backdrop-blur-xs px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider relative">
                  {t('auth.orContinue')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs hover:border-slate-300"
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
                <span>{t('auth.signInGoogle')}</span>
              </button>
            </div>
          )}

          {/* Dev Hint for Administrator */}
          {mode === 'login' && (
            <div className="pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                {t('auth.defaultCredentials')}: <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-semibold">admin</code> / <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-semibold">admin123</code>
              </p>
            </div>
          )}

          {mode === 'register' && (
            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('auth.instantProvisioning')}</span>
              </p>
            </div>
          )}
        </div>

        {/* Security Footer Note */}
        <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>{t('auth.securityNote')}</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
