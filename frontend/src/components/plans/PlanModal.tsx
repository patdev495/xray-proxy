import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { createAdminPlan, updateAdminPlan } from '../../services/apiClient';
import type { PlanItem } from '../../types/plan';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPlan: PlanItem | null;
  onSuccess: () => void;
  token: string | null;
  suggestedSortOrder: number;
}

export const PlanModal: React.FC<PlanModalProps> = ({
  isOpen,
  onClose,
  editingPlan,
  onSuccess,
  token,
  suggestedSortOrder,
}) => {
  const { showToast } = useToast();

  const [planName, setPlanName] = useState<string>('');
  const [planPrice, setPlanPrice] = useState<string>('30000');
  const [planQuotaGb, setPlanQuotaGb] = useState<string>('100');
  const [planDaysValid, setPlanDaysValid] = useState<string>('30');
  const [planRegions, setPlanRegions] = useState<string>('🇻🇳, 🇸🇬, 🇯🇵');
  const [planSortOrder, setPlanSortOrder] = useState<string>('1');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (editingPlan) {
      setPlanName(editingPlan.name);
      setPlanPrice(String(editingPlan.price_vnd));
      setPlanQuotaGb(String(editingPlan.quota_gb));
      setPlanDaysValid(String(editingPlan.days_valid));
      setPlanRegions(editingPlan.allowed_regions.join(', '));
      setPlanSortOrder(String(editingPlan.sort_order));
    } else {
      setPlanName('');
      setPlanPrice('30000');
      setPlanQuotaGb('100');
      setPlanDaysValid('30');
      setPlanRegions('🇻🇳, 🇸🇬, 🇯🇵');
      setPlanSortOrder(String(suggestedSortOrder));
    }
  }, [editingPlan, isOpen, suggestedSortOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!planName.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Plan name is required.',
      });
      return;
    }

    const regionsList = planRegions
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      if (editingPlan) {
        await updateAdminPlan(token, editingPlan.id, {
          name: planName.trim(),
          price_vnd: parseInt(planPrice, 10) || 0,
          quota_gb: parseInt(planQuotaGb, 10) || 50,
          days_valid: parseInt(planDaysValid, 10) || 30,
          allowed_regions: regionsList,
          sort_order: parseInt(planSortOrder, 10) || 0,
        });
        showToast({
          type: 'success',
          title: 'Plan Updated',
          message: `Plan "${planName}" was updated successfully.`,
        });
      } else {
        await createAdminPlan(token, {
          name: planName.trim(),
          price_vnd: parseInt(planPrice, 10) || 0,
          quota_gb: parseInt(planQuotaGb, 10) || 50,
          days_valid: parseInt(planDaysValid, 10) || 30,
          allowed_regions: regionsList,
          sort_order: parseInt(planSortOrder, 10) || 0,
        });
        showToast({
          type: 'success',
          title: 'Plan Created',
          message: `Plan "${planName}" was created successfully.`,
        });
      }
      onClose();
      onSuccess();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: err instanceof Error ? err.message : 'Failed to save plan',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Subscription Plan'}
      description="Define customer package pricing, traffic limit, validity and available regions."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Plan Name"
          placeholder="e.g. Gói 4G Viettel Tháng"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          required
          hint="Display name on storefront"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Price (VND)"
            type="number"
            min="0"
            step="1000"
            placeholder="30000"
            value={planPrice}
            onChange={(e) => setPlanPrice(e.target.value)}
            required
          />
          <Input
            label="Data Quota (GB)"
            type="number"
            min="1"
            placeholder="100"
            value={planQuotaGb}
            onChange={(e) => setPlanQuotaGb(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Validity (Days)"
            type="number"
            min="1"
            placeholder="30"
            value={planDaysValid}
            onChange={(e) => setPlanDaysValid(e.target.value)}
            required
          />
          <Input
            label="Sort Order"
            type="number"
            min="0"
            placeholder="1"
            value={planSortOrder}
            onChange={(e) => setPlanSortOrder(e.target.value)}
            hint="Lower number shows first"
          />
        </div>

        <Input
          label="Allowed Regions (Country Flags)"
          placeholder="🇻🇳, 🇸🇬, 🇯🇵"
          value={planRegions}
          onChange={(e) => setPlanRegions(e.target.value)}
          hint="Comma-separated country flag emojis (e.g. 🇻🇳, 🇸🇬, 🇯🇵)"
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
