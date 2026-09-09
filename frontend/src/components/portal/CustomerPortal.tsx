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
  ShoppingBag,
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
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      setCancellingOrderId(orderId);
      await cancelMyOrder(token, orderId);
      showToast({
        type: 'success',
        title: 'Order Cancelled',
        message: 'The order has been successfully cancelled.',
      });
      await loadOrders();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: err instanceof Error ? err.message : 'Unable to cancel the order',
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
    <div className="min-h-screen bg-aurora-mesh text-slate-900 flex flex-col selection:bg-indigo-600 selection:text-white relative">
      {/* Ambient background glow dots */}
      <div className="absolute top-10 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-60 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Glass Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-white/60 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-slate-900 text-base sm:text-lg">
                xray<span className="text-indigo-600">-proxy</span>
              </span>
              <Badge variant="indigo" size="sm" dot={true}>Customer Portal</Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">VLESS-Reality 4G Network Command Center</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onNavigate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('/')}
              className="text-xs font-bold"
              leftIcon={<ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />}
            >
              Plan Store
            </Button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs text-xs text-slate-700">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 text-white flex items-center justify-center text-[10px] font-bold">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="font-bold font-mono text-slate-900">{user?.username}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-400" />}
            className="text-xs font-semibold hover:text-rose-600 hover:bg-rose-50"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Pending Order Sticky Banner */}
        {pendingOrder && (
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/10 animate-in fade-in backdrop-blur-md">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-amber-950 text-sm sm:text-base">Pending Payment</span>
                  <span className="font-mono font-black bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-lg text-xs border border-amber-300">
                    {pendingOrder.code}
                  </span>
                </div>
                <p className="text-amber-900 font-medium">
                  Plan <strong className="font-bold text-amber-950">{pendingOrder.plan_name}</strong> ({pendingOrder.region}) •{' '}
                  <strong className="font-mono text-emerald-700 font-black">{formatVND(pendingOrder.amount_vnd)}</strong> •{' '}
                  Payment deadline: <span className="font-mono font-black text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-md">{getPendingRemainingTime(pendingOrder)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelOrder(pendingOrder.id)}
                disabled={cancellingOrderId === pendingOrder.id}
                className="text-xs font-bold text-amber-900 hover:bg-amber-200/60"
              >
                {cancellingOrderId === pendingOrder.id ? 'Cancelling...' : 'Cancel Order'}
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={() => {
                  setActiveCheckoutOrder(pendingOrder);
                  setIsCheckoutModalOpen(true);
                }}
                leftIcon={<QrCode className="w-4 h-4" />}
                className="text-xs font-bold shadow-md shadow-amber-500/20 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white"
              >
                Scan VietQR
              </Button>
            </div>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/70 p-6 sm:p-8 shadow-md shadow-indigo-950/5 relative overflow-hidden">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 text-xs font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Customer Active Session
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Welcome back, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{user?.username}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
              Manage your dedicated VLESS-Reality subscriptions, copy import configurations, switch cluster nodes, and renew instantly.
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
          <Card className="p-5 space-y-4 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100/90 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Account Profile</h2>
              </div>
              <Badge variant="indigo" size="sm">{user?.role}</Badge>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400 font-medium">Username:</span>
                <span className="font-mono font-bold text-slate-900">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400 font-medium">Email:</span>
                <span className="font-semibold text-slate-800">{user?.email || 'Not configured'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400 font-medium">Auth Provider:</span>
                <span className="capitalize font-semibold text-indigo-600">
                  {user?.oauth_provider ? `${user.oauth_provider} OAuth` : 'Password'}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 2: Active Service */}
          <Card className="p-5 space-y-4 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100/90 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Proxy Fleet</h2>
              </div>
              <Badge variant="amber" size="sm">Self-Service</Badge>
            </div>
            <div className="space-y-2 text-xs text-slate-500">
              <p className="leading-relaxed">All subscriptions auto-provision and sync traffic metrics in real-time across regional VPS clusters.</p>
              {onNavigate && (
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={() => onNavigate('/')}
                  className="w-full mt-2 text-xs font-bold"
                >
                  Buy Another Plan
                </Button>
              )}
            </div>
          </Card>

          {/* Card 3: Security Status */}
          <Card className="p-5 space-y-4 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100/90 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Security &amp; Keys</h2>
              </div>
              <Badge variant="emerald" size="sm" dot={true}>Guaranteed</Badge>
            </div>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Encrypted TLS 1.3 Reality</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tokens are verified via cryptographically signed hashes to prevent credential sniffing.
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
