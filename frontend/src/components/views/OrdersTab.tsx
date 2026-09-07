import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  Check,
  User as UserIcon,
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
      showToast({ type: 'error', title: 'Lỗi tải đơn hàng', message: msg });
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
      `Xác nhận thanh toán thủ công cho đơn hàng "${order.code}" (Số tiền: ${order.amount_vnd.toLocaleString('vi-VN')} đ)?\nHệ thống sẽ cấp phát node và kích hoạt Subscription ngay lập tức.`
    );
    if (!confirmed) return;

    setConfirmingId(order.id);
    try {
      const updated = await confirmAdminOrder(token, order.id);
      showToast({
        type: 'success',
        title: 'Đã kích hoạt đơn hàng',
        message: `Đơn ${updated.code} đã được kích hoạt thành công (Subscription ID: ${updated.subscription_id}).`,
      });
      await loadOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xác nhận thất bại';
      showToast({ type: 'error', title: 'Lỗi xác nhận', message: msg });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Quản lý Đơn hàng (Orders &amp; Billing)</h2>
            <Badge variant="indigo" size="sm">SePay Webhook</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi đối soát thanh toán VietQR, trạng thái kích hoạt và hỗ trợ duyệt thủ công đơn hàng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadOrders}
            disabled={isLoading}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs w-fit">
          {(['ALL', 'PENDING', 'PAID', 'EXPIRED'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === f
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f === 'ALL'
                ? 'Tất cả'
                : f === 'PENDING'
                ? 'Chờ thanh toán'
                : f === 'PAID'
                ? 'Đã thanh toán'
                : 'Hết hạn'}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo mã, user, gói..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Mã đơn hàng</th>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Gói cước</th>
                <th className="py-3 px-4">Số tiền</th>
                <th className="py-3 px-4">Khu vực</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Thời gian tạo</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
                    <span>Đang tải danh sách đơn hàng...</span>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không có đơn hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isPaid = order.status === 'PAID';
                  const isPending = order.status === 'PENDING';
                  const isConfirming = confirmingId === order.id;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {order.code}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-800">
                            {order.username || `User #${order.user_id}`}
                          </span>
                        </div>
                      </td>

                      {/* Plan Name */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {order.plan_name}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {order.amount_vnd.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Region */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {order.region}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={isPaid ? 'emerald' : isPending ? 'amber' : 'slate'}
                          size="sm"
                          dot={true}
                          pulseDot={isPending}
                        >
                          {isPaid
                            ? 'Đã thanh toán'
                            : isPending
                            ? 'Chờ quét mã'
                            : order.status === 'EXPIRED'
                            ? 'Hết hạn'
                            : 'Đã hủy'}
                        </Badge>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(order.created_at).toLocaleString('vi-VN')}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isPaid ? (
                          <div className="inline-flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sub #{order.subscription_id}</span>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleManualConfirm(order)}
                            disabled={isConfirming}
                            isLoading={isConfirming}
                            className="text-xs font-semibold"
                            leftIcon={<Check className="w-3 h-3 text-emerald-600" />}
                          >
                            Xác nhận duyệt
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
