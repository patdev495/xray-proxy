import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Check,
  Clock,
  Copy,
  HardDrive,
  QrCode,
  RefreshCw,
  Server,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getSubUrl } from '../subscriptions/subscriptionUtils';
import { SubscriptionQrModal } from '../subscriptions/SubscriptionQrModal';
import { SwitchNodeModal } from './SwitchNodeModal';
import { RenewModal } from './RenewModal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { parseUtcDate } from '../../utils/date';
import type { Order } from '../../types/order';
import type { SubscriptionItem } from '../../types/subscription';

interface MySubscriptionsProps {
  subscriptions: SubscriptionItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onRenewalOrderCreated: (order: Order) => void;
  onNavigateStore?: () => void;
}

export const MySubscriptions: React.FC<MySubscriptionsProps> = ({
  subscriptions,
  isLoading,
  onRefresh,
  onRenewalOrderCreated,
  onNavigateStore,
}) => {
  const { showToast } = useToast();

  const [qrSub, setQrSub] = useState<SubscriptionItem | null>(null);
  const [switchSub, setSwitchSub] = useState<SubscriptionItem | null>(null);
  const [renewSub, setRenewSub] = useState<SubscriptionItem | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopyLink = (sub: SubscriptionItem) => {
    const url = getSubUrl(sub.token);
    navigator.clipboard.writeText(url);
    setCopiedToken(sub.token);
    showToast({
      type: 'success',
      title: 'Subscription link copied',
      message: 'Paste into Shadowrocket, v2rayNG or Streisand to connect.',
    });
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const getExpirationStatus = (sub: SubscriptionItem) => {
    const now = new Date();
    const expiresAt = parseUtcDate(sub.expires_at);
    const diffMs = expiresAt.getTime() - now.getTime();
    const isDaily = sub.billing_cycle === 'DAILY';

    if (diffMs > 0) {
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      if (isDaily) {
        return {
          label: `${diffHours}h remaining`,
          badge: <Badge variant="amber" size="sm" dot={true}>{diffHours}h left</Badge>,
          isExpired: false,
          inGrace: false,
        };
      }
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        return {
          label: `${diffHours}h remaining`,
          badge: <Badge variant="amber" size="sm" dot={true} pulseDot={true}>Expiring today</Badge>,
          isExpired: false,
          inGrace: false,
        };
      }
      return {
        label: `${diffDays} days left`,
        badge: <Badge variant="emerald" size="sm" dot={true}>{diffDays}d active</Badge>,
        isExpired: false,
        inGrace: false,
      };
    }

    // Expired - check grace period (0 grace for daily, 3-day grace for monthly)
    if (!isDaily) {
      const graceEndMs = expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000;
      const graceDiffMs = graceEndMs - now.getTime();
      if (graceDiffMs > 0) {
        const graceDays = Math.ceil(graceDiffMs / (1000 * 60 * 60 * 24));
        return {
          label: `Grace Period (${graceDays}d left)`,
          badge: <Badge variant="rose" size="sm" dot={true} pulseDot={true}>Grace ({graceDays}d)</Badge>,
          isExpired: true,
          inGrace: true,
        };
      }
    }

    return {
      label: 'Expired',
      badge: <Badge variant="slate" size="sm">Expired</Badge>,
      isExpired: true,
      inGrace: false,
    };
  };

  if (isLoading) {
    return (
      <Card className="p-12 text-center border border-indigo-100/80 shadow-md space-y-3 bg-white/90 backdrop-blur-xl rounded-3xl">
        <div className="w-10 h-10 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Retrieving active proxy credentials...</p>
      </Card>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Card className="p-10 text-center border border-indigo-100 shadow-md space-y-4 bg-white/90 backdrop-blur-xl rounded-3xl">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 mx-auto">
          <Zap className="w-7 h-7 fill-current" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base font-extrabold text-slate-900">No active subscriptions yet</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Subscribe to an ultra-fast bypass proxy package in the store to get started with zero throttling.
          </p>
        </div>
        {onNavigateStore && (
          <Button
            variant="gradient"
            size="md"
            onClick={onNavigateStore}
            className="text-xs font-bold shadow-md shadow-indigo-500/20"
          >
            Explore Plans Store
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Zap className="w-4 h-4" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Active Subscriptions ({subscriptions.length})
          </h2>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          className="text-xs font-semibold"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Sync Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {subscriptions.map((sub) => {
          const usedGb = sub.traffic_used_bytes / (1024 * 1024 * 1024);
          const totalGb = sub.traffic_quota_bytes / (1024 * 1024 * 1024);
          const percent = totalGb > 0 ? Math.min(100, (usedGb / totalGb) * 100) : 0;
          const expStatus = getExpirationStatus(sub);
          const isCopied = copiedToken === sub.token;

          return (
            <Card
              key={sub.id}
              className={`p-6 space-y-4 rounded-3xl transition-all duration-300 relative overflow-hidden ${
                expStatus.inGrace
                  ? 'border-2 border-rose-300/80 bg-rose-50/30 shadow-md shadow-rose-500/5'
                  : 'border border-indigo-100/80 bg-white/95 backdrop-blur-xl shadow-md shadow-indigo-950/5 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-0.5'
              }`}
            >
              {/* Subtle ambient corner glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none -z-10" />

              {/* Card Header: Plan & Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl">{sub.region_flag || '🌐'}</span>
                    <span className="font-extrabold text-slate-900 text-base">
                      {sub.plan_name || 'Proxy Plan'}
                    </span>
                    {sub.billing_cycle === 'DAILY' && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300/80 px-2 py-0.5 rounded-full">
                        Daily Pass
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      #{sub.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Server className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-medium text-slate-700">
                      {sub.node_names?.length ? sub.node_names.join(', ') : 'Auto-assigned cluster'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">{expStatus.badge}</div>
              </div>

              {/* Grace Period Warning */}
              {expStatus.inGrace && (
                <div className="p-3 rounded-2xl bg-rose-100/70 border border-rose-300 text-rose-900 text-xs flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">
                    Subscription expired! Server slot is held in grace. Renew now to restore high-speed connection.
                  </span>
                </div>
              )}

              {/* Traffic Usage Progress Bar */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                    Data Consumption
                  </span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">
                    {usedGb.toFixed(1)} GB / {totalGb.toFixed(0)} GB ({percent.toFixed(0)}%)
                  </span>
                </div>
                <ProgressBar
                  value={usedGb}
                  max={totalGb}
                  height="md"
                  variant="auto"
                />
              </div>

              {/* Expiration Details */}
              <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100/90 pt-3">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Expires:
                </span>
                <span className="font-bold text-slate-800 font-mono">
                  {parseUtcDate(sub.expires_at).toLocaleDateString('en-GB')} ({expStatus.label})
                </span>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100/90">
                {/* 1-Click Copy Subscription Link */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopyLink(sub)}
                  className="text-xs justify-center font-bold"
                  leftIcon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  title="Copy subscription URL for Shadowrocket / v2rayNG"
                >
                  {isCopied ? 'Copied' : 'Copy Link'}
                </Button>

                {/* QR Code Modal */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setQrSub(sub)}
                  className="text-xs justify-center font-bold"
                  leftIcon={<QrCode className="w-3.5 h-3.5 text-indigo-500" />}
                  title="Open QR code to scan with mobile app"
                >
                  QR Scan
                </Button>

                {/* Node Switching */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSwitchSub(sub)}
                  className="text-xs justify-center font-bold"
                  leftIcon={<ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />}
                  title="Switch to another server in this region"
                >
                  Switch Node
                </Button>

                {/* In-place Renewal or Upgrade */}
                {sub.billing_cycle === 'DAILY' ? (
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={onNavigateStore}
                    className="text-xs justify-center font-bold shadow-xs"
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                    title="Upgrade to monthly plan in the store"
                  >
                    Upgrade
                  </Button>
                ) : (
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => setRenewSub(sub)}
                    className="text-xs justify-center font-bold shadow-xs"
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    title="Renew subscription in place"
                  >
                    Renew
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Sub-modals */}
      <SubscriptionQrModal
        sub={qrSub}
        onClose={() => setQrSub(null)}
        onCopyUrl={handleCopyLink}
      />

      <SwitchNodeModal
        sub={switchSub}
        isOpen={switchSub !== null}
        onClose={() => setSwitchSub(null)}
        onSuccess={onRefresh}
      />

      <RenewModal
        sub={renewSub}
        isOpen={renewSub !== null}
        onClose={() => setRenewSub(null)}
        onRenewalCreated={onRenewalOrderCreated}
      />
    </div>
  );
};

export default MySubscriptions;
