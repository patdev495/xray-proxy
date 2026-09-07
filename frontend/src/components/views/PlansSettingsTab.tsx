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
        title: 'Cài đặt đã lưu',
        message: 'Thông tin tài khoản VietQR và kênh hỗ trợ đã được cập nhật thành công.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lưu thất bại',
        message: err instanceof Error ? err.message : 'Không thể lưu cài đặt',
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
        title: 'Trạng thái gói đã đổi',
        message: `${plan.name} hiện là ${!plan.is_active ? 'Hoạt động' : 'Tạm tắt'}.`,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi cập nhật',
        message: err instanceof Error ? err.message : 'Không thể cập nhật gói',
      });
    }
  };

  const handleDeletePlan = async (plan: PlanItem) => {
    if (!token) return;
    if (!window.confirm(`Bạn có chắc muốn xóa gói "${plan.name}"?`)) return;
    try {
      await deleteAdminPlan(token, plan.id);
      showToast({
        type: 'success',
        title: 'Đã xóa gói',
        message: `Gói ${plan.name} đã được xóa thành công.`,
      });
      await loadData();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi xóa gói',
        message: err instanceof Error ? err.message : 'Không thể xóa gói cước',
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
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Cấu hình Gói cước &amp; Hệ thống</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý gói dịch vụ, phân bổ khu vực máy chủ và cài đặt thanh toán VietQR.
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
            Gói cước ({plans.length})
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
            Khu vực máy chủ
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
            Cài đặt VietQR &amp; Hỗ trợ
          </button>
        </div>
      </div>

      {/* Subtab 1: Plans Catalog */}
      {activeSubTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Danh mục Gói cước</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingPlans ? 'animate-spin' : ''}`} />}
                onClick={loadData}
                disabled={isLoadingPlans}
              >
                Làm mới
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreatePlan}
              >
                Tạo gói mới
              </Button>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-5">Tên gói</th>
                    <th className="py-3 px-5">Giá</th>
                    <th className="py-3 px-5">Lưu lượng</th>
                    <th className="py-3 px-5">Thời hạn</th>
                    <th className="py-3 px-5">Khu vực áp dụng</th>
                    <th className="py-3 px-5">Trạng thái</th>
                    <th className="py-3 px-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Chưa có gói cước nào. Hãy tạo gói đầu tiên!
                      </td>
                    </tr>
                  ) : (
                    plans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-5">
                          <span className="font-bold text-slate-900">{plan.name}</span>
                          <span className="text-slate-400 text-[11px] block font-mono">
                            Thứ tự: {plan.sort_order}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono font-bold text-slate-900">
                          {formatVND(plan.price_vnd)}
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-700">
                          <span className="font-bold text-slate-900">
                            {plan.quota_gb > 0 ? `${plan.quota_gb} GB` : 'Không giới hạn'}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-700">
                          {plan.days_valid} ngày
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
                              <span className="text-slate-400 italic">Tất cả khu vực</span>
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
                            {plan.is_active ? 'Đang bán' : 'Tạm dừng'}
                          </Badge>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleTogglePlanActive(plan)}
                              title={plan.is_active ? 'Tạm tắt' : 'Kích hoạt'}
                            >
                              <Power className={`w-3.5 h-3.5 ${plan.is_active ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenEditPlan(plan)}
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDeletePlan(plan)}
                              title="Xóa gói"
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
                  <h3 className="text-sm font-bold text-slate-900">Cấu hình tài khoản nhận tiền VietQR</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Chọn ngân hàng từ danh sách chuẩn VietQR và nhập thông tin tài khoản thụ hưởng.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Select Bank Dropdown */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Ngân hàng thụ hưởng</label>
                    <select
                      value={settings.bank_id || 'MB'}
                      onChange={(e) => setSettings({ ...settings, bank_id: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                    >
                      {VIETQR_BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.code} - {b.shortName} ({b.name})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400">Chuẩn VietQR liên ngân hàng Napas247</p>
                  </div>

                  <Input
                    label="Số tài khoản ngân hàng"
                    placeholder="VD: 0987654321"
                    value={settings.bank_account_number || ''}
                    onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                    hint="Số tài khoản nhận tiền"
                    required
                  />

                  <Input
                    label="Tên chủ tài khoản"
                    placeholder="VD: NGUYEN VAN A"
                    value={settings.bank_account_name || ''}
                    onChange={(e) => setSettings({ ...settings, bank_account_name: e.target.value.toUpperCase() })}
                    hint="Viết hoa không dấu"
                    required
                  />
                </div>

                {/* Live Preview Box */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-500">Mẫu nhận tiền:</span>
                    <span className="font-semibold text-slate-800">
                      {settings.bank_id || 'MB'} • {settings.bank_account_number || '(Chưa nhập)'} • {settings.bank_account_name || '(Chưa nhập)'}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium">VietQR tự động gán mã ORD-XXXXXX</span>
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
                    hint="Link chat hoặc nhóm Telegram"
                  />
                  <Input
                    label="Zalo Support URL"
                    placeholder="https://zalo.me/0987654321"
                    value={settings.support_zalo_url}
                    onChange={(e) => setSettings({ ...settings, support_zalo_url: e.target.value })}
                    hint="Link chat hoặc nhóm Zalo"
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
                  {isSavingSettings ? 'Đang lưu...' : 'Lưu toàn bộ cài đặt'}
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
