import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import type { NodeItem } from '../../types/node';

interface NodeScriptModalProps {
  node: NodeItem | null;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  content: string;
  isLoading: boolean;
}

export const NodeScriptModal: React.FC<NodeScriptModalProps> = ({
  node,
  isOpen,
  onClose,
  title,
  description,
  content,
  isLoading,
}) => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    showToast({
      type: 'success',
      title: t('management.copiedToClipboard'),
      message: t('management.scriptCopied'),
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{t('management.targetHost')} <strong className="font-mono text-slate-800">{node?.host}</strong></span>
          <Button
            variant="primary"
            size="sm"
            leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={handleCopy}
            disabled={isLoading || !content}
          >
            {copied ? t('checkout.copied') : t('management.copyScript')}
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            {t('management.generatingScript')}
          </div>
        ) : (
          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed">
              {content}
            </pre>
          </div>
        )}

        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900">
          <strong>{t('management.scriptUsage')}</strong> {t('management.scriptUsageDescription')}
        </div>
      </div>
    </Modal>
  );
};
