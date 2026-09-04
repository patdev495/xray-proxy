import React, { useState } from 'react';
import { ShieldCheck, Lock, User as UserIcon, ArrowRight, AlertCircle } from 'lucide-react';
import { loginUser, fetchCurrentUser } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('adminpassword');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const tokenData = await loginUser(username, password);
      const userData = await fetchCurrentUser(tokenData.access_token);
      login(tokenData.access_token, userData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Check credentials.');
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
            <Badge variant="slate" size="sm">Control Plane</Badge>
          </div>
          <p className="text-xs text-slate-500">Sign in to orchestrate VLESS-Reality proxy nodes</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Administrator Sign In</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter your secure credentials to continue</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              leftIcon={<UserIcon className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Control Plane
            </Button>
          </form>

          {/* Default credentials hint */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Default dev credentials: <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">admin</code> / <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">adminpassword</code>
            </p>
          </div>
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
