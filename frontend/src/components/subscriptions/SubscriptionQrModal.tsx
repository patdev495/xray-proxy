import React from 'react';
import { Copy } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { SubscriptionItem } from '../../types/subscription';
import { formatGb, getSubUrl } from './subscriptionUtils';

interface SubscriptionQrModalProps {
  sub: SubscriptionItem | null;
  onClose: () => void;
  onCopyUrl: (sub: SubscriptionItem) => void;
}

export const SubscriptionQrModal: React.FC<SubscriptionQrModalProps> = ({
  sub,
  onClose,
  onCopyUrl,
}) => {
  if (!sub) return null;

  const url = getSubUrl(sub.token);

  return (
    <Modal
      isOpen={sub !== null}
      onClose={onClose}
      title="Client App Subscription QR"
      description="Scan directly in Shadowrocket, Streisand, or v2rayNG"
    >
      <div className="space-y-5 text-center">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block mx-auto">
          <div className="w-48 h-48 bg-white border border-slate-300 rounded-lg flex flex-col items-center justify-center p-2 shadow-xs overflow-hidden">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`}
              alt="Subscription QR"
              className="w-44 h-44 object-contain"
            />
          </div>
        </div>

        <div className="space-y-1.5 text-left bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="font-semibold text-slate-800">{sub.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Quota:</span>
            <span className="font-mono text-slate-800">{formatGb(sub.traffic_quota_bytes)} GB</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-slate-500 shrink-0">Subscription Link:</span>
            <span className="font-mono text-slate-700 truncate max-w-[220px]">
              {url}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onCopyUrl(sub);
              onClose();
            }}
            leftIcon={<Copy className="w-3.5 h-3.5" />}
          >
            Copy Link &amp; Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
