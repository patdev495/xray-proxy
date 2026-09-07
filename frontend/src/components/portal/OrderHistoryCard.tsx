import React from 'react';
import { ExternalLink, Receipt, RotateCw, XCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { parseUtcDate } from '../../utils/date';
import type { Order } from '../../types/order';

interface OrderHistoryCardProps {
  orders: Order[];
  isLoadingOrders: boolean;
  onRefresh: () => void;
  onCancelOrder: (orderId: number) => void;
  cancellingOrderId: number | null;
  onSelectCheckoutOrder: (order: Order) => void;
  onNavigate?: (path: string) => void;
  now: Date;
}

export const OrderHistoryCard: React.FC<OrderHistoryCardProps> = ({
  orders,
  isLoadingOrders,
  onRefresh,
  onCancelOrder,
  cancellingOrderId,
  onSelectCheckoutOrder,
  onNavigate,
  now,
}) => {
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (iso: string) => {
    return parseUtcDate(iso).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getPendingRemainingTime = (order: Order) => {
    const expiresAt = parseUtcDate(order.expires_at);
    const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getEffectiveStatus = (o: Order) => {
    if (o.status === 'PENDING') {
      const isStillValid = parseUtcDate(o.expires_at).getTime() > now.getTime();
      if (!isStillValid) return 'EXPIRED';
    }
    return o.status;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="emerald" size="sm" dot>Đã thanh toán</Badge>;
      case 'PENDING':
        return <Badge variant="amber" size="sm" dot pulseDot>Chờ thanh toán</Badge>;
      case 'CANCELLED':
        return <Badge variant="slate" size="sm">Đã hủy</Badge>;
      case 'EXPIRED':
        return <Badge variant="rose" size="sm">Đã hết hạn</Badge>;
      default:
        return <Badge variant="slate" size="sm">{status}</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden border border-slate-200/90 shadow-xs">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">
            Lịch sử đơn hàng ({orders.length})
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          leftIcon={<RotateCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          Làm mới
        </Button>
      </div>

      <div className="overflow-x-auto">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Bạn chưa có đơn hàng nào. Hãy ghé cửa hàng để chọn gói cước phù hợp!
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã đơn</th>
                <th className="py-3 px-4">Gói cước</th>
                <th className="py-3 px-4">Khu vực</th>
                <th className="py-3 px-4">Số tiền</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {orders.map((o) => {
                const isPendingValid = o.status === 'PENDING' && parseUtcDate(o.expires_at).getTime() > now.getTime();
                const effectiveStatus = getEffectiveStatus(o);
                return (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{o.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{o.plan_name}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-semibold text-[11px]">
                        {o.region}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {formatVND(o.amount_vnd)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{formatDate(o.created_at)}</td>
                    <td className="py-3 px-4">{getStatusBadge(effectiveStatus)}</td>
                    <td className="py-3 px-4 text-right">
                      {isPendingValid ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onSelectCheckoutOrder(o)}
                            className="text-xs py-1 px-2.5 h-auto bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            Thanh toán ({getPendingRemainingTime(o)})
                          </Button>
                          <button
                            onClick={() => onCancelOrder(o.id)}
                            disabled={cancellingOrderId === o.id}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Hủy đơn"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : effectiveStatus === 'EXPIRED' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (onNavigate) onNavigate('/');
                            else window.location.href = '/';
                          }}
                          className="text-xs py-1 px-2.5 h-auto text-slate-600 hover:text-slate-900 border-slate-200"
                        >
                          Đặt lại đơn
                        </Button>
                      ) : o.status === 'PAID' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onSelectCheckoutOrder(o)}
                          leftIcon={<ExternalLink className="w-3 h-3" />}
                          className="text-xs py-1 px-2.5 h-auto text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                        >
                          Lấy link gói
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-300">---</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
};
