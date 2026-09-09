import React from 'react';
import {
  Copy,
  Check,
  QrCode,
  Trash2,
  Power,
  Clock,
  Edit2,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import type { SubscriptionItem } from '../../types/subscription';
import type { NodeItem } from '../../types/node';
import { formatDataSize } from './subscriptionUtils';

interface SubscriptionTableRowProps {
  sub: SubscriptionItem;
  nodes: NodeItem[];
  copiedId: number | null;
  onCopyUrl: (sub: SubscriptionItem) => void;
  onOpenQr: (sub: SubscriptionItem) => void;
  onOpenRenew: (sub: SubscriptionItem) => void;
  onOpenEdit: (sub: SubscriptionItem) => void;
  onToggleActive: (sub: SubscriptionItem) => void;
  onDelete: (sub: SubscriptionItem) => void;
}

export const SubscriptionTableRow: React.FC<SubscriptionTableRowProps> = ({
  sub,
  nodes,
  copiedId,
  onCopyUrl,
  onOpenQr,
  onOpenRenew,
  onOpenEdit,
  onToggleActive,
  onDelete,
}) => {
  const usedGb = sub.traffic_used_bytes / (1024 * 1024 * 1024);
  const quotaGb = sub.traffic_quota_bytes / (1024 * 1024 * 1024);
  const percentUsed = Math.min(Math.round((usedGb / (quotaGb || 1)) * 100), 100);
  const isNearQuota = percentUsed >= 85;
  const expiryFormatted = new Date(sub.expires_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <tr className="hover:bg-indigo-50/40 transition-colors">
      {/* Subscriber Info */}
      <td className="py-4 px-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900 text-sm">
            {sub.customer_name}
          </span>
          {sub.plan_name && (
            <span className="inline-flex items-center text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200/80">
              {sub.plan_name}
            </span>
          )}
          {sub.region_code && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/80">
              <span>{sub.region_flag || '🌐'}</span>
              <span>{sub.region_code}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <code className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100/90 px-1.5 py-0.5 rounded-md border border-slate-200/60">
            {sub.token.substring(0, 14)}...
          </code>
          <button
            onClick={() => onCopyUrl(sub)}
            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
            title="Copy Subscription Link"
          >
            {copiedId === sub.id ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </td>

      {/* Traffic Consumption */}
      <td className="py-4 px-5 min-w-[180px]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="font-semibold text-slate-700">
              {formatDataSize(sub.traffic_used_bytes)} / {formatDataSize(sub.traffic_quota_bytes)}
            </span>
            <span className={`font-bold ${isNearQuota ? 'text-rose-600' : 'text-indigo-600'}`}>
              {sub.traffic_used_bytes > 0 && percentUsed < 1 ? '< 1%' : `${percentUsed}%`}
            </span>
          </div>
          <ProgressBar
            value={usedGb}
            max={quotaGb || 1}
            height="sm"
            variant="auto"
          />
        </div>
      </td>

      {/* Assigned Nodes */}
      <td className="py-4 px-5 min-w-[160px]">
        <div className="flex flex-wrap gap-1.5 items-center max-w-[220px]">
          {(!sub.node_ids || sub.node_ids.length === 0) ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200/80">
              <Globe className="w-3 h-3 text-slate-400" />
              All Nodes
            </span>
          ) : (
            sub.node_ids.map((nodeId) => {
              const matchedNode = nodes.find((n) => n.id === nodeId);
              return (
                <span
                  key={nodeId}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-indigo-100 text-slate-700 px-2 py-0.5 rounded-md shadow-2xs"
                  title={matchedNode?.host || `Node ID: ${nodeId}`}
                >
                  <span>{matchedNode?.flag || '🌐'}</span>
                  <span className="truncate max-w-[95px]">{matchedNode?.name || `Node #${nodeId}`}</span>
                </span>
              );
            })
          )}
        </div>
      </td>

      {/* Expiration Date */}
      <td className="py-4 px-5 font-mono text-slate-700 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>{expiryFormatted}</span>
        </div>
      </td>

      {/* Status */}
      <td className="py-4 px-5">
        <Badge
          variant={
            sub.status === 'ACTIVE'
              ? 'emerald'
              : sub.status === 'SUSPENDED'
              ? 'amber'
              : 'rose'
          }
          size="sm"
          dot={true}
          pulseDot={sub.status === 'ACTIVE'}
        >
          {sub.status}
        </Badge>
      </td>

      {/* Actions */}
      <td className="py-4 px-5 text-right">
        <div className="inline-flex items-center gap-1.5">
          {/* QR Code Modal Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenQr(sub)}
            title="Show QR Code for Shadowrocket"
            className="font-bold text-xs"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">QR</span>
          </Button>

          {/* Edit Full Profile Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenEdit(sub)}
            title="Edit subscription details & assigned nodes"
            className="font-bold text-xs"
          >
            <Edit2 className="w-3.5 h-3.5 text-cyan-600" />
            <span className="hidden sm:inline">Edit</span>
          </Button>

          {/* Quick Renew Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenRenew(sub)}
            title="Quick extend days or quota"
            className="font-bold text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Renew</span>
          </Button>

          {/* Suspend / Activate Toggle */}
          <button
            onClick={() => onToggleActive(sub)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              sub.status === 'ACTIVE'
                ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
            }`}
            title={sub.status === 'ACTIVE' ? 'Suspend Subscription' : 'Activate Subscription'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>

          {/* Delete Subscription */}
          <button
            onClick={() => onDelete(sub)}
            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete Subscription"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default SubscriptionTableRow;
