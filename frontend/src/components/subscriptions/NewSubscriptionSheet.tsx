import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Layers, UserCircle } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import {
  createSubscription,
  fetchAdminPlans,
  fetchAdminRegions,
  fetchAdminUsers,
} from '../../services/apiClient';
import type { AdminUserItem } from '../../services/apiClient';
import type { NodeItem } from '../../types/node';
import type { PlanItem } from '../../types/plan';
import type { RegionItem } from '../../types/region';

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
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>(undefined);
  const [selectedRegionId, setSelectedRegionId] = useState<number | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [createOrder, setCreateOrder] = useState<boolean>(false);
  const [useManualConfig, setUseManualConfig] = useState<boolean>(false);
  const [quotaGb, setQuotaGb] = useState<string>('50');
  const [daysValid, setDaysValid] = useState<string>('30');
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && token) {
      Promise.all([
        fetchAdminPlans(token),
        fetchAdminRegions(token),
        fetchAdminUsers(token),
      ])
        .then(([fetchedPlans, fetchedRegions, fetchedUsers]) => {
          const activeP = fetchedPlans.filter((p) => p.is_active);
          setPlans(activeP);
          const activeR = fetchedRegions.filter((r) => r.is_active);
          setRegions(activeR);
          setUsers(fetchedUsers);

          if (activeP.length > 0 && !selectedPlanId) {
            const firstPlan = activeP[0];
            setSelectedPlanId(firstPlan.id);
            setQuotaGb(firstPlan.quota_gb.toString());
            setDaysValid(firstPlan.days_valid.toString());

            const allowed =
              firstPlan.allowed_regions && firstPlan.allowed_regions.length > 0
                ? activeR.filter((r) => firstPlan.allowed_regions.includes(r.code))
                : activeR;
            if (allowed.length > 0) {
              setSelectedRegionId(allowed[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, token]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const eligibleRegions = regions.filter((r) => {
    if (!selectedPlan || !selectedPlan.allowed_regions || selectedPlan.allowed_regions.length === 0) {
      return true;
    }
    return selectedPlan.allowed_regions.includes(r.code);
  });

  const handlePlanChange = (planId: number | undefined) => {
    setSelectedPlanId(planId);
    if (!planId) return;

    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setQuotaGb(plan.quota_gb.toString());
      setDaysValid(plan.days_valid.toString());

      const allowed =
        plan.allowed_regions && plan.allowed_regions.length > 0
          ? regions.filter((r) => plan.allowed_regions.includes(r.code))
          : regions;

      if (!allowed.some((r) => r.id === selectedRegionId) && allowed.length > 0) {
        setSelectedRegionId(allowed[0].id);
      }
    }
  };

  // When a registered user is selected, auto-fill customerName from their email
  const handleUserChange = (userId: number | null) => {
    setSelectedUserId(userId);
    if (userId) {
      const user = users.find((u) => u.id === userId);
      if (user) {
        setCustomerName(user.full_name || user.email);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!customerName.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Customer identifier is required.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const quota = parseFloat(quotaGb) || 50;
      const days = parseInt(daysValid, 10) || 30;

      const basePayload = {
        customer_name: customerName.trim(),
        plan_id: selectedPlanId,
        region_id: selectedRegionId,
        quota_gb: quota,
        days_valid: days,
        user_id: selectedUserId ?? undefined,
        create_order: selectedUserId ? createOrder : false,
      };

      if (!useManualConfig && selectedRegionId) {
        await createSubscription(token, basePayload);
      } else {
        await createSubscription(token, {
          ...basePayload,
          node_ids: selectedNodeIds.length > 0 ? selectedNodeIds : undefined,
        });
      }

      showToast({
        type: 'success',
        title: 'Subscription Issued',
        message: `Issued subscription for ${customerName}`,
      });

      // Reset form
      setCustomerName('');
      setSelectedUserId(null);
      setCreateOrder(false);
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
      description="Select Plan and assign single server region for optimal speed"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="gradient"
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
        {/* Link to registered user (optional) */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <UserCircle className="w-3.5 h-3.5 text-slate-500" />
            <label className="block text-xs font-semibold text-slate-700">
              Link to Registered User <span className="text-slate-400 font-normal">(optional)</span>
            </label>
          </div>
          <select
            value={selectedUserId ?? ''}
            onChange={(e) =>
              handleUserChange(e.target.value ? parseInt(e.target.value, 10) : null)
            }
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md shadow-xs focus:border-slate-900 focus:outline-none transition-colors"
          >
            <option value="">-- No account link (manual issue) --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ? `${u.full_name} (${u.email})` : u.email}
              </option>
            ))}
          </select>
          {selectedUserId && (
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createOrder}
                onChange={(e) => setCreateOrder(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900"
              />
              <span className="text-xs text-slate-600">
                Record as a paid order in the user's order history
              </span>
            </label>
          )}
        </div>

        <Input
          label="Customer Identifier"
          placeholder="e.g. Customer #1092 or customer@example.com"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
          hint="Auto-filled when a registered user is selected"
        />

        {/* Plan Selection */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Subscription Plan
            </label>
            <span className="text-[11px] text-slate-500">Defaults to all regions</span>
          </div>
          <select
            value={selectedPlanId || ''}
            onChange={(e) =>
              handlePlanChange(e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md shadow-xs focus:border-slate-900 focus:outline-none transition-colors"
          >
            <option value="">-- Custom / Manual Quota --</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} ({plan.quota_gb} GB / {plan.days_valid}d -{' '}
                {plan.price_vnd.toLocaleString()} VND)
              </option>
            ))}
          </select>
        </div>

        {/* Region Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Assigned Region <span className="text-slate-400 font-normal">(Subscriber selects 1 region)</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {eligibleRegions.map((region) => {
              const isSelected = selectedRegionId === region.id;
              return (
                <button
                  type="button"
                  key={region.id}
                  onClick={() => setSelectedRegionId(region.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg">{region.flag}</span>
                  <div>
                    <div className="text-xs font-semibold">{region.name}</div>
                    <div
                      className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}
                    >
                      {region.code}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {eligibleRegions.length === 0 && (
            <p className="text-xs text-rose-500 mt-1">No active regions available for this plan.</p>
          )}
        </div>

        {/* Quota & Validity */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Traffic Quota (GB)"
            type="number"
            placeholder="50"
            value={quotaGb}
            onChange={(e) => setQuotaGb(e.target.value)}
            required
            hint="Auto-set from plan"
          />
          <Input
            label="Validity (Days)"
            type="number"
            placeholder="30"
            value={daysValid}
            onChange={(e) => setDaysValid(e.target.value)}
            hint="Auto-set from plan"
          />
        </div>

        {/* Advanced Manual Node Assignment Toggle */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setUseManualConfig(!useManualConfig)}
            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 underline"
          >
            <Layers className="w-3 h-3" />
            {useManualConfig
              ? 'Hide manual node override'
              : 'Override with manual node selection (Advanced)'}
          </button>

          {useManualConfig && (
            <div className="mt-2 space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50/50 max-h-40 overflow-y-auto">
              {activeNodes.map((node) => {
                const isChecked = selectedNodeIds.includes(node.id);
                return (
                  <label
                    key={node.id}
                    className={`flex items-center justify-between p-2 rounded-md border cursor-pointer text-xs ${
                      isChecked
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-100'
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
                        className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900"
                      />
                      <span>{node.flag}</span>
                      <span className="font-semibold">{node.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">{node.host}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-600">
          <p className="font-medium text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Intelligent Server Load Balancing
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            The proxy backend will automatically choose the least-loaded node in the selected region
            to ensure best connection stability.
          </p>
        </div>
      </form>
    </Sheet>
  );
};
