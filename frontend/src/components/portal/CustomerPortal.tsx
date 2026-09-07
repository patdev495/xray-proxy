import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  KeyRound,
  LogOut,
  QrCode,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { cancelMyOrder, fetchMyOrders, fetchMySubscriptions } from '../../services/apiClient';
import { parseUtcDate } from '../../utils/date';
import type { Order } from '../../types/order';
import type { SubscriptionItem } from '../../types/subscription';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CheckoutModal } from '../store/CheckoutModal';
import { MySubscriptions } from './MySubscriptions';
import { OrderHistoryCard } from './OrderHistoryCard';

interface CustomerPortalProps {
  onNavigate?: (path: string) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ onNavigate }) => {
  const { user, token, logout } = useAuth();
  const { showToast } = useToast();

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState<boolean>(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [activeCheckoutOrder, setActiveCheckoutOrder] = useState<Order | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  const loadSubscriptions = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoadingSubs(true);
      const data = await fetchMySubscriptions(token);
      setSubscriptions(data);
    } catch {
      // Silently catch
    } finally {
      setIsLoadingSubs(false);
    }
  }, [token]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoadingOrders(true);
      const data = await fetchMyOrders(token);
      setOrders(data);
    } catch {
      // Silently catch
    } finally {
      setIsLoadingOrders(false);
    }
  }, [token]);

  const refreshAll = useCallback(() => {
    loadSubscriptions();
    loadOrders();
  }, [loadSubscriptions, loadOrders]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 12000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Tick clock every second for countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCancelOrder = async (orderId: number) => {
    if (!token) return;
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này không?')) return;
    try {
      setCancellingOrderId(orderId);
      await cancelMyOrder(token, orderId);
      showToast({
        type: 'success',
        title: 'Đã hủy đơn hàng',
        message: 'Đơn hàng đã được hủy thành công.',
      });
      await loadOrders();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi hủy đơn',
        message: err instanceof Error ? err.message : 'Không thể hủy đơn hàng',
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Find active pending order with valid expiration
  const pendingOrder = orders.find((o) => {
    if (o.status !== 'PENDING') return false;
    const expiresAt = parseUtcDate(o.expires_at);
    return expiresAt.getTime() > now.getTime();
  });

  const getPendingRemainingTime = (order: Order) => {
    const expiresAt = parseUtcDate(order.expires_at);
    const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-slate-900 text-base">xray-proxy</span>
              <Badge variant="indigo" size="sm">Customer Portal</Badge>
            </div>
            <p className="text-[11px] text-slate-400">VLESS-Reality High Speed 4G Proxy</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onNavigate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/')}
              className="text-xs"
            >
              Cửa hàng gói cước
            </Button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
            <UserIcon className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium font-mono">{user?.username}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-500" />}
            className="text-xs"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Pending Order Sticky Banner */}
        {pendingOrder && (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-amber-900 text-sm">Đơn hàng đang chờ thanh toán</span>
                  <span className="font-mono font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded text-xs">
                    {pendingOrder.code}
                  </span>
                </div>
                <p className="text-amber-800">
                  Gói <strong className="font-semibold">{pendingOrder.plan_name}</strong> ({pendingOrder.region}) •{' '}
                  <strong className="font-mono text-emerald-700 font-bold">{formatVND(pendingOrder.amount_vnd)}</strong> •{' '}
                  Hạn thanh toán: <span className="font-mono font-bold text-amber-900 bg-amber-200/60 px-1.5 py-0.5 rounded">{getPendingRemainingTime(pendingOrder)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelOrder(pendingOrder.id)}
                disabled={cancellingOrderId === pendingOrder.id}
                className="text-xs text-amber-800 hover:bg-amber-100 hover:text-amber-900"
              >
                {cancellingOrderId === pendingOrder.id ? 'Đang hủy...' : 'Hủy đơn'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setActiveCheckoutOrder(pendingOrder);
                  setIsCheckoutModalOpen(true);
                }}
                leftIcon={<QrCode className="w-3.5 h-3.5" />}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs font-semibold"
              >
                Thanh toán ngay
              </Button>
            </div>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Account Active
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.username}
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Quản lý gói cước VLESS-Reality tốc độ cao, sao chép cấu hình app, đổi server linh hoạt và gia hạn tức thời.
            </p>
          </div>
        </div>

        {/* Subscriptions Section with Traffic, Countdown, QR & Actions */}
        <MySubscriptions
          subscriptions={subscriptions}
          isLoading={isLoadingSubs}
          onRefresh={loadSubscriptions}
          onRenewalOrderCreated={(order) => {
            setActiveCheckoutOrder(order);
            setIsCheckoutModalOpen(true);
            loadOrders();
          }}
          onNavigateStore={() => onNavigate && onNavigate('/')}
        />

        {/* Profile and Service Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Account Info */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-800">Account Details</h2>
              </div>
              <Badge variant="slate" size="sm">{user?.role}</Badge>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Username:</span>
                <span className="font-mono font-medium text-slate-800">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Email:</span>
                <span className="font-medium text-slate-800">{user?.email || 'Chưa thiết lập'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Đăng nhập:</span>
                <span className="capitalize font-medium text-slate-800">
                  {user?.oauth_provider ? `${user.oauth_provider} OAuth` : 'Mật khẩu'}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 2: Active Service */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-slate-800">Dịch vụ Proxy</h2>
              </div>
              <Badge variant="amber" size="sm">Self-Service</Badge>
            </div>
            <div className="space-y-2 text-xs text-slate-500">
              <p>Hệ thống tự động cấp phát gói cước và đồng bộ máy chủ ngay khi thanh toán thành công.</p>
              {onNavigate && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate('/')}
                  className="w-full mt-2 text-xs font-medium"
                >
                  Mua thêm gói cước
                </Button>
              )}
            </div>
          </Card>

          {/* Card 3: Security Status */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-800">Bảo mật &amp; Token</h2>
              </div>
              <Badge variant="emerald" size="sm" dot>An toàn</Badge>
            </div>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">Mã hóa phiên JWT &amp; VLESS Reality</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Mỗi kết nối được phân bổ độc lập trên các Node máy chủ chất lượng cao.
              </p>
            </div>
          </Card>
        </div>

        {/* Order History Section */}
        <OrderHistoryCard
          orders={orders}
          isLoadingOrders={isLoadingOrders}
          onRefresh={loadOrders}
          onCancelOrder={handleCancelOrder}
          cancellingOrderId={cancellingOrderId}
          onSelectCheckoutOrder={(order) => {
            setActiveCheckoutOrder(order);
            setIsCheckoutModalOpen(true);
          }}
          onNavigate={onNavigate}
          now={now}
        />
      </main>

      {/* Checkout / QR Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        order={activeCheckoutOrder}
        onPaymentSuccess={() => {
          refreshAll();
        }}
      />
    </div>
  );
};

export default CustomerPortal;
