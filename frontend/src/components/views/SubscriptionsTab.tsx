import React, { useEffect, useState, useCallback } from 'react';
import { 
  Plus, 
  Copy, 
  Check, 
  QrCode, 
  RefreshCw, 
  Trash2, 
  Power, 
  Clock, 
  Database,
  Users
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ProgressBar } from '../ui/ProgressBar';
import { Modal } from '../ui/Modal';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from '../../services/apiClient';
import type { SubscriptionItem } from '../../types/subscription';

export const SubscriptionsTab: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modal State for QR Code
  const [selectedSubForQr, setSelectedSubForQr] = useState<SubscriptionItem | null>(null);

  // Modal State for Renew / Extend
  const [selectedSubForRenew, setSelectedSubForRenew] = useState<SubscriptionItem | null>(null);
  const [addQuotaGb, setAddQuotaGb] = useState<string>('0');
  const [addDays, setAddDays] = useState<string>('30');
  const [isRenewing, setIsRenewing] = useState<boolean>(false);

  // Sheet State for New Subscription
  const [isNewSubSheetOpen, setIsNewSubSheetOpen] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newQuotaGb, setNewQuotaGb] = useState<string>('50');
  const [newDaysValid, setNewDaysValid] = useState<string>('30');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadSubscriptions = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const data = await fetchSubscriptions(token);
      setSubscriptions(data);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Fetch Error',
        message: err instanceof Error ? err.message : 'Failed to load subscriptions',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const getSubUrl = (subToken: string) => {
    const origin = window.location.origin;
    return `${origin}/sub/${subToken}`;
  };

  const copySubscriptionUrl = (sub: SubscriptionItem) => {
    const url = getSubUrl(sub.token);
    navigator.clipboard.writeText(url);
    setCopiedId(sub.id);
    showToast({
      type: 'success',
      title: 'Subscription URL Copied',
      message: `Ready to import into Shadowrocket for ${sub.customer_name}`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!newCustomerName.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Customer name is required.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const quota = parseFloat(newQuotaGb) || 50;
      const days = parseInt(newDaysValid, 10) || 30;

      await createSubscription(token, {
        customer_name: newCustomerName.trim(),
        quota_gb: quota,
        days_valid: days,
      });

      showToast({
        type: 'success',
        title: 'Subscription Issued',
        message: `Issued ${quota} GB package for ${newCustomerName}`,
      });

      setNewCustomerName('');
      setNewQuotaGb('50');
      setNewDaysValid('30');
      setIsNewSubSheetOpen(false);

      await loadSubscriptions();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message: err instanceof Error ? err.message : 'Failed to create subscription',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRenew = (sub: SubscriptionItem) => {
    setSelectedSubForRenew(sub);
    setAddQuotaGb('0');
    setAddDays('30');
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedSubForRenew) return;

    try {
      setIsRenewing(true);
      const quotaToAdd = parseFloat(addQuotaGb) || 0;
      const daysToAdd = parseInt(addDays, 10) || 0;

      await updateSubscription(token, selectedSubForRenew.id, {
        add_quota_gb: quotaToAdd > 0 ? quotaToAdd : undefined,
        add_days: daysToAdd > 0 ? daysToAdd : undefined,
        status: 'ACTIVE',
      });

      showToast({
        type: 'success',
        title: 'Subscription Renewed',
        message: `Updated quota & expiry for ${selectedSubForRenew.customer_name}`,
      });

      setSelectedSubForRenew(null);
      await loadSubscriptions();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Renew Failed',
        message: err instanceof Error ? err.message : 'Could not renew subscription',
      });
    } finally {
      setIsRenewing(false);
    }
  };

  const handleToggleSuspend = async (sub: SubscriptionItem) => {
    if (!token) return;
    try {
      const nextStatus = sub.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await updateSubscription(token, sub.id, { status: nextStatus });
      showToast({
        type: 'info',
        title: 'Status Updated',
        message: `${sub.customer_name} is now ${nextStatus === 'ACTIVE' ? 'Active' : 'Suspended'}.`,
      });
      await loadSubscriptions();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update Error',
        message: err instanceof Error ? err.message : 'Could not toggle subscription status',
      });
    }
  };

  const handleDeleteSubscription = async (sub: SubscriptionItem) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to delete subscription for "${sub.customer_name}"?`)) {
      return;
    }

    try {
      await deleteSubscription(token, sub.id);
      showToast({
        type: 'success',
        title: 'Subscription Deleted',
        message: `Removed ${sub.customer_name}.`,
      });
      await loadSubscriptions();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Failed to delete subscription',
      });
    }
  };

  // Helper formatting bytes to human-readable size (B, KB, MB, GB)
  const formatDataSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${bytes} B`;
  };

  const formatGb = (bytes: number): string => (bytes / (1024 * 1024 * 1024)).toFixed(1);



  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Customer Subscriptions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage traffic limits and distribute VLESS-Reality base64 bundles for Shadowrocket clients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadSubscriptions}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewSubSheetOpen(true)}
          >
            Issue Subscription
          </Button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-5">Subscriber</th>
                <th className="py-3 px-5">Traffic Consumption</th>
                <th className="py-3 px-5">Expiration Date</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No subscriptions issued yet</p>
                    <p className="text-xs text-slate-400 mt-1">Issue a subscription token to start serving clients.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => setIsNewSubSheetOpen(true)}
                    >
                      Issue First Subscription
                    </Button>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const usedGb = sub.traffic_used_bytes / (1024 * 1024 * 1024);
                  const quotaGb = sub.traffic_quota_bytes / (1024 * 1024 * 1024);
                  const percentUsed = Math.min(Math.round((usedGb / (quotaGb || 1)) * 100), 100);
                  const isNearQuota = percentUsed >= 85;
                  const expiryFormatted = new Date(sub.expires_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Subscriber Info */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900 text-sm">
                          {sub.customer_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <code className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                            {sub.token.substring(0, 14)}...
                          </code>
                          <button
                            onClick={() => copySubscriptionUrl(sub)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Copy Subscription Link"
                          >
                            {copiedId === sub.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Traffic Consumption */}
                      <td className="py-4 px-5 min-w-[180px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-medium text-slate-700">
                              {formatDataSize(sub.traffic_used_bytes)} / {formatDataSize(sub.traffic_quota_bytes)}
                            </span>
                            <span className={`font-semibold ${isNearQuota ? 'text-rose-600' : 'text-slate-500'}`}>
                              {sub.traffic_used_bytes > 0 && percentUsed < 1 ? '< 1%' : `${percentUsed}%`}
                            </span>
                          </div>
                          <ProgressBar
                            value={usedGb}
                            max={quotaGb || 1}
                            height="sm"
                          />
                        </div>
                      </td>


                      {/* Expiration Date */}
                      <td className="py-4 px-5 font-mono text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{expiryFormatted}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <Badge
                          variant={
                            sub.status === 'ACTIVE'
                              ? 'emerald'
                              : sub.status === 'SUSPENDED'
                              ? 'amber'
                              : 'rose'
                          }
                          size="sm"
                          dot={true}
                          pulseDot={sub.status === 'ACTIVE'}
                        >
                          {sub.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* QR Code Modal Button */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedSubForQr(sub)}
                            title="Show QR Code for Shadowrocket"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">QR</span>
                          </Button>

                          {/* Renew / Extend Button */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenRenew(sub)}
                            title="Extend days or quota"
                          >
                            Renew
                          </Button>

                          {/* Suspend / Activate Toggle */}
                          <button
                            onClick={() => handleToggleSuspend(sub)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              sub.status === 'ACTIVE'
                                ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={sub.status === 'ACTIVE' ? 'Suspend Subscription' : 'Activate Subscription'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Subscription */}
                          <button
                            onClick={() => handleDeleteSubscription(sub)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                            title="Delete Subscription"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: QR Code Preview */}
      <Modal
        isOpen={selectedSubForQr !== null}
        onClose={() => setSelectedSubForQr(null)}
        title="Client App Subscription QR"
        description="Scan directly in Shadowrocket or v2rayNG to auto-import nodes"
      >
        {selectedSubForQr && (
          <div className="space-y-5 text-center">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block mx-auto">
              <div className="w-48 h-48 bg-white border border-slate-300 rounded-lg flex flex-col items-center justify-center p-2 shadow-xs overflow-hidden">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    getSubUrl(selectedSubForQr.token)
                  )}`}
                  alt="Subscription QR"
                  className="w-44 h-44 object-contain"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800">{selectedSubForQr.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quota:</span>
                <span className="font-mono text-slate-800">{formatGb(selectedSubForQr.traffic_quota_bytes)} GB</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 shrink-0">Subscription Link:</span>
                <span className="font-mono text-slate-700 truncate max-w-[220px]">
                  {getSubUrl(selectedSubForQr.token)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSubForQr(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  copySubscriptionUrl(selectedSubForQr);
                  setSelectedSubForQr(null);
                }}
                leftIcon={<Copy className="w-3.5 h-3.5" />}
              >
                Copy Link &amp; Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Renew / Extend Subscription */}
      <Modal
        isOpen={selectedSubForRenew !== null}
        onClose={() => setSelectedSubForRenew(null)}
        title={`Renew Subscription - ${selectedSubForRenew?.customer_name || ''}`}
        description="Extend validity days or add additional bandwidth quota"
      >
        <form onSubmit={handleRenewSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Current Quota:</span>
              <span className="font-mono font-semibold text-slate-800">
                {selectedSubForRenew ? formatGb(selectedSubForRenew.traffic_quota_bytes) : 0} GB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Expiry:</span>
              <span className="font-mono text-slate-700">
                {selectedSubForRenew ? new Date(selectedSubForRenew.expires_at).toLocaleDateString() : ''}
              </span>
            </div>
          </div>

          <Input
            label="Additional Quota (GB)"
            type="number"
            placeholder="0"
            value={addQuotaGb}
            onChange={(e) => setAddQuotaGb(e.target.value)}
            hint="GB to add to the existing quota"
          />

          <Input
            label="Additional Days"
            type="number"
            placeholder="30"
            value={addDays}
            onChange={(e) => setAddDays(e.target.value)}
            hint="Days to extend from current expiry"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setSelectedSubForRenew(null)}
              disabled={isRenewing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isRenewing}
              leftIcon={<Database className="w-3.5 h-3.5" />}
            >
              {isRenewing ? 'Updating...' : 'Save & Renew'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Slide-over Sheet: New Subscription Form */}
      <Sheet
        isOpen={isNewSubSheetOpen}
        onClose={() => setIsNewSubSheetOpen(false)}
        title="Issue New Subscription"
        description="Allocate Traffic Quota and generate a secure Subscription Token"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewSubSheetOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateSubscription}
              disabled={isSubmitting}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'Issuing...' : 'Generate Token'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubscription} className="space-y-4">
          <Input
            label="Customer Identifier"
            placeholder="e.g. Customer #1092 or customer@example.com"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            required
            hint="Name or reference for this subscriber"
          />

          <Input
            label="Traffic Quota (GB)"
            type="number"
            placeholder="50"
            value={newQuotaGb}
            onChange={(e) => setNewQuotaGb(e.target.value)}
            required
            hint="Maximum data transfer before auto-enforcement disconnection"
          />

          <Input
            label="Validity Period (Days)"
            type="number"
            placeholder="30"
            value={newDaysValid}
            onChange={(e) => setNewDaysValid(e.target.value)}
            hint="Days until subscription expires automatically"
          />

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
            <p className="font-semibold text-slate-800">Included Inbounds</p>
            <p className="text-slate-500 leading-relaxed">
              Upon issuance, this subscription will automatically bundle all active Nodes with their configured carrier SNI Profiles into a Base64 URL for Shadowrocket and other clients.
            </p>
          </div>
        </form>
      </Sheet>
    </div>
  );
};

export default SubscriptionsTab;
