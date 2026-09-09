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
    return parseUtcDate(iso).toLocaleString('en-GB', {
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
        return <Badge variant="emerald" size="sm" dot={true}>Paid &amp; Active</Badge>;
      case 'PENDING':
        return <Badge variant="amber" size="sm" dot={true} pulseDot={true}>Awaiting Payment</Badge>;
      case 'CANCELLED':
        return <Badge variant="slate" size="sm">Cancelled</Badge>;
      case 'EXPIRED':
        return <Badge variant="rose" size="sm">Expired</Badge>;
      default:
        return <Badge variant="slate" size="sm">{status}</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden border border-indigo-100/80 shadow-md shadow-indigo-950/5 rounded-3xl bg-white/95 backdrop-blur-xl">
      <div className="p-5 sm:p-6 border-b border-slate-100/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Order &amp; Invoicing History ({orders.length})
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Automatic VietQR transaction reconciliation</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          leftIcon={<RotateCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />}
          className="text-xs font-semibold"
        >
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        {orders.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400 font-medium">
            No order transactions found. Visit the Plan Store to rent bandwidth!
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
            <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Order Code</th>
                <th className="py-3 px-5">Package</th>
                <th className="py-3 px-5">Region</th>
                <th className="py-3 px-5">Amount</th>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {orders.map((o) => {
                const isPendingValid = o.status === 'PENDING' && parseUtcDate(o.expires_at).getTime() > now.getTime();
                const effectiveStatus = getEffectiveStatus(o);
                return (
                  <tr key={o.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-900">{o.code}</td>
                    <td className="py-3.5 px-5 font-bold text-slate-800">{o.plan_name}</td>
                    <td className="py-3.5 px-5">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono font-bold text-[11px]">
                        {o.region}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                      {formatVND(o.amount_vnd)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 text-[11px] font-medium">{formatDate(o.created_at)}</td>
                    <td className="py-3.5 px-5">{getStatusBadge(effectiveStatus)}</td>
                    <td className="py-3.5 px-5 text-right">
                      {isPendingValid ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="gradient"
                            size="sm"
                            onClick={() => onSelectCheckoutOrder(o)}
                            className="text-xs py-1 px-3 h-auto bg-gradient-to-r from-amber-600 to-orange-600 font-bold text-white shadow-xs"
                          >
                            Pay ({getPendingRemainingTime(o)})
                          </Button>
                          <button
                            onClick={() => onCancelOrder(o.id)}
                            disabled={cancellingOrderId === o.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Cancel order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : effectiveStatus === 'EXPIRED' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (onNavigate) onNavigate('/');
                            else window.location.href = '/';
                          }}
                          className="text-xs py-1 px-2.5 h-auto text-slate-600 hover:text-indigo-600 font-semibold"
                        >
                          Reorder
                        </Button>
                      ) : o.status === 'PAID' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onSelectCheckoutOrder(o)}
                          leftIcon={<ExternalLink className="w-3.5 h-3.5 text-emerald-600" />}
                          className="text-xs py-1 px-3 h-auto text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-bold"
                        >
                          View Link
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-300 font-mono">---</span>
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

export default OrderHistoryCard;
