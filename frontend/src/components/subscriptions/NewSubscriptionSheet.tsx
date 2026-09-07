import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import { createSubscription } from '../../services/apiClient';
import type { NodeItem } from '../../types/node';

interface NewSubscriptionSheetProps {
  isOpen: boolean;
  activeNodes: NodeItem[];
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export const NewSubscriptionSheet: React.FC<NewSubscriptionSheetProps> = ({
  isOpen,
  activeNodes,
  onClose,
  onSuccess,
  token,
}) => {
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState<string>('');
  const [quotaGb, setQuotaGb] = useState<string>('50');
  const [daysValid, setDaysValid] = useState<string>('30');
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedNodeIds(activeNodes.map((n) => n.id));
    }
  }, [isOpen, activeNodes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!customerName.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Customer name is required.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const quota = parseFloat(quotaGb) || 50;
      const days = parseInt(daysValid, 10) || 30;

      await createSubscription(token, {
        customer_name: customerName.trim(),
        quota_gb: quota,
        days_valid: days,
        node_ids: selectedNodeIds.length > 0 ? selectedNodeIds : undefined,
      });

      showToast({
        type: 'success',
        title: 'Subscription Issued',
        message: `Issued ${quota} GB package for ${customerName}`,
      });

      setCustomerName('');
      setQuotaGb('50');
      setDaysValid('30');
      onClose();
      onSuccess();
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

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Issue New Subscription"
      description="Allocate Traffic Quota, select assigned Nodes, and generate Subscription Token"
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? 'Issuing...' : 'Generate Token'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Customer Identifier"
          placeholder="e.g. Customer #1092 or customer@example.com"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
          hint="Name or reference for this subscriber"
        />

        <Input
          label="Traffic Quota (GB)"
          type="number"
          placeholder="50"
          value={quotaGb}
          onChange={(e) => setQuotaGb(e.target.value)}
          required
          hint="Maximum data transfer before auto-enforcement disconnection"
        />

        <Input
          label="Validity Period (Days)"
          type="number"
          placeholder="30"
          value={daysValid}
          onChange={(e) => setDaysValid(e.target.value)}
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
            Select which servers this subscriber will have access to. Defaults to all active nodes.
          </p>

          <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
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

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
          <p className="font-semibold text-slate-800">Automatic Credential Sync</p>
          <p className="text-slate-500 leading-relaxed">
            Upon issuance, this subscription's UUID will automatically be injected via gRPC into the selected nodes and bundled for client import.
          </p>
        </div>
      </form>
    </Sheet>
  );
};
