import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  Check,
  Search,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { fetchAdminOrders, confirmAdminOrder } from '../../services/apiClient';
import type { Order } from '../../types/order';

type StatusFilter = 'ALL' | 'PENDING' | 'PAID' | 'EXPIRED';

export const OrdersTab: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await fetchAdminOrders(token, statusFilter);
      setOrders(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load orders';
      showToast({ type: 'error', title: 'Failed to load orders', message: msg });
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, showToast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleManualConfirm = async (order: Order) => {
    if (!token) return;
    const confirmed = window.confirm(
      `Manually confirm payment for order "${order.code}" (Amount: ${order.amount_vnd.toLocaleString('vi-VN')} VND)?\nThe system will allocate a node and activate the Subscription immediately.`
    );
    if (!confirmed) return;

    setConfirmingId(order.id);
    try {
      const updated = await confirmAdminOrder(token, order.id);
      showToast({
        type: 'success',
        title: 'Order Activated',
        message: `Order ${updated.code} has been successfully activated (Subscription ID: ${updated.subscription_id}).`,
      });
      await loadOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Confirmation failed';
      showToast({ type: 'error', title: 'Confirmation error', message: msg });
    } finally {
      setConfirmingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      o.code.toLowerCase().includes(q) ||
      (o.username && o.username.toLowerCase().includes(q)) ||
      o.plan_name.toLowerCase().includes(q) ||
      o.region.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Order Management &amp; VietQR Billing</h2>
            <Badge variant="emerald" size="sm" dot={true}>SePay Webhook Active</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Track VietQR payment reconciliation, automated webhook provisoning, and manual supervisor approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadOrders}
            disabled={isLoading}
            className="font-bold text-xs"
          >
            Refresh Orders
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1 p-1 bg-white/90 rounded-2xl border border-slate-200/80 text-xs w-fit shadow-2xs backdrop-blur-xs">
          {(['ALL', 'PENDING', 'PAID', 'EXPIRED'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                statusFilter === f
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f === 'ALL'
                ? 'All Orders'
                : f === 'PENDING'
                ? 'Pending Payment'
                : f === 'PAID'
                ? 'Paid & Active'
                : 'Expired'}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search code, user, plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-white/90 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card className="rounded-3xl border border-indigo-100/70 shadow-md shadow-indigo-950/5 bg-white/95 backdrop-blur-xl overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100/90 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">Order Code</th>
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-5">Plan</th>
                <th className="py-3.5 px-5">Amount</th>
                <th className="py-3.5 px-5">Region</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Created At</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Querying transaction ledger...</span>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-medium">
                    No orders match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isPaid = order.status === 'PAID';
                  const isPending = order.status === 'PENDING';
                  const isConfirming = confirmingId === order.id;

                  return (
                    <tr key={order.id} className="hover:bg-indigo-50/40 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                        {order.code}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
                            {order.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="font-bold text-slate-800">
                            {order.username || `User #${order.user_id}`}
                          </span>
                        </div>
                      </td>

                      {/* Plan Name */}
                      <td className="py-3.5 px-5 font-bold text-slate-800">
                        {order.plan_name}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-5 font-mono font-black text-slate-900">
                        {order.amount_vnd.toLocaleString('vi-VN')} VND
                      </td>

                      {/* Region */}
                      <td className="py-3.5 px-5">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px] border border-indigo-100">
                          {order.region}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-5">
                        <Badge
                          variant={isPaid ? 'emerald' : isPending ? 'amber' : 'slate'}
                          size="sm"
                          dot={true}
                          pulseDot={isPending}
                        >
                          {isPaid
                            ? 'Paid'
                            : isPending
                            ? 'Pending'
                            : order.status === 'EXPIRED'
                            ? 'Expired'
                            : 'Cancelled'}
                        </Badge>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-5 text-slate-400 font-mono text-[11px] font-medium">
                        {new Date(order.created_at).toLocaleString('en-GB')}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        {isPaid ? (
                          <div className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Sub #{order.subscription_id}</span>
                          </div>
                        ) : (
                          <Button
                            variant="gradient"
                            size="sm"
                            onClick={() => handleManualConfirm(order)}
                            disabled={isConfirming}
                            isLoading={isConfirming}
                            className="text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs"
                            leftIcon={<Check className="w-3.5 h-3.5 text-white" />}
                          >
                            Approve Order
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default OrdersTab;
