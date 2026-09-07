import React, { useEffect, useState } from 'react';
import { Clock, HardDrive, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fetchPublicPlans, renewSubscription } from '../../services/apiClient';
import type { Order } from '../../types/order';
import type { PlanItem } from '../../types/plan';
import type { SubscriptionItem } from '../../types/subscription';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface RenewModalProps {
  sub: SubscriptionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRenewalCreated: (order: Order) => void;
}

export const RenewModal: React.FC<RenewModalProps> = ({
  sub,
  isOpen,
  onClose,
  onRenewalCreated,
}) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && sub) {
      setSelectedPlanId(sub.plan_id || null);
      setIsLoading(true);
      fetchPublicPlans()
        .then((data) => {
          const activePlans = data.filter((p) => p.is_active);
          setPlans(activePlans);
          if (!sub.plan_id && activePlans.length > 0) {
            setSelectedPlanId(activePlans[0].id);
          }
        })
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Failed to load plans',
            message: err instanceof Error ? err.message : 'Unable to load plans',
          });
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, sub, showToast]);

  const handleRenew = async () => {
    if (!token || !sub) return;

    try {
      setIsSubmitting(true);
      const order = await renewSubscription(token, sub.id, selectedPlanId || undefined);
      showToast({
        type: 'success',
        title: 'Renewal Order Created',
        message: `Order code: ${order.code}. Please complete payment to finalize.`,
      });
      onRenewalCreated(order);
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to create renewal order',
        message: err instanceof Error ? err.message : 'Unable to create renewal order',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  if (!sub) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="In-Place Renewal"
      description="Keep your existing UUID and subscription URL while adding days and resetting bandwidth quota."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Subscription Info Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Renewing for:</span>
            <span className="font-semibold text-slate-900">{sub.customer_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Server Region:</span>
            <span className="font-medium text-slate-700">{sub.region_flag || '🌐'} {sub.region_name || sub.region_code}</span>
          </div>
        </div>

        {/* Plan Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Select renewal plan:
          </label>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              <span>Loading plans...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {plans.map((p) => {
                const isSelected = selectedPlanId === p.id;
                const quotaGb = (p.traffic_quota_bytes / (1024 * 1024 * 1024)).toFixed(0);
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{p.name}</span>
                        {p.id === sub.plan_id && (
                          <Badge variant="emerald" size="sm">Current Plan</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-slate-400" />
                          {quotaGb} GB
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          +{p.days_valid} days
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold font-mono text-indigo-700 text-sm">
                        {formatVND(p.price_vnd)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRenew}
            disabled={!selectedPlanId || isSubmitting}
            leftIcon={
              isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )
            }
          >
            {isSubmitting ? 'Creating order...' : 'Proceed to Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
