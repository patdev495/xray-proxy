import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Database } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import { updateSubscription } from '../../services/apiClient';
import type { SubscriptionItem } from '../../types/subscription';
import { formatGb } from './subscriptionUtils';
import { formatDateTime } from '../../utils/date';

interface SubscriptionRenewModalProps {
  sub: SubscriptionItem | null;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export const SubscriptionRenewModal: React.FC<SubscriptionRenewModalProps> = ({
  sub,
  onClose,
  onSuccess,
  token,
}) => {
  const { showToast } = useToast();
  const { i18n, t } = useTranslation();
  const [addQuotaGb, setAddQuotaGb] = useState<string>('0');
  const [addDays, setAddDays] = useState<string>('30');
  const [isRenewing, setIsRenewing] = useState<boolean>(false);

  useEffect(() => {
    if (sub) {
      setAddQuotaGb('0');
      setAddDays('30');
    }
  }, [sub]);

  if (!sub) return null;

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setIsRenewing(true);
      const quotaToAdd = parseFloat(addQuotaGb) || 0;
      const daysToAdd = parseInt(addDays, 10) || 0;

      const currentExpiry = new Date(sub.expires_at);
      const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
      const newExpiry = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000);

      const currentQuotaGb = sub.traffic_quota_bytes / (1024 * 1024 * 1024);
      const newTotalQuotaGb = currentQuotaGb + quotaToAdd;

      await updateSubscription(token, sub.id, {
        traffic_quota_gb: newTotalQuotaGb,
        expires_at: newExpiry.toISOString(),
        status: 'ACTIVE',
      });

      showToast({
        type: 'success',
        title: t('portal.renew'),
        message: `${sub.customer_name}: +${daysToAdd} ${t('store.days', { count: daysToAdd })}, +${quotaToAdd} GB.`,
      });

      onClose();
      onSuccess();
    } catch (err) {
      showToast({
        type: 'error',
        title: t('portal.renewalCreateFailed'),
        message: err instanceof Error ? err.message : 'Could not renew subscription',
      });
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <Modal
      isOpen={sub !== null}
      onClose={onClose}
      title={`${t('portal.renew')} - ${sub.customer_name}`}
      description={t('portal.renewalDescription')}
    >
      <form onSubmit={handleRenewSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">{t('management.currentQuota')}:</span>
            <span className="font-mono font-semibold text-slate-800">
              {formatGb(sub.traffic_quota_bytes)} GB
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('management.currentExpiry')}:</span>
            <span className="font-mono text-slate-700">
              {formatDateTime(sub.expires_at, i18n.language)}
            </span>
          </div>
        </div>

        <Input
          label={t('management.additionalQuota')}
          type="number"
          placeholder="0"
          value={addQuotaGb}
          onChange={(e) => setAddQuotaGb(e.target.value)}
          hint={t('management.additionalQuotaHint')}
        />

        <Input
          label={t('management.additionalDays')}
          type="number"
          placeholder="30"
          value={addDays}
          onChange={(e) => setAddDays(e.target.value)}
          hint={t('management.additionalDaysHint')}
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isRenewing}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={isRenewing}
            leftIcon={<Database className="w-3.5 h-3.5" />}
          >
            {isRenewing ? t('common.saving') : t('management.saveRenew')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
