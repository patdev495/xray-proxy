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
  Users,
  Edit2,
  Globe
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
  fetchNodes,
} from '../../services/apiClient';
import type { SubscriptionItem, SubscriptionStatus } from '../../types/subscription';
import type { NodeItem } from '../../types/node';

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
  const [addQuotaGb, setAddQuotaGb] = useState<string>('0');
  const [addDays, setAddDays] = useState<string>('30');
  const [isRenewing, setIsRenewing] = useState<boolean>(false);

  // Modal State for Edit Subscription Profile & Nodes
  const [selectedSubForEdit, setSelectedSubForEdit] = useState<SubscriptionItem | null>(null);
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [editQuotaGb, setEditQuotaGb] = useState<string>('50');
  const [editExpiryDate, setEditExpiryDate] = useState<string>('');
  const [editSelectedNodeIds, setEditSelectedNodeIds] = useState<number[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Sheet State for New Subscription
  const [isNewSubSheetOpen, setIsNewSubSheetOpen] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newQuotaGb, setNewQuotaGb] = useState<string>('50');
  const [newDaysValid, setNewDaysValid] = useState<string>('30');
  const [newSelectedNodeIds, setNewSelectedNodeIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  // When opening new subscription sheet, default select all active nodes if none selected
  const handleOpenNewSheet = () => {
    const activeNodeIds = nodes.filter((n) => n.is_active).map((n) => n.id);
    setNewSelectedNodeIds(activeNodeIds);
    setIsNewSubSheetOpen(true);
  };

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
        node_ids: newSelectedNodeIds.length > 0 ? newSelectedNodeIds : undefined,
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

      await loadData();
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

  const handleOpenEdit = (sub: SubscriptionItem) => {
    setSelectedSubForEdit(sub);
    setEditCustomerName(sub.customer_name);
    setEditStatus(sub.status);
    setEditQuotaGb((sub.traffic_quota_bytes / (1024 * 1024 * 1024)).toString());
    const dateObj = new Date(sub.expires_at);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().substring(0, 10) : '';
    setEditExpiryDate(dateStr);
    setEditSelectedNodeIds(sub.node_ids || []);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedSubForEdit) return;

    try {
      setIsUpdating(true);
      const quota = parseFloat(editQuotaGb);
      let isoExpiry: string | undefined = undefined;
      if (editExpiryDate) {
        isoExpiry = new Date(`${editExpiryDate}T23:59:59.000Z`).toISOString();
      }

      await updateSubscription(token, selectedSubForEdit.id, {
        customer_name: editCustomerName.trim(),
        status: editStatus,
        traffic_quota_gb: !isNaN(quota) && quota > 0 ? quota : undefined,
        expires_at: isoExpiry,
        node_ids: editSelectedNodeIds,
      });

      showToast({
        type: 'success',
        title: 'Subscription Updated',
        message: `Successfully updated ${editCustomerName.trim()}`,
      });

      setSelectedSubForEdit(null);
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Could not update subscription',
      });
    } finally {
      setIsUpdating(false);
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
      await loadData();
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

  const activeNodes = nodes.filter((n) => n.is_active);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Customer Subscriptions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage traffic quotas, node authorizations, and distribute VLESS-Reality base64 bundles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadData}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenNewSheet}
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
                <th className="py-3 px-5">Assigned Nodes</th>
                <th className="py-3 px-5">Expiration Date</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                      onClick={handleOpenNewSheet}
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
                      <td className="py-4 px-5 min-w-[170px]">
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

                      {/* Assigned Nodes */}
                      <td className="py-4 px-5 min-w-[160px]">
                        <div className="flex flex-wrap gap-1 items-center max-w-[220px]">
                          {(!sub.node_ids || sub.node_ids.length === 0) ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60">
                              <Globe className="w-3 h-3 text-slate-400" />
                              All Nodes
                            </span>
                          ) : (
                            sub.node_ids.map((nodeId) => {
                              const matchedNode = nodes.find((n) => n.id === nodeId);
                              return (
                                <span
                                  key={nodeId}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md shadow-2xs"
                                  title={matchedNode?.host || `Node ID: ${nodeId}`}
                                >
                                  <span>{matchedNode?.flag || '🌐'}</span>
                                  <span className="truncate max-w-[90px]">{matchedNode?.name || `Node #${nodeId}`}</span>
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* Expiration Date */}
                      <td className="py-4 px-5 font-mono text-slate-600 whitespace-nowrap">
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

                          {/* Edit Full Profile Button */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(sub)}
                            title="Edit subscription details & assigned nodes"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>

                          {/* Quick Renew Button */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenRenew(sub)}
                            title="Quick extend days or quota"
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
        description="Scan directly in Shadowrocket, Streisand, or v2rayNG"
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

      {/* Modal: Edit Subscription Profile & Nodes */}
      <Modal
        isOpen={selectedSubForEdit !== null}
        onClose={() => setSelectedSubForEdit(null)}
        title={`Edit Subscription - ${selectedSubForEdit?.customer_name || ''}`}
        description="Update subscriber name, bandwidth quota, status, and assigned VPS nodes"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Customer Name"
            value={editCustomerName}
            onChange={(e) => setEditCustomerName(e.target.value)}
            required
            placeholder="Subscriber name"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Total Quota (GB)"
              type="number"
              step="any"
              value={editQuotaGb}
              onChange={(e) => setEditQuotaGb(e.target.value)}
              required
              hint="Total allowed traffic in GB"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as SubscriptionStatus)}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-slate-500 focus:outline-hidden"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>
          </div>

          <Input
            label="Expiration Date"
            type="date"
            value={editExpiryDate}
            onChange={(e) => setEditExpiryDate(e.target.value)}
            hint="Date when access expires automatically"
          />

          {/* Node Multi-select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Assigned VPS Nodes
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditSelectedNodeIds(activeNodes.map((n) => n.id))}
                  className="text-[11px] text-slate-600 hover:text-slate-900 underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setEditSelectedNodeIds([])}
                  className="text-[11px] text-slate-600 hover:text-slate-900 underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Only checked nodes will be included in the client's subscription bundle and synced via gRPC.
            </p>

            <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
              {activeNodes.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">No active nodes available.</p>
              ) : (
                activeNodes.map((node) => {
                  const isChecked = editSelectedNodeIds.includes(node.id);
                  return (
                    <label
                      key={node.id}
                      className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                          : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditSelectedNodeIds([...editSelectedNodeIds, node.id]);
                            } else {
                              setEditSelectedNodeIds(editSelectedNodeIds.filter((id) => id !== node.id));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        <span className="text-sm">{node.flag}</span>
                        <span className="font-semibold">{node.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">{node.host}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setSelectedSubForEdit(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isUpdating}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Quick Renew / Extend Subscription */}
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
        description="Allocate Traffic Quota, select assigned Nodes, and generate Subscription Token"
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

          {/* Node Multi-select in Sheet */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Assigned VPS Nodes
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewSelectedNodeIds(activeNodes.map((n) => n.id))}
                  className="text-[11px] text-slate-600 hover:text-slate-900 underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setNewSelectedNodeIds([])}
                  className="text-[11px] text-slate-600 hover:text-slate-900 underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Select which servers this subscriber will have access to. Defaults to all active nodes.
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
              {activeNodes.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">No active nodes available.</p>
              ) : (
                activeNodes.map((node) => {
                  const isChecked = newSelectedNodeIds.includes(node.id);
                  return (
                    <label
                      key={node.id}
                      className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                          : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSelectedNodeIds([...newSelectedNodeIds, node.id]);
                            } else {
                              setNewSelectedNodeIds(newSelectedNodeIds.filter((id) => id !== node.id));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        <span className="text-sm">{node.flag}</span>
                        <span className="font-semibold">{node.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">{node.host}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
            <p className="font-semibold text-slate-800">Automatic Credential Sync</p>
            <p className="text-slate-500 leading-relaxed">
              Upon issuance, this subscription's UUID will automatically be injected via gRPC into the selected nodes and bundled for client import.
            </p>
          </div>
        </form>
      </Sheet>
    </div>
  );
};

export default SubscriptionsTab;
