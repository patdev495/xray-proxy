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
import { parseUtcDate } from '../../utils/date';

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
      const expiresAt = parseUtcDate(order.expires_at).getTime();
      const now = Date.now();
      const seconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setRemainingSeconds(seconds);
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
  const memoContent = currentOrder.transfer_content || currentOrder.code;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure VietQR Checkout"
      description={`Order: ${currentOrder.code} • Plan: ${currentOrder.plan_name}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Paid Banner */}
        {currentOrder.status === 'PAID' ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-emerald-800">Payment Successfully Verified!</h4>
              <p className="text-xs text-emerald-700">
                Your proxy service has been activated. Import the subscription link below into Shadowrocket or v2rayNG:
              </p>
            </div>

            {currentOrder.subscription_token && (
              <div className="space-y-3 pt-2">
                {/* QR Code for Subscription Link */}
                <div className="w-44 h-44 mx-auto bg-white p-2.5 rounded-2xl border border-emerald-200 shadow-md shadow-emerald-500/10 flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(
                      `${window.location.origin}/api/v1/subscriptions/${currentOrder.subscription_token}/sub`
                    )}`}
                    alt="Subscription QR"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>

                {/* 1-Click Copy Subscription URL */}
                <div className="flex items-center gap-2 p-2.5 bg-white/90 rounded-xl border border-emerald-200 text-left shadow-xs">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/v1/subscriptions/${currentOrder.subscription_token}/sub`}
                    className="flex-1 text-[11px] font-mono text-slate-700 bg-transparent outline-none truncate"
                  />
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/api/v1/subscriptions/${currentOrder.subscription_token}/sub`,
                        'sub_url'
                      )
                    }
                    className="shrink-0 text-xs font-bold"
                    leftIcon={copiedField === 'sub_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedField === 'sub_url' ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="gradient"
              size="md"
              onClick={() => {
                if (onPaymentSuccess) onPaymentSuccess(currentOrder);
                onClose();
              }}
              className="w-full mt-3 font-bold"
            >
              Open Customer Portal
            </Button>
          </div>
        ) : isExpired ? (
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center mx-auto shadow-md shadow-rose-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-rose-800">Payment Window Expired</h4>
            <p className="text-xs text-rose-600 leading-relaxed">
              The 15-minute payment window has closed. Please create a new order to reconnect.
            </p>
            <Button variant="secondary" size="sm" onClick={onClose} className="mt-3">
              Close Window
            </Button>
          </div>
        ) : (
          <>
            {/* Timer and Status Bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-semibold">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>Time remaining:</span>
                <span className="font-mono font-black text-amber-700 text-sm bg-amber-200/60 px-2 py-0.5 rounded-lg">
                  {timeFormatted}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-800 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span className="text-[11px]">Auto-checking...</span>
              </div>
            </div>

            {/* QR Code Card */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-indigo-100 shadow-md shadow-indigo-950/5 space-y-2.5">
              <div className="w-60 h-60 bg-slate-50 rounded-2xl border border-slate-200 p-2.5 flex items-center justify-center relative overflow-hidden shadow-inner">
                <img
                  src={currentOrder.vietqr_url}
                  alt="VietQR Transfer Code"
                  className="w-full h-full object-contain rounded-xl"
                  loading="eager"
                />
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 pt-1">
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>Scan using any Vietnamese Banking App or Momo</span>
              </p>
            </div>

            {/* Transfer Details Table */}
            <div className="rounded-2xl border border-slate-200/90 divide-y divide-slate-100 bg-white/90 text-xs shadow-xs overflow-hidden">
              {/* Row 1: Bank Name */}
              <div className="flex items-center justify-between p-3 hover:bg-slate-50/70 transition-colors">
                <span className="text-slate-400 font-medium">Bank:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{currentOrder.bank_id}</span>
                  <button
                    onClick={() => copyToClipboard(currentOrder.bank_id, 'bank')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                    title="Copy bank"
                  >
                    {copiedField === 'bank' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Row 2: Account Number */}
              <div className="flex items-center justify-between p-3 hover:bg-slate-50/70 transition-colors">
                <span className="text-slate-400 font-medium">Account number:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-sm">{currentOrder.bank_account_number}</span>
                  <button
                    onClick={() => copyToClipboard(currentOrder.bank_account_number, 'account')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                    title="Copy account number"
                  >
                    {copiedField === 'account' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Row 3: Account Name */}
              <div className="flex items-center justify-between p-3 hover:bg-slate-50/70 transition-colors">
                <span className="text-slate-400 font-medium">Account name:</span>
                <span className="font-bold text-slate-800 uppercase">{currentOrder.bank_account_name}</span>
              </div>

              {/* Row 4: Amount */}
              <div className="flex items-center justify-between p-3 hover:bg-slate-50/70 transition-colors">
                <span className="text-slate-400 font-medium">Exact amount:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-emerald-600 text-base">
                    {currentOrder.amount_vnd.toLocaleString('vi-VN')} ₫
                  </span>
                  <button
                    onClick={() => copyToClipboard(currentOrder.amount_vnd.toString(), 'amount')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Copy amount"
                  >
                    {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Row 5: Transfer Content (Crucial) */}
              <div className="flex items-center justify-between p-3 bg-amber-500/10">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-900 font-bold">Transfer memo:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-amber-950 bg-amber-200/80 px-2.5 py-1 rounded-lg text-xs tracking-wider border border-amber-300/80">
                    {memoContent}
                  </span>
                  <button
                    onClick={() => copyToClipboard(memoContent, 'code')}
                    className="p-1.5 rounded-lg text-amber-800 hover:bg-amber-200/80 transition-colors cursor-pointer"
                    title="Copy memo"
                  >
                    {copiedField === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Warning Note */}
            <div className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2.5 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Crucial:</strong> Transfer the exact amount with the memo{' '}
                <code className="bg-white text-slate-900 font-bold px-1.5 py-0.5 rounded border border-slate-200 font-mono">{memoContent}</code> for automatic reconciliation within 3 seconds.
              </span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CheckoutModal;
