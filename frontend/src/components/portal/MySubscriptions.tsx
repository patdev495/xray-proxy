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
      message: 'Paste into Shadowrocket or v2rayNG to update.',
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
          label: `${diffHours}h left`,
          badge: <Badge variant="amber" size="sm" dot>Trial ({diffHours}h)</Badge>,
          isExpired: false,
          inGrace: false,
        };
      }
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        return {
          label: `${diffHours}h left`,
          badge: <Badge variant="amber" size="sm" dot>Expiring soon ({diffHours}h)</Badge>,
          isExpired: false,
          inGrace: false,
        };
      }
      return {
        label: `${diffDays}d left`,
        badge: <Badge variant="emerald" size="sm" dot>{diffDays}d left</Badge>,
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
          label: `Grace (${graceDays}d left)`,
          badge: <Badge variant="rose" size="sm" dot pulseDot>Grace ({graceDays}d)</Badge>,
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
      <Card className="p-8 text-center border border-slate-200/80 shadow-xs space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Loading your subscriptions...</p>
      </Card>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Card className="p-8 text-center border border-slate-200/80 shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
          <Zap className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-sm font-bold text-slate-900">No active subscriptions</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Choose a suitable plan in the store to experience high-speed bypass proxy.
          </p>
        </div>
        {onNavigateStore && (
          <Button
            variant="primary"
            size="sm"
            onClick={onNavigateStore}
            className="text-xs"
          >
            Explore Plans
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">
            My Subscriptions ({subscriptions.length})
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="text-xs text-slate-500 hover:text-slate-800"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subscriptions.map((sub) => {
          const usedGb = sub.traffic_used_bytes / (1024 * 1024 * 1024);
          const totalGb = sub.traffic_quota_bytes / (1024 * 1024 * 1024);
          const percent = totalGb > 0 ? Math.min(100, (usedGb / totalGb) * 100) : 0;
          const expStatus = getExpirationStatus(sub);
          const isCopied = copiedToken === sub.token;

          return (
            <Card
              key={sub.id}
              className={`p-5 space-y-4 border transition-shadow hover:shadow-sm ${
                expStatus.inGrace
                  ? 'border-rose-200/90 bg-rose-50/20'
                  : 'border-slate-200/80 bg-white'
              }`}
            >
              {/* Card Header: Plan & Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">{sub.region_flag || '🌐'}</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {sub.plan_name || 'Proxy Plan'}
                    </span>
                    {sub.billing_cycle === 'DAILY' && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        Daily Plan (Trial)
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      #{sub.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-700">
                      {sub.node_names?.length ? sub.node_names.join(', ') : 'Auto-assigned'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">{expStatus.badge}</div>
              </div>

              {/* Grace Period Warning */}
              {expStatus.inGrace && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Subscription expired! Your server slot is temporarily held during the grace period. Please renew to keep your connection.
                  </span>
                </div>
              )}

              {/* Traffic Usage Progress Bar */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    Traffic used
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-slate-800">
                    {usedGb.toFixed(1)} GB / {totalGb.toFixed(0)} GB ({percent.toFixed(0)}%)
                  </span>
                </div>
                <ProgressBar
                  value={usedGb}
                  max={totalGb}
                  height="sm"
                />
              </div>

              {/* Expiration Details */}
              <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Expires:
                </span>
                <span className="font-medium text-slate-700">
                  {parseUtcDate(sub.expires_at).toLocaleDateString('en-GB')} ({expStatus.label})
                </span>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
                {/* 1-Click Copy Subscription Link */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(sub)}
                  className="text-xs justify-center"
                  leftIcon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  title="Copy subscription URL for Shadowrocket / v2rayNG"
                >
                  {isCopied ? 'Copied' : 'Copy'}
                </Button>

                {/* QR Code Modal */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQrSub(sub)}
                  className="text-xs justify-center"
                  leftIcon={<QrCode className="w-3.5 h-3.5" />}
                  title="Open QR code to scan with mobile app"
                >
                  QR Code
                </Button>

                {/* Node Switching */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSwitchSub(sub)}
                  className="text-xs justify-center"
                  leftIcon={<ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />}
                  title="Switch to another server in this region"
                >
                  Switch Server
                </Button>

                {/* In-place Renewal or Upgrade */}
                {sub.billing_cycle === 'DAILY' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onNavigateStore}
                    className="text-xs justify-center font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                    title="Upgrade to monthly plan in the store"
                  >
                    Upgrade to Monthly
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setRenewSub(sub)}
                    className="text-xs justify-center font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
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
