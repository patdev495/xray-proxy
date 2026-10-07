import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatVnd } from '../../utils/date';

type SettingsSubTab = 'plans' | 'regions' | 'settings';

export const PlansSettingsTab: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { i18n, t } = useTranslation();

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
        title: t('management.fetchError'),
        message: err instanceof Error ? err.message : 'Failed to load plans & settings',
      });
    } finally {
      setIsLoadingPlans(false);
    }
  }, [token, showToast, t]);

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
        title: t('management.settingsSaved'),
        message: t('management.settingsSavedMessage'),
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: t('management.saveFailed'),
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
        title: t('management.planStatusUpdated'),
        message: t('management.planStatusMessage', { name: plan.name, status: !plan.is_active ? t('management.active') : t('management.disabled') }),
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: t('management.updateError'),
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
        title: t('management.planDeleted'),
        message: t('management.planDeletedMessage', { name: plan.name }),
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: t('management.deleteFailed'),
        message: err instanceof Error ? err.message : 'Unable to delete plan',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-100/60 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{t('management.plansGatewayTitle')}</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {t('management.plansGatewayDescription')}
          </p>
        </div>

        {/* Compact Subtab Pills */}
        <div className="flex items-center gap-1 p-1 bg-white/90 rounded-2xl border border-slate-200/80 text-xs self-start md:self-auto shadow-2xs backdrop-blur-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('plans')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeSubTab === 'plans'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('management.plansTab', { count: plans.length })}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('regions')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeSubTab === 'regions'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('management.regionsTab')}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeSubTab === 'settings'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            VietQR &amp; SePay
          </button>
        </div>
      </div>

      {/* Subtab 1: Plans Catalog */}
      {activeSubTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">{t('management.plansCatalog')}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isLoadingPlans ? 'animate-spin' : ''}`} />}
                onClick={loadData}
                disabled={isLoadingPlans}
                className="font-bold text-xs"
              >
                {t('common.refresh')}
              </Button>
              <Button
                variant="gradient"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreatePlan}
                className="font-bold text-xs shadow-md shadow-indigo-500/20"
              >
                {t('management.createPlan')}
              </Button>
            </div>
          </div>

          <Card className="rounded-3xl border border-indigo-100/70 shadow-md shadow-indigo-950/5 bg-white/95 backdrop-blur-xl overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100/90 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-5">{t('management.planName')}</th><th className="py-3.5 px-5">{t('management.price')}</th><th className="py-3.5 px-5">{t('management.quota')}</th><th className="py-3.5 px-5">{t('management.validity')}</th><th className="py-3.5 px-5">{t('management.allowedRegions')}</th><th className="py-3.5 px-5">{t('portal.status')}</th><th className="py-3.5 px-5 text-right">{t('portal.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/70">
                  {plans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400 font-medium">
                        {t('management.noPlans')}
                      </td>
                    </tr>
                  ) : (
                    plans.map((p) => (
                      <tr key={p.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="py-3.5 px-5">
                          <span className="font-bold text-slate-900 block text-sm">{p.name}</span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            Sort: {p.sort_order ?? 0} &bull; ID #{p.id}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatVnd(p.price_vnd, i18n.language)}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-mono font-semibold text-slate-700">
                          {p.quota_gb > 0 ? `${p.quota_gb} GB` : t('store.unlimited')}
                        </td>
                        <td className="py-3.5 px-5 text-slate-700 font-medium">
                          {t('store.days', { count: p.days_valid })}
                        </td>
                        <td className="py-3.5 px-5">
                          {p.allowed_regions && p.allowed_regions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.allowed_regions.map((reg) => (
                                <span
                                  key={reg}
                                  className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-mono font-bold border border-indigo-100"
                                >
                                  {reg}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">{t('management.allRegions')}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <Badge
                            variant={p.is_active ? 'emerald' : 'slate'}
                            size="sm"
                            dot={true}
                            pulseDot={p.is_active}
                          >
                            {p.is_active ? t('management.active') : t('management.disabled')}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenEditPlan(p)}
                              className="font-bold text-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="hidden sm:inline">{t('management.edit')}</span>
                            </Button>
                            <button
                              onClick={() => handleTogglePlanActive(p)}
                              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                                p.is_active
                                  ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                  : 'border-slate-200 text-slate-400 hover:bg-slate-100'
                              }`}
                              title={p.is_active ? t('management.disablePlan') : t('management.enablePlan')}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePlan(p)}
                              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                              title={t('management.deletePlan')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* Subtab 2: Server Regions Allocation */}
      {activeSubTab === 'regions' && <RegionsSection token={token} />}

      {/* Subtab 3: VietQR & SePay Gateway Settings */}
      {activeSubTab === 'settings' && (
        <div className="space-y-4">
          <Card className="rounded-3xl border border-indigo-100/70 shadow-md shadow-indigo-950/5 bg-white/95 backdrop-blur-xl p-6 sm:p-8">
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">{t('management.settingsBankTitle')}</h3>
                </div>
                <p className="text-xs text-slate-500 mb-5 font-medium">
                  {t('management.settingsBankDescription')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">{t('management.bankPartner')}</label>
                    <select
                      value={settings.bank_id || 'MB'}
                      onChange={(e) => {
                        const newBank = e.target.value;
                        const defaultPrefix = newBank === 'ICB' ? 'SEVQR' : settings.bank_transfer_prefix || '';
                        setSettings({ ...settings, bank_id: newBank, bank_transfer_prefix: defaultPrefix });
                      }}
                      className="w-full text-xs rounded-xl border border-slate-200/90 px-3.5 py-2.5 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs font-semibold"
                    >
                      {VIETQR_BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.code} - {b.shortName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label={t('management.accountNumber')}
                    placeholder={t('management.exampleAccountNumber')}
                    value={settings.bank_account_number || ''}
                    onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                  />
                  <Input
                    label={t('management.accountHolder')}
                    placeholder={t('management.exampleAccountHolder')}
                    value={settings.bank_account_name || ''}
                    onChange={(e) => setSettings({ ...settings, bank_account_name: e.target.value.toUpperCase() })}
                  />
                  <Input
                    label={t('management.transferPrefix')}
                    placeholder={t('management.exampleTransferPrefix')}
                    value={settings.bank_transfer_prefix || ''}
                    onChange={(e) => setSettings({ ...settings, bank_transfer_prefix: e.target.value })}
                    hint={t('management.transferPrefixHint')}
                  />
                </div>

                <div className="mt-4">
                  <Input
                    label={t('management.sepayApiKey')}
                    type="password"
                    placeholder={t('management.sepayApiKeyPlaceholder')}
                    value={settings.sepay_api_key || ''}
                    onChange={(e) => setSettings({ ...settings, sepay_api_key: e.target.value })}
                    hint={`${t('management.webhookUrl')}: https://xray.peebot.shop/api/v1/payments/sepay-webhook`}
                  />
                </div>

                <div className="mt-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span className="text-slate-500 font-medium">{t('management.qrProfile')}:</span>
                    <span className="font-bold text-slate-900">
                      {settings.bank_id || 'MB'} • {settings.bank_account_number || '---'} • {settings.bank_account_name || '---'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-xs text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                    {settings.bank_transfer_prefix ? `${settings.bank_transfer_prefix} ORD-XXXXXX` : 'ORD-XXXXXX'}
                  </span>
                </div>
              </div>

              {/* Support Channels Settings */}
              <div className="border-t border-slate-100/90 pt-5">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">{t('management.supportChannels')}</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4 font-medium">
                  {t('management.supportChannelsDescription')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('management.telegramSupport')}
                    placeholder="https://t.me/peebot_admin"
                    value={settings.support_telegram_url}
                    onChange={(e) => setSettings({ ...settings, support_telegram_url: e.target.value })}
                  />
                  <Input
                    label={t('management.zaloSupport')}
                    placeholder="https://zalo.me/0987654321"
                    value={settings.support_zalo_url}
                    onChange={(e) => setSettings({ ...settings, support_zalo_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  type="button"
                  variant="gradient"
                  size="md"
                  leftIcon={<Save className="w-4 h-4" />}
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="font-bold text-xs shadow-md shadow-indigo-500/20"
                >
                  {isSavingSettings ? t('common.saving') : t('management.saveConfiguration')}
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
