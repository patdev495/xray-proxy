import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Check, HardDrive, Loader2, Server } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fetchEligibleNodes, switchSubscriptionNode } from '../../services/apiClient';
import type { EligibleNode, SubscriptionItem } from '../../types/subscription';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface SwitchNodeModalProps {
  sub: SubscriptionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SwitchNodeModal: React.FC<SwitchNodeModalProps> = ({
  sub,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [nodes, setNodes] = useState<EligibleNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && sub && token) {
      setSelectedNodeId(null);
      setIsLoading(true);
      fetchEligibleNodes(token, sub.id)
        .then((data) => setNodes(data))
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Failed to load server list',
            message: err instanceof Error ? err.message : 'Unable to load server list',
          });
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, sub, token, showToast]);

  const handleSwitch = async () => {
    if (!token || !sub || !selectedNodeId) return;

    try {
      setIsSubmitting(true);
      await switchSubscriptionNode(token, sub.id, selectedNodeId);
      showToast({
        type: 'success',
        title: 'Server switched successfully',
        message: 'Server updated. Please refresh subscription in Shadowrocket/v2rayNG.',
      });
      onSuccess();
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Server switch failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sub) return null;

  const currentNodesText = sub.node_names?.length
    ? sub.node_names.join(', ')
    : 'Not assigned';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Switch Proxy Server"
      description={`Switch your subscription to another server in region ${sub.region_flag || '🌐'} ${sub.region_name || sub.region_code || ''}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Current Node Notice */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Server className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Current server:</span>
            <span className="font-semibold text-slate-800">{currentNodesText}</span>
          </div>
          <Badge variant="slate" size="sm">Current</Badge>
        </div>

        {/* List of Eligible Nodes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Select an available server:
          </label>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              <span>Searching for available servers...</span>
            </div>
          ) : nodes.length === 0 ? (
            <div className="py-6 px-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-center text-xs text-amber-900 space-y-1">
              <p className="font-semibold">No replacement servers found</p>
              <p className="text-amber-700">All other servers in this region are fully loaded or inactive.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-base shrink-0">
                        {node.flag || '🌐'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{node.name}</span>
                          <span className="text-[11px] font-mono text-slate-400">({node.location})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <HardDrive className="w-3 h-3 text-slate-400" />
                          <span>Available: <strong className="font-mono text-emerald-600">{node.available_slots}</strong>/{node.max_subscriptions} slots</span>
                        </div>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400 italic">
          * After switching servers, your UUID and subscription URL remain unchanged. Simply open your app and tap Update Subscription.
        </p>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSwitch}
            disabled={!selectedNodeId || isSubmitting || nodes.length === 0}
            leftIcon={
              isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-3.5 h-3.5" />
              )
            }
          >
            {isSubmitting ? 'Switching...' : 'Confirm Switch'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
