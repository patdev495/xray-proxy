import React, { useEffect, useState, useCallback } from 'react';
import { 
  Plus, 
  RefreshCw, 
  Users,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchSubscriptions,
  updateSubscription,
  deleteSubscription,
  fetchNodes,
} from '../../services/apiClient';
import type { SubscriptionItem } from '../../types/subscription';
import type { NodeItem } from '../../types/node';
import { getSubUrl } from '../subscriptions/subscriptionUtils';
import { SubscriptionQrModal } from '../subscriptions/SubscriptionQrModal';
import { SubscriptionRenewModal } from '../subscriptions/SubscriptionRenewModal';
import { SubscriptionEditModal } from '../subscriptions/SubscriptionEditModal';
import { NewSubscriptionSheet } from '../subscriptions/NewSubscriptionSheet';
import { SubscriptionTableRow } from '../subscriptions/SubscriptionTableRow';

export const SubscriptionsTab: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modal State for QR Code
  const [selectedSubForQr, setSelectedSubForQr] = useState<SubscriptionItem | null>(null);

  // Modal State for Renew / Extend
  const [selectedSubForRenew, setSelectedSubForRenew] = useState<SubscriptionItem | null>(null);

  // Modal State for Edit Subscription Profile & Nodes
  const [selectedSubForEdit, setSelectedSubForEdit] = useState<SubscriptionItem | null>(null);

  // Sheet State for New Subscription
  const [isNewSubSheetOpen, setIsNewSubSheetOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const [subsData, nodesData] = await Promise.all([
        fetchSubscriptions(token),
        fetchNodes(token),
      ]);
      setSubscriptions(subsData);
      setNodes(nodesData);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Fetch Error',
        message: err instanceof Error ? err.message : 'Failed to load subscriptions data',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      await loadData();
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
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Failed to delete subscription',
      });
    }
  };

  const activeNodes = nodes.filter((n) => n.is_active);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Customer Proxy Subscriptions</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage customer traffic allowances, tokens, client configurations and remote node bindings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} />}
            className="font-bold text-xs"
          >
            Refresh Data
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setIsNewSubSheetOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="font-bold text-xs shadow-md shadow-indigo-500/20"
          >
            Issue Subscription
          </Button>
        </div>
      </div>

      {/* Subscriptions Table Card */}
      <Card className="rounded-3xl border border-indigo-100/70 shadow-md shadow-indigo-950/5 bg-white/95 backdrop-blur-xl overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100/90 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">Subscriber</th>
                <th className="py-3.5 px-5">Traffic Consumption</th>
                <th className="py-3.5 px-5">Assigned Nodes</th>
                <th className="py-3.5 px-5">Expiration Date</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
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
                subscriptions.map((sub) => (
                  <SubscriptionTableRow
                    key={sub.id}
                    sub={sub}
                    nodes={nodes}
                    copiedId={copiedId}
                    onCopyUrl={copySubscriptionUrl}
                    onOpenQr={(s) => setSelectedSubForQr(s)}
                    onOpenRenew={(s) => setSelectedSubForRenew(s)}
                    onOpenEdit={(s) => setSelectedSubForEdit(s)}
                    onToggleActive={handleToggleSuspend}
                    onDelete={handleDeleteSubscription}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: QR Code Preview */}
      <SubscriptionQrModal
        sub={selectedSubForQr}
        onClose={() => setSelectedSubForQr(null)}
        onCopyUrl={copySubscriptionUrl}
      />

      {/* Modal: Edit Subscription Profile & Nodes */}
      <SubscriptionEditModal
        sub={selectedSubForEdit}
        activeNodes={activeNodes}
        onClose={() => setSelectedSubForEdit(null)}
        onSuccess={loadData}
        token={token}
      />

      {/* Modal: Quick Renew / Extend Subscription */}
      <SubscriptionRenewModal
        sub={selectedSubForRenew}
        onClose={() => setSelectedSubForRenew(null)}
        onSuccess={loadData}
        token={token}
      />

      {/* Slide-over Sheet: New Subscription Form */}
      <NewSubscriptionSheet
        isOpen={isNewSubSheetOpen}
        activeNodes={activeNodes}
        onClose={() => setIsNewSubSheetOpen(false)}
        onSuccess={loadData}
        token={token}
      />
    </div>
  );
};

export default SubscriptionsTab;
