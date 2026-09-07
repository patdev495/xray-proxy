import React, { useEffect, useState, useCallback } from 'react';
import { 
  Plus, 
  RefreshCw, 
  Server
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchNodes,
  updateNode,
  deleteNode,
  fetchNodeInstallScript,
  fetchNodeSyncScript,
} from '../../services/apiClient';
import type { NodeItem } from '../../types/node';
import { AddNodeSheet } from '../nodes/AddNodeSheet';
import { SniManagementModal } from '../nodes/SniManagementModal';
import { NodeScriptModal } from '../nodes/NodeScriptModal';
import { NodeTableRow } from '../nodes/NodeTableRow';

export const NodesTab: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // SNI Management Modal State
  const [activeSniNode, setActiveSniNode] = useState<NodeItem | null>(null);

  // Script Modal State (Install / Sync)
  const [activeScriptNode, setActiveScriptNode] = useState<NodeItem | null>(null);
  const [scriptTitle, setScriptTitle] = useState<string>('VPS Script');
  const [scriptDescription, setScriptDescription] = useState<string>('');
  const [scriptContent, setScriptContent] = useState<string>('');
  const [isLoadingScript, setIsLoadingScript] = useState<boolean>(false);

  const loadNodes = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const data = await fetchNodes(token);
      setNodes(data);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Fetch Error',
        message: err instanceof Error ? err.message : 'Failed to load nodes',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  const copyToClipboard = (text: string, label: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast({
      type: 'success',
      title: 'Copied to Clipboard',
      message: `${label} copied: ${text.length > 30 ? text.substring(0, 30) + '...' : text}`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };


  const handlePromptEditCapacity = async (node: NodeItem) => {
    if (!token) return;
    const current = node.max_subscriptions || 100;
    const input = window.prompt(`Update Max Subscriptions capacity for ${node.name}:`, String(current));
    if (input === null) return;
    const parsed = parseInt(input.trim(), 10);
    if (isNaN(parsed) || parsed < 1) {
      showToast({
        type: 'error',
        title: 'Invalid Capacity',
        message: 'Capacity must be a positive number greater than or equal to 1.',
      });
      return;
    }
    try {
      await updateNode(token, node.id, { max_subscriptions: parsed });
      showToast({
        type: 'success',
        title: 'Capacity Updated',
        message: `Capacity for ${node.name} set to ${parsed} subscriptions.`,
      });
      await loadNodes();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update Error',
        message: err instanceof Error ? err.message : 'Failed to update capacity',
      });
    }
  };

  const handleToggleNodeActive = async (node: NodeItem) => {
    if (!token) return;
    try {
      await updateNode(token, node.id, { is_active: !node.is_active });
      showToast({
        type: 'info',
        title: 'Node Status Updated',
        message: `${node.name} is now ${!node.is_active ? 'Active' : 'Disabled'}.`,
      });
      await loadNodes();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update Error',
        message: err instanceof Error ? err.message : 'Failed to update node status',
      });
    }
  };

  const handleDeleteNode = async (node: NodeItem) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to delete node "${node.name}" (${node.host})?`)) {
      return;
    }
    try {
      await deleteNode(token, node.id);
      showToast({
        type: 'success',
        title: 'Node Deleted',
        message: `Node ${node.name} removed.`,
      });
      await loadNodes();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Failed to delete node',
      });
    }
  };

  const handleOpenSniModal = (node: NodeItem) => {
    setActiveSniNode(node);
  };

  const handleSniNodeUpdated = async () => {
    if (!token) return;
    const updatedNodes = await fetchNodes(token);
    setNodes(updatedNodes);
    if (activeSniNode) {
      const refreshedActive = updatedNodes.find((n) => n.id === activeSniNode.id);
      if (refreshedActive) {
        setActiveSniNode(refreshedActive);
      }
    }
  };

  const handleOpenInstallScript = async (node: NodeItem) => {
    if (!token) return;
    setActiveScriptNode(node);
    setScriptTitle(`VPS Deployment Script - ${node.name}`);
    setScriptDescription('Run this automated setup script on your fresh Linux VPS to start xray-core');
    setScriptContent('');
    try {
      setIsLoadingScript(true);
      const script = await fetchNodeInstallScript(token, node.id);
      setScriptContent(script);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Script Load Error',
        message: err instanceof Error ? err.message : 'Could not fetch setup script',
      });
    } finally {
      setIsLoadingScript(false);
    }
  };

  const handleOpenSyncScript = async (node: NodeItem) => {
    if (!token) return;
    setActiveScriptNode(node);
    setScriptTitle(`Quick VPS Sync Script - ${node.name}`);
    setScriptDescription('Lightweight sync script: updates /etc/xray/config.json with all active users pre-configured and restarts xray-core in 0.5s.');
    setScriptContent('');
    try {
      setIsLoadingScript(true);
      const script = await fetchNodeSyncScript(token, node.id);
      setScriptContent(script);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Sync Script Error',
        message: err instanceof Error ? err.message : 'Could not fetch sync script',
      });
    } finally {
      setIsLoadingScript(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Xray Data Plane Nodes</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Remote VPS running <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">xray-core</code> controlled via gRPC API.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadNodes}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddSheetOpen(true)}
          >
            Add New Node
          </Button>
        </div>
      </div>

      {/* Nodes Table Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-5">Node &amp; Region</th>
                <th className="py-3 px-5">Host &amp; Inbound</th>
                <th className="py-3 px-5">Capacity / Subs</th>
                <th className="py-3 px-5">State &amp; Reality Keys</th>
                <th className="py-3 px-5">Carrier SNI Profiles</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading node infrastructure...
                  </td>
                </tr>
              ) : nodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Server className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No nodes registered yet</p>
                    <p className="text-xs text-slate-400 mt-1">Register a remote VPS to start serving VLESS-Reality proxies.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => setIsAddSheetOpen(true)}
                    >
                      Register First Node
                    </Button>
                  </td>
                </tr>
              ) : (
                nodes.map((node) => (
                  <NodeTableRow
                    key={node.id}
                    node={node}
                    copiedId={copiedId}
                    onCopy={copyToClipboard}
                    onEditCapacity={handlePromptEditCapacity}
                    onOpenSniModal={handleOpenSniModal}
                    onOpenSyncScript={handleOpenSyncScript}
                    onOpenInstallScript={handleOpenInstallScript}
                    onToggleActive={handleToggleNodeActive}
                    onDelete={handleDeleteNode}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Slide-over Sheet: Add Node Form */}
      <AddNodeSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onSuccess={loadNodes}
        token={token}
      />

      {/* Modal: Manage SNI Profiles */}
      <SniManagementModal
        node={activeSniNode}
        onClose={() => setActiveSniNode(null)}
        onNodeUpdated={handleSniNodeUpdated}
        onOpenSyncScript={(node) => {
          setActiveSniNode(null);
          handleOpenSyncScript(node);
        }}
        token={token}
      />

      {/* Modal: 1-Line Installation or Sync Script */}
      <NodeScriptModal
        node={activeScriptNode}
        isOpen={activeScriptNode !== null}
        onClose={() => setActiveScriptNode(null)}
        title={scriptTitle}
        description={scriptDescription}
        content={scriptContent}
        isLoading={isLoadingScript}
      />
    </div>
  );
};

export default NodesTab;
