import React, { useState, useEffect } from 'react';
import { Save, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { createAdminPlan, updateAdminPlan, fetchAdminRegions } from '../../services/apiClient';
import type { PlanItem } from '../../types/plan';
import type { RegionItem } from '../../types/region';

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
  const [enableDaily, setEnableDaily] = useState<boolean>(false);
  const [priceDailyVnd, setPriceDailyVnd] = useState<string>('3000');
  const [quotaDailyGb, setQuotaDailyGb] = useState<string>('6');
  const [availableRegions, setAvailableRegions] = useState<RegionItem[]>([]);
  const [selectedRegionCodes, setSelectedRegionCodes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && token) {
      fetchAdminRegions(token)
        .then((regs) => {
          const active = regs.filter((r) => r.is_active);
          setAvailableRegions(active);
        })
        .catch(() => {});
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (editingPlan) {
      setPlanName(editingPlan.name);
      setPlanPrice(String(editingPlan.price_vnd));
      setPlanQuotaGb(String(editingPlan.quota_gb));
      setPlanDaysValid(String(editingPlan.days_valid));
      setEnableDaily(!!editingPlan.enable_daily);
      setPriceDailyVnd(editingPlan.price_daily_vnd != null ? String(editingPlan.price_daily_vnd) : '3000');
      setQuotaDailyGb(editingPlan.quota_daily_gb != null ? String(editingPlan.quota_daily_gb) : '6');
      setSelectedRegionCodes(editingPlan.allowed_regions || []);
    } else {
      setPlanName('');
      setPlanPrice('30000');
      setPlanQuotaGb('100');
      setPlanDaysValid('30');
      setEnableDaily(false);
      setPriceDailyVnd('3000');
      setQuotaDailyGb('6');
      // Default: all available active regions selected
      setSelectedRegionCodes([]);
    }
  }, [editingPlan, isOpen]);

  const toggleRegion = (code: string) => {
    setSelectedRegionCodes((prev) => {
      // If previously empty (means all), initialize with all except this one
      if (prev.length === 0 && availableRegions.length > 0) {
        return availableRegions.map((r) => r.code).filter((c) => c !== code);
      }
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      } else {
        const next = [...prev, code];
        // If all are selected, we can represent it as empty array (all allowed)
        if (next.length === availableRegions.length) {
          return [];
        }
        return next;
      }
    });
  };

  const selectAllRegions = () => {
    setSelectedRegionCodes([]); // Empty array = allow all regions
  };

  const isAllSelected = selectedRegionCodes.length === 0 || selectedRegionCodes.length === availableRegions.length;

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

    try {
      setIsSubmitting(true);
      const payload: any = {
        name: planName.trim(),
        price_vnd: parseInt(planPrice, 10) || 0,
        quota_gb: parseInt(planQuotaGb, 10) || 50,
        days_valid: parseInt(planDaysValid, 10) || 30,
        allowed_regions: selectedRegionCodes,
        sort_order: editingPlan ? editingPlan.sort_order : suggestedSortOrder,
        enable_daily: enableDaily,
        price_daily_vnd: enableDaily ? (parseInt(priceDailyVnd, 10) || 0) : null,
        quota_daily_gb: enableDaily ? (parseFloat(quotaDailyGb) || 0) : null,
      };

      if (editingPlan) {
        await updateAdminPlan(token, editingPlan.id, payload);
        showToast({
          type: 'success',
          title: 'Plan Updated',
          message: `Plan "${planName}" was updated successfully.`,
        });
      } else {
        await createAdminPlan(token, payload);
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

        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">
            Cấu hình gói chính (Mặc định theo tháng)
          </span>
          <div className="grid grid-cols-3 gap-3">
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
            <Input
              label="Validity (Days)"
              type="number"
              min="1"
              placeholder="30"
              value={planDaysValid}
              onChange={(e) => setPlanDaysValid(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Daily Test Tier Composite Option */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableDaily}
                  onChange={(e) => setEnableDaily(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                />
                Kích hoạt gói ngày dùng thử (24 Giờ)
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5 ml-5.5">
                Cho phép khách mua trải nghiệm 1 ngày. Hết 24h thu hồi node ngay (0 grace period).
              </p>
            </div>
          </div>

          {enableDaily && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
              <Input
                label="Giá 1 ngày (VNĐ)"
                type="number"
                min="0"
                step="500"
                placeholder="3000"
                value={priceDailyVnd}
                onChange={(e) => setPriceDailyVnd(e.target.value)}
                required={enableDaily}
                hint="Ví dụ: 3000"
              />
              <Input
                label="Dung lượng 1 ngày (GB)"
                type="number"
                min="0.1"
                step="0.5"
                placeholder="6"
                value={quotaDailyGb}
                onChange={(e) => setQuotaDailyGb(e.target.value)}
                required={enableDaily}
                hint="Ví dụ: 6 GB / 24h"
              />
            </div>
          )}
        </div>

        {/* Region Checkboxes */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Allowed Server Regions
              </label>
              <p className="text-[11px] text-slate-500">
                {isAllSelected
                  ? 'All active regions are available for this plan'
                  : `Restricted to ${selectedRegionCodes.length} selected region(s)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllRegions}
                className="text-[11px] text-slate-600 hover:text-slate-900 font-medium underline"
              >
                Select All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {availableRegions.map((region) => {
              const isChecked = isAllSelected || selectedRegionCodes.includes(region.code);
              return (
                <label
                  key={region.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                    isChecked
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRegion(region.code)}
                      className="sr-only"
                    />
                    <span className="text-base">{region.flag}</span>
                    <span className="font-medium">{region.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono px-1 py-0.5 rounded ${
                      isChecked ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {region.code}
                    </span>
                    {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </label>
              );
            })}
          </div>
          {availableRegions.length === 0 && (
            <p className="text-xs text-slate-400 italic">No active regions found.</p>
          )}
        </div>

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
