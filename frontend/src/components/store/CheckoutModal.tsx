import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Check,
  Clock,
  QrCode,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Order } from '../../types/order';
import { fetchOrderByCode } from '../../services/apiClient';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface CheckoutModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(order);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15 * 60);

  useEffect(() => {
    setCurrentOrder(order);
    if (order) {
      const expiresAt = new Date(order.expires_at).getTime();
      const now = Date.now();
      const seconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setRemainingSeconds(seconds > 0 ? seconds : 15 * 60);
    }
  }, [order]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, remainingSeconds]);

  // Poll order status every 4 seconds
  const checkStatus = useCallback(async () => {
    if (!order || !isOpen) return;
    try {
      const updated = await fetchOrderByCode(order.code);
      setCurrentOrder(updated);
      if (updated.status === 'PAID') {
        if (onPaymentSuccess) onPaymentSuccess(updated);
      }
    } catch {
      // ignore network hiccup during polling
    }
  }, [order, isOpen, onPaymentSuccess]);

  useEffect(() => {
    if (!isOpen || !order || currentOrder?.status === 'PAID') return;
    const pollInterval = setInterval(checkStatus, 4000);
    return () => clearInterval(pollInterval);
  }, [isOpen, order, currentOrder?.status, checkStatus]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!currentOrder) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isExpired = remainingSeconds <= 0 || currentOrder.status === 'EXPIRED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thanh toán đơn hàng"
      description={`Mã đơn: ${currentOrder.code} • Gói ${currentOrder.plan_name}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Paid Banner */}
        {currentOrder.status === 'PAID' ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in zoom-in-95">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-emerald-800">Thanh toán thành công!</h4>
              <p className="text-xs text-emerald-600">
                Gói cước đã được kích hoạt. Bạn có thể sao chép link hoặc quét mã QR bên dưới vào Shadowrocket / v2rayNG:
              </p>
            </div>

            {currentOrder.subscription_token && (
              <div className="space-y-3 pt-1">
                {/* QR Code for Subscription Link */}
                <div className="w-40 h-40 mx-auto bg-white p-2 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      `${window.location.origin}/api/v1/subscriptions/${currentOrder.subscription_token}/sub`
                    )}`}
                    alt="Subscription QR"
                    className="w-full h-full object-contain rounded"
                  />
                </div>

                {/* 1-Click Copy Subscription URL */}
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-emerald-200 text-left">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/v1/subscriptions/${currentOrder.subscription_token}/sub`}
                    className="flex-1 text-[11px] font-mono text-slate-700 bg-transparent outline-none truncate"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/api/v1/subscriptions/${currentOrder.subscription_token}/sub`,
                        'sub_url'
                      )
                    }
                    className="shrink-0 text-xs"
                    leftIcon={copiedField === 'sub_url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedField === 'sub_url' ? 'Đã chép' : 'Sao chép'}
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (onPaymentSuccess) onPaymentSuccess(currentOrder);
                onClose();
              }}
              className="w-full mt-2"
            >
              Vào Customer Portal
            </Button>
          </div>
        ) : isExpired ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <h4 className="text-sm font-bold text-rose-800">Đơn hàng đã hết hạn</h4>
            <p className="text-xs text-rose-600">
              Thời gian thanh toán 15 phút đã kết thúc. Vui lòng tạo đơn hàng mới.
            </p>
            <Button variant="secondary" size="sm" onClick={onClose} className="mt-2">
              Đóng
            </Button>
          </div>
        ) : (
          <>
            {/* Timer and Status Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Thời gian thanh toán:</span>
                <span className="font-mono font-bold text-amber-600">{timeFormatted}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                <span className="text-[11px]">Chờ quét mã...</span>
              </div>
            </div>

            {/* QR Code Card */}
            <div className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="w-56 h-56 bg-slate-50 rounded-lg border border-slate-100 p-2 flex items-center justify-center relative overflow-hidden">
                <img
                  src={currentOrder.vietqr_url}
                  alt="VietQR Transfer Code"
                  className="w-full h-full object-contain rounded"
                  loading="eager"
                />
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" />
                <span>Mở App ngân hàng bất kỳ để quét mã QR</span>
              </p>
            </div>

            {/* Transfer Details Table */}
            <div className="rounded-xl border border-slate-200/90 divide-y divide-slate-100 bg-white text-xs">
              {/* Row 1: Bank Name */}
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-400">Ngân hàng:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{currentOrder.bank_id}</span>
                  <button
                    onClick={() => copyToClipboard(currentOrder.bank_id, 'bank')}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title="Sao chép"
                  >
                    {copiedField === 'bank' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Row 2: Account Number */}
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-400">Số tài khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{currentOrder.bank_account_number}</span>
                  <button
                    onClick={() => copyToClipboard(currentOrder.bank_account_number, 'account')}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title="Sao chép"
                  >
                    {copiedField === 'account' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Row 3: Account Name */}
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-400">Chủ tài khoản:</span>
                <span className="font-medium text-slate-800 uppercase">{currentOrder.bank_account_name}</span>
              </div>

              {/* Row 4: Amount */}
              <div className="flex items-center justify-between p-2.5">
                <span className="text-slate-400">Số tiền:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-600 text-sm">
                    {currentOrder.amount_vnd.toLocaleString('vi-VN')} đ
                  </span>
                  <button
                    onClick={() => copyToClipboard(currentOrder.amount_vnd.toString(), 'amount')}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title="Sao chép số tiền"
                  >
                    {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Row 5: Transfer Content (Crucial) */}
              <div className="flex items-center justify-between p-2.5 bg-amber-50/50">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-800 font-medium">Nội dung chuyển khoản:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded text-xs">
                    {currentOrder.code}
                  </span>
                  <button
                    onClick={() => copyToClipboard(currentOrder.code, 'code')}
                    className="p-1 rounded text-amber-700 hover:bg-amber-100"
                    title="Sao chép mã"
                  >
                    {copiedField === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Warning Note */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Lưu ý:</strong> Vui lòng giữ chính xác nội dung chuyển tiền{' '}
                <code className="bg-slate-200/70 text-slate-800 px-1 py-0.5 rounded font-mono">{currentOrder.code}</code> để hệ thống tự động nhận diện và kích hoạt trong vòng 3-5 giây.
              </span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CheckoutModal;
