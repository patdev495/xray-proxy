import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import { updateSubscription } from '../../services/apiClient';
import type { SubscriptionItem, SubscriptionStatus } from '../../types/subscription';
import type { NodeItem } from '../../types/node';

interface SubscriptionEditModalProps {
  sub: SubscriptionItem | null;
  activeNodes: NodeItem[];
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export const SubscriptionEditModal: React.FC<SubscriptionEditModalProps> = ({
  sub,
  activeNodes,
  onClose,
  onSuccess,
  token,
}) => {
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState<string>('');
  const [status, setStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [quotaGb, setQuotaGb] = useState<string>('50');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (sub) {
      setCustomerName(sub.customer_name);
      setStatus(sub.status);
      setQuotaGb((sub.traffic_quota_bytes / (1024 * 1024 * 1024)).toString());
      const dateObj = new Date(sub.expires_at);
      const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().substring(0, 10) : '';
      setExpiryDate(dateStr);
      setSelectedNodeIds(sub.node_ids || []);
    }
  }, [sub]);

  if (!sub) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setIsUpdating(true);
      const quota = parseFloat(quotaGb);
      let isoExpiry: string | undefined = undefined;
      if (expiryDate) {
        isoExpiry = new Date(`${expiryDate}T23:59:59.000Z`).toISOString();
      }

      await updateSubscription(token, sub.id, {
        customer_name: customerName.trim(),
        status: status,
        traffic_quota_gb: !isNaN(quota) && quota > 0 ? quota : undefined,
        expires_at: isoExpiry,
        node_ids: selectedNodeIds,
      });

      showToast({
        type: 'success',
        title: 'Subscription Updated',
        message: `Successfully updated ${customerName.trim()}`,
      });

      onClose();
      onSuccess();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Failed to update subscription',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={sub !== null}
      onClose={onClose}
      title={`Edit Subscription - ${sub.customer_name}`}
      description="Update subscriber name, bandwidth quota, status, and assigned VPS nodes"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
          placeholder="Subscriber name"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Total Quota (GB)"
            type="number"
            step="any"
            value={quotaGb}
            onChange={(e) => setQuotaGb(e.target.value)}
            required
            hint="Total allowed traffic in GB"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
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
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
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
                onClick={() => setSelectedNodeIds(activeNodes.map((n) => n.id))}
                className="text-[11px] text-slate-600 hover:text-slate-900 underline"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setSelectedNodeIds([])}
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
                const isChecked = selectedNodeIds.includes(node.id);
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
                            setSelectedNodeIds([...selectedNodeIds, node.id]);
                          } else {
                            setSelectedNodeIds(selectedNodeIds.filter((id) => id !== node.id));
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
            onClick={onClose}
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
  );
};
