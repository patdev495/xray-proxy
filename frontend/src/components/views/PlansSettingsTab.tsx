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
  QrCode,
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
import { VIETQR_BANKS } from '../../constants/banks';
import { PlanModal } from '../plans/PlanModal';
import { RegionsSection } from '../regions/RegionsSection';

type SettingsSubTab = 'plans' | 'regions' | 'settings';

export const PlansSettingsTab: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('plans');
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);
  const [settings, setSettings] = useState<SystemSettings>({
    support_telegram_url: '',
    support_zalo_url: '',
    bank_id: 'MB',
    bank_account_number: '',
    bank_account_name: '',
    bank_transfer_prefix: '',
    sepay_api_key: '',
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
      setSettings({
        support_telegram_url: settingsData.support_telegram_url || '',
        support_zalo_url: settingsData.support_zalo_url || '',
        bank_id: settingsData.bank_id || 'MB',
        bank_account_number: settingsData.bank_account_number || '',
        bank_account_name: settingsData.bank_account_name || '',
        bank_transfer_prefix: settingsData.bank_transfer_prefix || '',
        sepay_api_key: settingsData.sepay_api_key || '',
      });
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
        message: 'VietQR bank account and support channels have been updated successfully.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Unable to save settings',
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
        title: 'Plan Status Updated',
        message: `${plan.name} is now ${!plan.is_active ? 'Active' : 'Disabled'}.`,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update Error',
        message: err instanceof Error ? err.message : 'Unable to update plan',
      });
    }
  };

  const handleDeletePlan = async (plan: PlanItem) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to delete plan "${plan.name}"?`)) return;
    try {
      await deleteAdminPlan(token, plan.id);
      showToast({
        type: 'success',
        title: 'Plan Deleted',
        message: `Plan ${plan.name} was successfully deleted.`,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Error',
        message: err instanceof Error ? err.message : 'Unable to delete plan',
      });
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Compact Subtabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Plans &amp; System Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage plans, server region allocations, and VietQR payment gateway settings.
          </p>
        </div>

        {/* Compact Subtab Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/90 text-xs self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('plans')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'plans'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Plans ({plans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('regions')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'regions'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Server Regions
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'settings'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            VietQR &amp; SePay Settings
          </button>
        </div>
      </div>

      {/* Subtab 1: Plans Catalog */}
      {activeSubTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Plans Catalog</h3>
            </div>
            <div className="flex items-center gap-2">
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
                Create Plan
              </Button>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-5">Plan Name</th>
                    <th className="py-3 px-5">Price</th>
                    <th className="py-3 px-5">Quota</th>
                    <th className="py-3 px-5">Validity</th>
                    <th className="py-3 px-5">Allowed Regions</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No plans found. Create the first plan!
                      </td>
                    </tr>
                  ) : (
                    plans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-5">
                          <span className="font-bold text-slate-900">{plan.name}</span>
                          <span className="text-slate-400 text-[11px] block font-mono">
                            Sort Order: {plan.sort_order}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono font-bold text-slate-900">
                          {formatVND(plan.price_vnd)}
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-700">
                          <span className="font-bold text-slate-900">
                            {plan.quota_gb > 0 ? `${plan.quota_gb} GB` : 'Unlimited'}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-700">
                          {plan.days_valid} days
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex flex-wrap items-center gap-1">
                            {plan.allowed_regions && plan.allowed_regions.length > 0 ? (
                              plan.allowed_regions.map((reg, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-medium"
                                >
                                  {reg}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">All regions</span>
                            )}
                          </div>
                        </td>
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
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleTogglePlanActive(plan)}
                              title={plan.is_active ? 'Disable' : 'Enable'}
                            >
                              <Power className={`w-3.5 h-3.5 ${plan.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenEditPlan(plan)}
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDeletePlan(plan)}
                              title="Delete"
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
        </div>
      )}

      {/* Subtab 2: Regions Management */}
      {activeSubTab === 'regions' && (
        <RegionsSection token={token} />
      )}

      {/* Subtab 3: System Settings & VietQR */}
      {activeSubTab === 'settings' && (
        <div className="max-w-4xl space-y-5">
          <Card>
            <div className="p-5 space-y-5">
              {/* VietQR Bank Account Settings */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">VietQR Receiving Bank Account</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Select a bank from the VietQR standard list and enter account details.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Bank</label>
                    <select
                      value={settings.bank_id || 'MB'}
                      onChange={(e) => {
                        const newBank = e.target.value;
                        const defaultPrefix = newBank === 'ICB' ? 'SEVQR' : settings.bank_transfer_prefix || '';
                        setSettings({ ...settings, bank_id: newBank, bank_transfer_prefix: defaultPrefix });
                      }}
                      className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                    >
                      {VIETQR_BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.code} - {b.shortName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Account Number"
                    placeholder="e.g. 0987654321"
                    value={settings.bank_account_number || ''}
                    onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                    required
                  />
                  <Input
                    label="Account Holder Name"
                    placeholder="e.g. JOHN DOE"
                    value={settings.bank_account_name || ''}
                    onChange={(e) => setSettings({ ...settings, bank_account_name: e.target.value.toUpperCase() })}
                    required
                  />
                  <Input
                    label="Transfer Prefix"
                    placeholder="e.g. SEVQR"
                    value={settings.bank_transfer_prefix || ''}
                    onChange={(e) => setSettings({ ...settings, bank_transfer_prefix: e.target.value })}
                    hint="Required 'SEVQR' for VietinBank (ICB)"
                  />
                </div>

                <div className="mt-3">
                  <Input
                    label="SePay API Key (Webhook)"
                    type="password"
                    placeholder="Enter SePay API Token..."
                    value={settings.sepay_api_key || ''}
                    onChange={(e) => setSettings({ ...settings, sepay_api_key: e.target.value })}
                    hint="Webhook URL: https://xray.peebot.shop/api/v1/payments/sepay-webhook"
                  />
                </div>

                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-500">Preview:</span>
                    <span className="font-semibold text-slate-800">
                      {settings.bank_id || 'MB'} • {settings.bank_account_number || '---'} • {settings.bank_account_name || '---'}
                    </span>
                  </div>
                  <span className="font-mono font-medium text-[11px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                    {settings.bank_transfer_prefix ? `${settings.bank_transfer_prefix} ORD-XXXXXX` : 'ORD-XXXXXX'}
                  </span>
                </div>
              </div>

              {/* Support Channels Settings */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">Customer Support Channels</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Support links displayed on the public storefront and customer portal.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Telegram Support URL"
                    placeholder="https://t.me/peebot_admin"
                    value={settings.support_telegram_url}
                    onChange={(e) => setSettings({ ...settings, support_telegram_url: e.target.value })}
                  />
                  <Input
                    label="Zalo Support URL"
                    placeholder="https://zalo.me/0987654321"
                    value={settings.support_zalo_url}
                    onChange={(e) => setSettings({ ...settings, support_zalo_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                >
                  {isSavingSettings ? 'Saving...' : 'Save All Settings'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

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

export default PlansSettingsTab;
