import React, { useEffect, useState, useCallback } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Power,
  RefreshCw,
  Save,
  MessageCircle,
  Edit2,
  CreditCard,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAdminPlans,
  updateAdminPlan,
  deleteAdminPlan,
  fetchAdminSettings,
  updateAdminSettings,
} from '../../services/apiClient';
import type { PlanItem, SystemSettings } from '../../types/plan';
import { PlanModal } from '../plans/PlanModal';
import { RegionsSection } from '../regions/RegionsSection';

export const PlansSettingsTab: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);
  const [settings, setSettings] = useState<SystemSettings>({
    support_telegram_url: '',
    support_zalo_url: '',
    bank_id: 'MB',
    bank_account_number: '',
    bank_account_name: '',
  });
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Plan Modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoadingPlans(true);
      const [plansData, settingsData] = await Promise.all([
        fetchAdminPlans(token),
        fetchAdminSettings(token),
      ]);
      setPlans(plansData);
      setSettings(settingsData);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Load Error',
        message: err instanceof Error ? err.message : 'Failed to load plans & settings',
      });
    } finally {
      setIsLoadingPlans(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle saving support channel URLs
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      setIsSavingSettings(true);
      const updated = await updateAdminSettings(token, settings);
      setSettings(updated);
      showToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Support channel links updated successfully.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Could not save settings',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: PlanItem) => {
    setEditingPlan(plan);
    setIsPlanModalOpen(true);
  };

  const handleTogglePlanActive = async (plan: PlanItem) => {
    if (!token) return;
    try {
      await updateAdminPlan(token, plan.id, { is_active: !plan.is_active });
      showToast({
        type: 'info',
        title: 'Plan Status Changed',
        message: `${plan.name} is now ${!plan.is_active ? 'Active' : 'Disabled'}.`,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update Error',
        message: err instanceof Error ? err.message : 'Failed to update plan status',
      });
    }
  };

  const handleDeletePlan = async (plan: PlanItem) => {
    if (!token) return;
    if (!window.confirm(`Delete plan "${plan.name}"?`)) return;
    try {
      await deleteAdminPlan(token, plan.id);
      showToast({
        type: 'success',
        title: 'Plan Deleted',
        message: `Plan ${plan.name} deleted.`,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Error',
        message: err instanceof Error ? err.message : 'Failed to delete plan',
      });
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Plans &amp; Support Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure customer pricing packages, traffic quotas, regions, and support channels.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingPlans ? 'animate-spin' : ''}`} />}
            onClick={loadData}
            disabled={isLoadingPlans}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreatePlan}
          >
            Add New Plan
          </Button>
        </div>
      </div>

      {/* System Settings (VietQR Bank & Support Channels) */}
      <Card>
        <div className="p-5 space-y-5">
          {/* VietQR Bank Account Settings */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Cấu hình tài khoản nhận tiền VietQR</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Thông tin tài khoản ngân hàng thụ hưởng dùng để sinh mã VietQR thanh toán cho khách hàng.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Mã ngân hàng (Bank ID)"
                placeholder="VD: MB, VCB, ACB, TPB, VPB"
                value={settings.bank_id || ''}
                onChange={(e) => setSettings({ ...settings, bank_id: e.target.value.toUpperCase() })}
                hint="Mã ngân hàng chuẩn VietQR"
              />
              <Input
                label="Số tài khoản ngân hàng"
                placeholder="VD: 0987654321"
                value={settings.bank_account_number || ''}
                onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                hint="Số tài khoản nhận tiền"
              />
              <Input
                label="Tên chủ tài khoản"
                placeholder="VD: NGUYEN VAN A"
                value={settings.bank_account_name || ''}
                onChange={(e) => setSettings({ ...settings, bank_account_name: e.target.value.toUpperCase() })}
                hint="Tên in hoa không dấu"
              />
            </div>
          </div>

          {/* Support Channels Settings */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Kênh hỗ trợ khách hàng</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Liên kết hỗ trợ hiển thị trên trang chủ công khai và portal khách hàng.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Telegram Support URL"
                placeholder="https://t.me/peebot_admin"
                value={settings.support_telegram_url}
                onChange={(e) => setSettings({ ...settings, support_telegram_url: e.target.value })}
                hint="Link nhóm hoặc chat Telegram"
              />
              <Input
                label="Zalo Support URL"
                placeholder="https://zalo.me/0987654321"
                value={settings.support_zalo_url}
                onChange={(e) => setSettings({ ...settings, support_zalo_url: e.target.value })}
                hint="Link liên hệ hoặc nhóm Zalo"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? 'Đang lưu...' : 'Lưu toàn bộ cài đặt'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Plans Catalog Table Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-5">Plan Name</th>
                <th className="py-3 px-5">Price (VND)</th>
                <th className="py-3 px-5">Data Quota</th>
                <th className="py-3 px-5">Validity</th>
                <th className="py-3 px-5">Allowed Regions</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingPlans ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading plans catalog...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No plans created yet</p>
                    <p className="text-xs text-slate-400 mt-1">Create subscription packages for customers to purchase.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={handleOpenCreatePlan}
                    >
                      Create First Plan
                    </Button>
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{plan.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          #{plan.sort_order}
                        </span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-4 px-5 font-semibold text-slate-900 font-mono">
                      {formatVND(plan.price_vnd)}
                    </td>

                    {/* Quota */}
                    <td className="py-4 px-5 font-mono text-slate-700">
                      <span className="font-bold text-slate-900">{plan.quota_gb} GB</span>
                      <span className="text-slate-400 text-[11px] block font-normal">
                        ({(plan.traffic_quota_bytes / (1024 ** 3)).toFixed(0)} GB total)
                      </span>
                    </td>

                    {/* Validity */}
                    <td className="py-4 px-5 font-mono text-slate-700">
                      {plan.days_valid} days
                    </td>

                    {/* Regions */}
                    <td className="py-4 px-5">
                      <div className="flex flex-wrap items-center gap-1">
                        {plan.allowed_regions && plan.allowed_regions.length > 0 ? (
                          plan.allowed_regions.map((reg, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-sm"
                            >
                              {reg}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">All regions</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      <Badge
                        variant={plan.is_active ? 'emerald' : 'slate'}
                        size="sm"
                        dot={true}
                        pulseDot={plan.is_active}
                      >
                        {plan.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleTogglePlanActive(plan)}
                          title={plan.is_active ? 'Disable Plan' : 'Enable Plan'}
                        >
                          <Power className={`w-3.5 h-3.5 ${plan.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditPlan(plan)}
                          title="Edit Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeletePlan(plan)}
                          title="Delete Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Managed Server Regions Section */}
      <RegionsSection token={token} />

      {/* Modal: Create / Edit Plan */}
      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        editingPlan={editingPlan}
        onSuccess={loadData}
        token={token}
        suggestedSortOrder={plans.length + 1}
      />
    </div>
  );
};
