import React, { useState } from 'react';
import { 
  Plus, 
  Copy, 
  Check, 
  QrCode, 
  Calendar 
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ProgressBar } from '../ui/ProgressBar';
import { Modal } from '../ui/Modal';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../../context/ToastContext';

interface SubscriptionItem {
  id: string;
  customerName: string;
  token: string;
  usedGb: number;
  quotaGb: number;
  expiresAt: string;
  status: 'active' | 'suspended' | 'expired';
}

export const SubscriptionsTab: React.FC = () => {
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State for QR Code
  const [selectedSubForQr, setSelectedSubForQr] = useState<SubscriptionItem | null>(null);

  // Sheet State for New Subscription
  const [isNewSubSheetOpen, setIsNewSubSheetOpen] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newQuotaGb, setNewQuotaGb] = useState<string>('50');
  const [newDaysValid, setNewDaysValid] = useState<string>('30');

  // Subscriptions Mock Data
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([
    {
      id: 'sub-001',
      customerName: 'Customer #1042',
      token: 'sub_tok_9a8f2c3b4e1d7a8e',
      usedGb: 28.4,
      quotaGb: 50.0,
      expiresAt: '2026-10-15',
      status: 'active',
    },
    {
      id: 'sub-002',
      customerName: 'Customer #1088',
      token: 'sub_tok_e4b1c7d2a9f83021',
      usedGb: 48.9,
      quotaGb: 50.0,
      expiresAt: '2026-09-28',
      status: 'active',
    },
    {
      id: 'sub-003',
      customerName: 'Customer #1091',
      token: 'sub_tok_11a8c9e42f0b7d34',
      usedGb: 100.0,
      quotaGb: 100.0,
      expiresAt: '2026-09-01',
      status: 'expired',
    },
  ]);

  const getSubUrl = (token: string) => `http://127.0.0.1:8000/api/v1/sub/${token}`;

  const copySubscriptionUrl = (sub: SubscriptionItem) => {
    const url = getSubUrl(sub.token);
    navigator.clipboard.writeText(url);
    setCopiedId(sub.id);
    showToast({
      type: 'success',
      title: 'Subscription URL Copied',
      message: `Ready to import into Shadowrocket for ${sub.customerName}`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Customer name is required.',
      });
      return;
    }

    const quota = parseFloat(newQuotaGb) || 50;
    const days = parseInt(newDaysValid, 10) || 30;
    const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const newSub: SubscriptionItem = {
      id: `sub-${Math.random().toString(36).substring(2, 7)}`,
      customerName: newCustomerName,
      token: `sub_tok_${Math.random().toString(36).substring(2, 12)}`,
      usedGb: 0,
      quotaGb: quota,
      expiresAt: expiryDate,
      status: 'active',
    };

    setSubscriptions((prev) => [newSub, ...prev]);
    setIsNewSubSheetOpen(false);
    setNewCustomerName('');

    showToast({
      type: 'success',
      title: 'Subscription Created',
      message: `Issued ${quota} GB quota to ${newSub.customerName}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Customer Subscriptions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Traffic Quota, generate Subscription Tokens, and issue bundles for Client Apps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewSubSheetOpen(true)}
          >
            Issue Subscription
          </Button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Traffic Quota Usage</th>
                <th className="py-3 px-5">Subscription Token</th>
                <th className="py-3 px-5">Expiration</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Client App Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Customer */}
                  <td className="py-4 px-5">
                    <span className="font-semibold text-slate-900 block text-sm">{sub.customerName}</span>
                    <span className="text-slate-400 font-mono text-[11px]">ID: {sub.id}</span>
                  </td>

                  {/* Quota Progress Meter */}
                  <td className="py-4 px-5 min-w-[200px]">
                    <ProgressBar
                      value={sub.usedGb}
                      max={sub.quotaGb}
                      showLabel={true}
                      height="sm"
                    />
                  </td>

                  {/* Token */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-1.5 font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit text-[11px]">
                      <span>{sub.token.substring(0, 16)}...</span>
                    </div>
                  </td>

                  {/* Expiration */}
                  <td className="py-4 px-5 font-mono text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sub.expiresAt}</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-5">
                    <Badge
                      variant={
                        sub.status === 'active'
                          ? 'emerald'
                          : sub.status === 'expired'
                          ? 'rose'
                          : 'amber'
                      }
                      size="sm"
                      dot={true}
                    >
                      {sub.status.toUpperCase()}
                    </Badge>
                  </td>

                  {/* Client App Actions */}
                  <td className="py-4 px-5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copySubscriptionUrl(sub)}
                        title="Copy Subscription URL"
                        leftIcon={
                          copiedId === sub.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )
                        }
                      >
                        Copy URL
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedSubForQr(sub)}
                        title="View Shadowrocket QR Code"
                        leftIcon={<QrCode className="w-3.5 h-3.5" />}
                      >
                        QR
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick Modal: QR Code Preview */}
      <Modal
        isOpen={!!selectedSubForQr}
        onClose={() => setSelectedSubForQr(null)}
        title="Client App Subscription QR"
        description="Scan directly in Shadowrocket or v2rayNG to auto-import nodes"
      >
        {selectedSubForQr && (
          <div className="space-y-5 text-center">
            {/* Clean QR Graphic Container */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl inline-block mx-auto">
              <div className="w-48 h-48 bg-white border border-slate-300 rounded-lg flex flex-col items-center justify-center p-3 shadow-xs">
                <QrCode className="w-36 h-36 text-slate-900" />
                <span className="text-[10px] font-mono text-slate-400 mt-1">VLESS-Reality Bundle</span>
              </div>
            </div>

            <div className="space-y-1 text-left bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800">{selectedSubForQr.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Traffic Quota:</span>
                <span className="font-mono text-slate-800">{selectedSubForQr.quotaGb} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subscription URL:</span>
                <span className="font-mono text-slate-600 truncate max-w-[200px]">
                  {getSubUrl(selectedSubForQr.token)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSubForQr(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  copySubscriptionUrl(selectedSubForQr);
                  setSelectedSubForQr(null);
                }}
                leftIcon={<Copy className="w-3.5 h-3.5" />}
              >
                Copy URL &amp; Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Slide-over Sheet: New Subscription Form */}
      <Sheet
        isOpen={isNewSubSheetOpen}
        onClose={() => setIsNewSubSheetOpen(false)}
        title="Issue New Subscription"
        description="Allocate Traffic Quota and generate a secure Subscription Token"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsNewSubSheetOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateSubscription}>
              Generate Subscription Token
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubscription} className="space-y-4">
          <Input
            label="Customer Identifier"
            placeholder="e.g. Customer #1092 or customer@example.com"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            required
            hint="Name or email reference for this subscriber"
          />

          <Input
            label="Traffic Quota (GB)"
            type="number"
            placeholder="50"
            value={newQuotaGb}
            onChange={(e) => setNewQuotaGb(e.target.value)}
            required
            hint="Maximum data transfer before auto-enforcement disconnection"
          />

          <Input
            label="Validity Period (Days)"
            type="number"
            placeholder="30"
            value={newDaysValid}
            onChange={(e) => setNewDaysValid(e.target.value)}
            hint="Days until subscription expires automatically"
          />

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
            <p className="font-semibold text-slate-800">Included Inbounds</p>
            <p className="text-slate-500 leading-relaxed">
              Upon issuance, this subscription will automatically bundle all active Nodes (Tokyo JP-01, Singapore SG-01) with their configured carrier SNI Profiles.
            </p>
          </div>
        </form>
      </Sheet>
    </div>
  );
};

export default SubscriptionsTab;
