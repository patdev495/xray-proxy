import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
        title: t('management.fetchError'),
        message: err instanceof Error ? err.message : t('management.noNodes'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast, t]);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  const copyToClipboard = (text: string, label: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast({
      type: 'success',
      title: t('management.copiedToClipboard'),
      message: t('management.copiedValue', { label, value: text.length > 30 ? `${text.substring(0, 30)}...` : text }),
    });
    setTimeout(() => setCopiedId(null), 2000);
  };


  const handlePromptEditCapacity = async (node: NodeItem) => {
    if (!token) return;
    const current = node.max_subscriptions || 100;
    const input = window.prompt(t('management.capacityPrompt', { name: node.name }), String(current));
    if (input === null) return;
    const parsed = parseInt(input.trim(), 10);
    if (isNaN(parsed) || parsed < 1) {
      showToast({
        type: 'error',
        title: t('management.invalidCapacity'),
        message: t('management.invalidCapacityDescription'),
      });
      return;
    }
    try {
      await updateNode(token, node.id, { max_subscriptions: parsed });
      showToast({
        type: 'success',
        title: t('management.capacityUpdated'),
        message: t('management.capacityUpdatedDescription', { name: node.name, count: parsed }),
      });
      await loadNodes();
    } catch (err) {
      showToast({
        type: 'error',
        title: t('management.updateError'),
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
        title: t('management.nodeStatusUpdated'),
        message: t('management.nodeStatusMessage', { name: node.name, status: !node.is_active ? t('management.active') : t('management.disabled') }),
      });
      await loadNodes();
    } catch (err) {
      showToast({
        type: 'error',
        title: t('management.updateError'),
        message: err instanceof Error ? err.message : 'Failed to update node status',
      });
    }
  };

  const handleDeleteNode = async (node: NodeItem) => {
    if (!token) return;
    if (!window.confirm(t('management.deleteNodeConfirm', { name: node.name, host: node.host }))) {
      return;
    }
    try {
      await deleteNode(token, node.id);
      showToast({
        type: 'success',
        title: t('management.nodeDeleted'),
        message: t('management.nodeDeletedMessage', { name: node.name }),
      });
      await loadNodes();
    } catch (err) {
      showToast({
        type: 'error',
        title: t('management.deleteFailed'),
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
    setScriptTitle(t('management.nodeScriptTitle', { name: node.name }));
    setScriptDescription(t('management.nodeScriptDescription'));
    setScriptContent('');
    try {
      setIsLoadingScript(true);
      const script = await fetchNodeInstallScript(token, node.id);
      setScriptContent(script);
    } catch (err) {
      showToast({
        type: 'error',
        title: t('management.scriptLoadFailed'),
        message: err instanceof Error ? err.message : t('management.scriptLoadFailed'),
      });
    } finally {
      setIsLoadingScript(false);
    }
  };

  const handleOpenSyncScript = async (node: NodeItem) => {
    if (!token) return;
    setActiveScriptNode(node);
    setScriptTitle(t('management.nodeSyncScriptTitle', { name: node.name }));
    setScriptDescription(t('management.nodeSyncScriptDescription'));
    setScriptContent('');
    try {
      setIsLoadingScript(true);
      const script = await fetchNodeSyncScript(token, node.id);
      setScriptContent(script);
    } catch (err) {
      showToast({
        type: 'error',
        title: t('management.syncScriptLoadFailed'),
        message: err instanceof Error ? err.message : t('management.syncScriptLoadFailed'),
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
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{t('management.nodesTitle')}</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {t('management.nodesDescription')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadNodes}
            disabled={isLoading}
            className="font-bold text-xs"
          >
            {t('management.refreshNodes')}
          </Button>
          <Button
            variant="gradient"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddSheetOpen(true)}
            className="font-bold text-xs shadow-md shadow-indigo-500/20"
          >
            {t('management.addNode')}
          </Button>
        </div>
      </div>

      {/* Nodes Table Card */}
      <Card className="rounded-3xl border border-indigo-100/70 shadow-md shadow-indigo-950/5 bg-white/95 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100/90 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">{t('management.nodeRegion')}</th><th className="py-3.5 px-5">{t('management.hostInbound')}</th><th className="py-3.5 px-5">{t('management.capacity')}</th><th className="py-3.5 px-5">{t('management.realityKeysColumn')}</th><th className="py-3.5 px-5">{t('management.sniProfilesLabel')}</th><th className="py-3.5 px-5 text-right">{t('portal.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span className="font-bold text-xs tracking-wide uppercase text-slate-500">{t('management.connectingInfrastructure')}</span>
                  </td>
                </tr>
              ) : nodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                      <Server className="w-7 h-7" />
                    </div>
                    <p className="text-base font-bold text-slate-800">{t('management.noNodes')}</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{t('management.noNodesDescription')}</p>
                    <Button
                      variant="gradient"
                      size="sm"
                      className="mt-4 font-bold text-xs"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => setIsAddSheetOpen(true)}
                    >
                      {t('management.registerNode')}
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
