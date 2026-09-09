import React from 'react';
import {
  Copy,
  Check,
  Terminal,
  Trash2,
  Power,
  Key,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { NodeItem } from '../../types/node';

interface NodeTableRowProps {
  node: NodeItem;
  copiedId: string | null;
  onCopy: (text: string, label: string, id: string) => void;
  onEditCapacity: (node: NodeItem) => void;
  onOpenSniModal: (node: NodeItem) => void;
  onOpenSyncScript: (node: NodeItem) => void;
  onOpenInstallScript: (node: NodeItem) => void;
  onToggleActive: (node: NodeItem) => void;
  onDelete: (node: NodeItem) => void;
}

export const NodeTableRow: React.FC<NodeTableRowProps> = ({
  node,
  copiedId,
  onCopy,
  onEditCapacity,
  onOpenSniModal,
  onOpenSyncScript,
  onOpenInstallScript,
  onToggleActive,
  onDelete,
}) => {
  const activeSubs = node.active_subscriptions_count ?? 0;
  const maxSubs = node.max_subscriptions || 100;
  const percent = Math.min(100, Math.round((activeSubs / maxSubs) * 100));

  const getCarrierBadgeClass = (carrier: string) => {
    const c = carrier.toLowerCase();
    if (c.includes('viettel')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (c.includes('vina')) {
      return 'bg-sky-50 text-sky-700 border-sky-200';
    }
    if (c.includes('mobi')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  return (
    <tr className="hover:bg-indigo-50/40 transition-colors">
      {/* Node & Region */}
      <td className="py-4 px-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl select-none filter drop-shadow-xs">{node.flag || '🌐'}</span>
          <div>
            <span className="font-bold text-slate-900 block text-sm">{node.name}</span>
            <span className="text-indigo-600 font-mono font-medium text-[11px]">
              {node.location || 'Unknown Region'}
            </span>
          </div>
        </div>
      </td>

      {/* Host IP & Port */}
      <td className="py-4 px-5">
        <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-800">
          <span>{node.host}:{node.inbound_port}</span>
          <button
            onClick={() => onCopy(node.host, 'Host IP', `host-${node.id}`)}
            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
            title="Copy IP"
          >
            {copiedId === `host-${node.id}` ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          gRPC Port: <strong className="text-slate-600">{node.grpc_port}</strong>
        </span>
      </td>

      {/* Capacity & Active Subs */}
      <td className="py-4 px-5">
        <div className="space-y-1.5 min-w-[130px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 font-mono">
              {activeSubs}{' '}
              <span className="text-slate-400 font-normal font-sans">/ {maxSubs}</span>
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                activeSubs >= maxSubs
                  ? 'bg-rose-100 text-rose-700'
                  : activeSubs > maxSubs * 0.8
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {activeSubs >= maxSubs ? 'Full' : `${percent}%`}
            </span>
          </div>
          <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                activeSubs >= maxSubs
                  ? 'bg-gradient-to-r from-rose-500 to-red-600'
                  : activeSubs > maxSubs * 0.8
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : 'bg-gradient-to-r from-emerald-400 to-teal-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <button
            onClick={() => onEditCapacity(node)}
            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            Edit capacity limit
          </button>
        </div>
      </td>

      {/* State & Reality Keys */}
      <td className="py-4 px-5">
        <div className="space-y-1.5">
          <Badge
            variant={node.is_active ? 'emerald' : 'slate'}
            size="sm"
            dot={true}
            pulseDot={node.is_active}
          >
            {node.is_active ? 'Active Node' : 'Disabled'}
          </Badge>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pub: {node.reality_public_key.substring(0, 8)}...</span>
            <button
              onClick={() => onCopy(node.reality_public_key, 'Reality Public Key', `key-${node.id}`)}
              className="text-slate-400 hover:text-indigo-600 p-0.5 cursor-pointer"
              title="Copy Public Key"
            >
              {copiedId === `key-${node.id}` ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </td>

      {/* SNI Profiles */}
      <td className="py-4 px-5">
        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
          {node.sni_profiles && node.sni_profiles.length > 0 ? (
            node.sni_profiles.map((sni) => (
              <span
                key={sni.id}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-mono shadow-2xs ${getCarrierBadgeClass(
                  sni.carrier
                )}`}
                title={`Carrier: ${sni.carrier} | Port: ${sni.port}`}
              >
                <span className="font-bold">{sni.carrier}:</span>
                <span>{sni.domain}</span>
                <span className="opacity-60">:{sni.port}</span>
              </span>
            ))
          ) : (
            <span className="text-slate-400 italic text-[11px]">No SNI routes set</span>
          )}
          <button
            onClick={() => onOpenSniModal(node)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-indigo-300 text-[11px] text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer font-semibold"
            title="Manage SNI Profiles"
          >
            <Layers className="w-3 h-3" />
            <span>Manage ({node.sni_profiles?.length || 0})</span>
          </button>
        </div>
      </td>

      {/* Actions */}
      <td className="py-4 px-5 text-right">
        <div className="inline-flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenSyncScript(node)}
            title="Quick 1-second sync script for VPS"
            className="font-bold text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Sync</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenInstallScript(node)}
            title="View 1-line installation script"
            className="font-bold text-xs"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-600" />
            <span className="hidden sm:inline">Setup</span>
          </Button>

          <button
            onClick={() => onToggleActive(node)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              node.is_active
                ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                : 'border-slate-200 text-slate-400 hover:bg-slate-100'
            }`}
            title={node.is_active ? 'Disable Node' : 'Enable Node'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(node)}
            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete Node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default NodeTableRow;
