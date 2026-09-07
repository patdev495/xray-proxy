import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  Layers,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  fetchPublicPlans,
  fetchPublicSettings,
  fetchRegionsStatus,
  createOrder,
} from '../../services/apiClient';
import type { PlanItem, SystemSettings } from '../../types/plan';
import type { RegionStatus } from '../../types/node';
import type { Order } from '../../types/order';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CheckoutModal } from './CheckoutModal';
import { StorePlanCard } from './StorePlanCard';

interface LandingStorePageProps {
  onNavigate: (path: string) => void;
}

export const LandingStorePage: React.FC<LandingStorePageProps> = ({ onNavigate }) => {
  const { user, token, logout } = useAuth();
  const { showToast } = useToast();

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [regions, setRegions] = useState<RegionStatus[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected region per plan ID: { [planId: number]: string }
  const [selectedRegions, setSelectedRegions] = useState<Record<number, string>>({});
  const [creatingPlanId, setCreatingPlanId] = useState<number | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  const loadStoreData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, regionsData, settingsData] = await Promise.all([
        fetchPublicPlans(),
        fetchRegionsStatus(),
        fetchPublicSettings(),
      ]);
      setPlans(plansData);
      setRegions(regionsData);
      setSettings(settingsData);

      // Default selected regions for each plan
      const initialSelected: Record<number, string> = {};
      plansData.forEach((p) => {
        if (p.allowed_regions && p.allowed_regions.length > 0) {
          const firstAvailable = p.allowed_regions.find((regCode) => {
            const r = regionsData.find((item) => item.code === regCode || item.location === regCode);
            return r && !r.is_sold_out;
          });
          initialSelected[p.id] = firstAvailable || p.allowed_regions[0];
        } else if (regionsData.length > 0) {
          const firstAvailable = regionsData.find((r) => !r.is_sold_out);
          initialSelected[p.id] = firstAvailable?.code || firstAvailable?.location || regionsData[0].location;
        }
      });
      setSelectedRegions(initialSelected);
    } catch {
      showToast({
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: 'Không thể tải danh sách gói cước. Vui lòng thử lại!',
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  const handleRegionChange = (planId: number, regionCode: string) => {
    setSelectedRegions((prev) => ({ ...prev, [planId]: regionCode }));
  };

  const handleBuyPlan = async (plan: PlanItem, cycle: 'MONTHLY' | 'DAILY' = 'MONTHLY', durationDays: number = 30) => {
    if (!token || !user) {
      showToast({
        type: 'info',
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập hoặc tạo tài khoản để mua gói.',
      });
      onNavigate('/login');
      return;
    }

    const region = selectedRegions[plan.id];
    if (!region) {
      showToast({
        type: 'error',
        title: 'Chưa chọn khu vực',
        message: 'Vui lòng chọn khu vực máy chủ trước khi thanh toán.',
      });
      return;
    }

    // Check capacity before calling backend
    const regStatus = regions.find((r) => r.code === region || r.location === region);
    if (regStatus && regStatus.is_sold_out) {
      showToast({
        type: 'error',
        title: 'Khu vực hết chỗ',
        message: `Khu vực ${region} hiện đã hết chỗ (Sold out). Vui lòng chọn khu vực khác.`,
      });
      return;
    }

    setCreatingPlanId(plan.id);
    try {
      const order = await createOrder(token, plan.id, region, cycle, durationDays);
      setActiveOrder(order);
      setIsCheckoutOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo đơn hàng thất bại';
      showToast({
        type: 'error',
        title: 'Tạo đơn hàng thất bại',
        message: msg,
      });
    } finally {
      setCreatingPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-slate-900 text-base">xray-proxy</span>
              <Badge variant="slate" size="sm">Store</Badge>
            </div>
            <p className="text-[11px] text-slate-400">VLESS-Reality 4G Zero-Rating Proxy</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Support Buttons */}
          {settings?.support_telegram_url && (
            <a
              href={settings.support_telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span>Telegram</span>
            </a>
          )}
          {settings?.support_zalo_url && (
            <a
              href={settings.support_zalo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <span>Zalo</span>
            </a>
          )}

          {/* User Nav */}
          {user ? (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate(user.role === 'ADMIN' ? '/admin' : '/portal')}
                className="text-xs"
              >
                {user.role === 'ADMIN' ? 'Admin Dashboard' : 'Customer Portal'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                title="Đăng xuất"
                leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-500" />}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/login')}
                className="text-xs"
              >
                Đăng nhập
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('/register')}
                className="text-xs"
              >
                Đăng ký
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-8 border-b border-slate-200/60 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/90 text-xs font-medium text-slate-700 shadow-xs">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>VLESS-Reality TLS 1.3 • SNI Zero-Rating 4G/5G</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Proxy Vượt Tường Lửa Tốc Độ Cao
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-500 leading-relaxed">
            Hạ tầng máy chủ chuyên dụng tối ưu độ trễ thấp, vượt qua bóp băng thông viễn thông (Viettel, VinaPhone, MobiFone). Kích hoạt ngay lập tức qua mã thanh toán VietQR tự động.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Băng thông Gigabit 1Gbps</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Bypass 4G Viettel / Vina / Mobi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tự động kích hoạt sau 3 giây</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Pricing Store Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Bảng Giá Gói Dịch Vụ</h2>
          <p className="text-xs text-slate-500">Lựa chọn gói cước phù hợp và khu vực máy chủ để kết nối</p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
            <span className="text-xs font-medium uppercase tracking-wider">Đang tải gói dịch vụ...</span>
          </div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">Chưa có gói cước mở bán</h3>
            <p className="text-xs text-slate-500">Hệ thống đang cập nhật các gói dịch vụ mới. Vui lòng quay lại sau.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <StorePlanCard
                key={plan.id}
                plan={plan}
                regions={regions}
                selectedRegion={selectedRegions[plan.id] || ''}
                onSelectRegion={handleRegionChange}
                onBuyPlan={handleBuyPlan}
                isBuying={creatingPlanId === plan.id}
                isLoggedIn={Boolean(user)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Support & Community Section */}
      <section className="border-t border-slate-200/80 bg-white py-8 px-4 sm:px-8 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <h4 className="text-sm font-bold text-slate-900">Cần hỗ trợ kỹ thuật hoặc cài đặt?</h4>
            <p className="text-xs text-slate-500">Đội ngũ kỹ thuật hỗ trợ 24/7 qua các kênh trực tuyến chính thức.</p>
          </div>
          <div className="flex items-center gap-3">
            {settings?.support_telegram_url && (
              <a
                href={settings.support_telegram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-sky-600" />
                <span>Kênh Telegram</span>
              </a>
            )}
            {settings?.support_zalo_url && (
              <a
                href={settings.support_zalo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Nhóm Zalo</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-slate-50 py-6 px-4 text-center text-xs text-slate-400">
        <p>© 2026 xray-proxy. High performance enterprise VLESS-Reality network.</p>
      </footer>

      {/* VietQR Checkout Modal */}
      <CheckoutModal
        order={activeOrder}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onPaymentSuccess={() => {
          showToast({
            type: 'success',
            title: 'Thanh toán thành công',
            message: 'Gói cước đã được kích hoạt thành công!',
          });
          setIsCheckoutOpen(false);
          onNavigate('/portal');
        }}
      />
    </div>
  );
};

export default LandingStorePage;
