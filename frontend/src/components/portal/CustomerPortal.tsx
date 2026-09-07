import React from 'react';
import {
  ShieldCheck,
  LogOut,
  User as UserIcon,
  KeyRound,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export const CustomerPortal: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-slate-900 text-base">xray-proxy</span>
              <Badge variant="indigo" size="sm">Customer Portal</Badge>
            </div>
            <p className="text-[11px] text-slate-400">VLESS-Reality High Speed 4G Proxy</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
            <UserIcon className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium font-mono">{user?.username}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-500" />}
            className="text-xs"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Account Active
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.username}
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Manage your high-speed VLESS-Reality subscriptions, renew traffic quotas, and configure client connections for 4G zero-rating bypass.
            </p>
          </div>
        </div>

        {/* Profile and Service Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Account Info */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-800">Account Details</h2>
              </div>
              <Badge variant="slate" size="sm">{user?.role}</Badge>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Username:</span>
                <span className="font-mono font-medium text-slate-800">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Email:</span>
                <span className="font-medium text-slate-800">{user?.email || 'Not configured'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Auth Method:</span>
                <span className="capitalize font-medium text-slate-800">
                  {user?.oauth_provider ? `${user.oauth_provider} OAuth` : 'Password'}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 2: Subscription Status */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-slate-800">Active Service</h2>
              </div>
              <Badge variant="amber" size="sm">Self-Service</Badge>
            </div>
            <div className="space-y-2 text-xs text-slate-500">
              <p>In-place subscription renewal and node load balancing are ready for automated provisioning.</p>
              <p className="text-[11px] text-slate-400">Choose from available plans to activate your dedicated connection link.</p>
            </div>
          </Card>

          {/* Card 3: Security Status */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-800">Security &amp; Tokens</h2>
              </div>
              <Badge variant="emerald" size="sm" dot>Secure</Badge>
            </div>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">Encrypted JWT Session</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Your subscription tokens and reality keys are uniquely isolated per node to ensure privacy.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CustomerPortal;
