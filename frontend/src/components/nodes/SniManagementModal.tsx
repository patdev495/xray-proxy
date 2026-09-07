import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../context/ToastContext';
import { addSniProfile, deleteSniProfile } from '../../services/apiClient';
import type { NodeItem } from '../../types/node';

interface SniManagementModalProps {
  node: NodeItem | null;
  onClose: () => void;
  onNodeUpdated: () => void;
  onOpenSyncScript: (node: NodeItem) => void;
  token: string | null;
}

export const SniManagementModal: React.FC<SniManagementModalProps> = ({
  node,
  onClose,
  onNodeUpdated,
  onOpenSyncScript,
  token,
}) => {
  const { showToast } = useToast();

  const [newCarrier, setNewCarrier] = useState<string>('');
  const [newSniDomain, setNewSniDomain] = useState<string>('');
  const [newPort, setNewPort] = useState<string>('');
  const [isAddingSni, setIsAddingSni] = useState<boolean>(false);

  useEffect(() => {
    if (node) {
      setNewCarrier('');
      setNewSniDomain('');
      const existingPorts = node.sni_profiles?.map((s) => s.port) || [];
      const nextPort = existingPorts.length > 0 ? Math.max(...existingPorts) + 1 : node.inbound_port;
      setNewPort(String(nextPort));
    }
  }, [node]);

  if (!node) return null;

  const handleAddSniProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!newCarrier.trim() || !newSniDomain.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Carrier name and SNI domain are required.',
      });
      return;
    }

    try {
      setIsAddingSni(true);
      const parsedPort = newPort.trim() ? parseInt(newPort.trim(), 10) : undefined;
      await addSniProfile(token, node.id, {
        carrier: newCarrier.trim(),
        domain: newSniDomain.trim(),
        port: parsedPort,
      });
      showToast({
        type: 'success',
        title: 'SNI Profile Added',
        message: `${newCarrier} (${newSniDomain} :${parsedPort || 'auto'}) attached to node.`,
      });
      setNewCarrier('');
      setNewSniDomain('');
      onNodeUpdated();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'SNI Add Error',
        message: err instanceof Error ? err.message : 'Failed to add SNI profile',
      });
    } finally {
      setIsAddingSni(false);
    }
  };

  const handleDeleteSniProfile = async (sniId: number) => {
    if (!token) return;
    try {
      await deleteSniProfile(token, node.id, sniId);
      showToast({
        type: 'success',
        title: 'SNI Removed',
        message: 'SNI profile deleted.',
      });
      onNodeUpdated();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'SNI Delete Error',
        message: err instanceof Error ? err.message : 'Failed to remove SNI profile',
      });
    }
  };

  return (
    <Modal
      isOpen={node !== null}
      onClose={onClose}
      title={`SNI Profiles - ${node.name}`}
      description="Configure multiple carrier-tailored SNI camouflage domains for this node"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Current SNIs List */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Configured Profiles ({node.sni_profiles?.length || 0})
          </h4>

          {node.sni_profiles && node.sni_profiles.length > 0 ? (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {node.sni_profiles.map((sni) => (
                <div
                  key={sni.id}
                  className="flex items-center justify-between p-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 text-xs">{sni.carrier}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80 font-medium">
                        Port {sni.port}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">{sni.domain}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteSniProfile(sni.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    title="Delete profile"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-2">No SNI profiles attached yet.</p>
          )}
        </div>

        {/* Add New SNI Profile Form */}
        <form
          onSubmit={handleAddSniProfile}
          className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3"
        >
          <h4 className="text-xs font-semibold text-slate-800">Add New Carrier SNI</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Carrier Name"
              placeholder="e.g. SoftBank / Linemo"
              value={newCarrier}
              onChange={(e) => setNewCarrier(e.target.value)}
              required
            />
            <Input
              label="SNI Domain"
              placeholder="e.g. www.linemo.jp"
              value={newSniDomain}
              onChange={(e) => setNewSniDomain(e.target.value)}
              required
            />
            <Input
              label="Port"
              placeholder="e.g. 8444"
              type="number"
              value={newPort}
              onChange={(e) => setNewPort(e.target.value)}
              hint="Auto-suggested port"
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isAddingSni}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {isAddingSni ? 'Adding...' : 'Add Profile'}
            </Button>
          </div>
        </form>

        {/* Quick VPS Sync Helper */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-indigo-900">
            <div className="font-semibold text-indigo-950">Apply Changes to VPS</div>
            <div className="text-[11px] text-indigo-700/90">Reload multi-inbound ports on VPS in 0.5s (with all active users embedded).</div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-indigo-600" />}
            onClick={() => onOpenSyncScript(node)}
          >
            View Sync Script
          </Button>
        </div>
      </div>
    </Modal>
  );
};
