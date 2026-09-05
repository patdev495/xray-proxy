import React, { useEffect, useState, useCallback } from 'react';
import { 
  Plus, 
  Copy, 
  Check, 
  Terminal, 
  Trash2, 
  Power, 
  Key, 
  RefreshCw, 
  Layers,
  Sparkles,
  Server
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Sheet } from '../ui/Sheet';
import { Modal } from '../ui/Modal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchNodes,
  createNode,
  updateNode,
  deleteNode,
  generateRealityKeys,
  addSniProfile,
  deleteSniProfile,
  fetchNodeInstallScript,
  fetchNodeSyncScript,
} from '../../services/apiClient';
import type { NodeItem, RealityKeys } from '../../types/node';

export const NodesTab: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reality keys generation state
  const [isGeneratingKeys, setIsGeneratingKeys] = useState<boolean>(false);

  // Form State for Add Node Sheet
  const [name, setName] = useState<string>('');
  const [host, setHost] = useState<string>('');
  const [location, setLocation] = useState<string>('Japan 🇯🇵');
  const [flag, setFlag] = useState<string>('🇯🇵');
  const [grpcPort, setGrpcPort] = useState<string>('10085');
  const [inboundPort, setInboundPort] = useState<string>('443');
  const [realityPrivKey, setRealityPrivKey] = useState<string>('');
  const [realityPubKey, setRealityPubKey] = useState<string>('');
  const [realityShortId, setRealityShortId] = useState<string>('');
  const [carrier, setCarrier] = useState<string>('Docomo 5G');
  const [sniDomain, setSniDomain] = useState<string>('images.apple.com');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // SNI Management Modal State
  const [activeSniNode, setActiveSniNode] = useState<NodeItem | null>(null);
  const [newCarrier, setNewCarrier] = useState<string>('');
  const [newSniDomain, setNewSniDomain] = useState<string>('');
  const [newPort, setNewPort] = useState<string>('');
  const [isAddingSni, setIsAddingSni] = useState<boolean>(false);

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

  const handleGenerateKeys = async () => {
    if (!token) return;
    try {
      setIsGeneratingKeys(true);
      const keys: RealityKeys = await generateRealityKeys(token);
      setRealityPrivKey(keys.private_key);
      setRealityPubKey(keys.public_key);
      setRealityShortId(keys.short_id);
      showToast({
        type: 'success',
        title: 'Reality Keys Generated',
        message: 'New X25519 keypair and short ID generated.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Keygen Error',
        message: err instanceof Error ? err.message : 'Could not generate keys',
      });
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!name.trim() || !host.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Node name and host address are required.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const derivedFlag = location.includes('🇯🇵') ? '🇯🇵' : location.includes('🇸🇬') ? '🇸🇬' : flag || '🌐';

      await createNode(token, {
        name: name.trim(),
        host: host.trim(),
        location: location.trim(),
        flag: derivedFlag,
        grpc_port: parseInt(grpcPort, 10) || 10085,
        inbound_port: parseInt(inboundPort, 10) || 443,
        reality_private_key: realityPrivKey.trim() || undefined,
        reality_public_key: realityPubKey.trim() || undefined,
        reality_short_id: realityShortId.trim() || undefined,
        sni_profiles: sniDomain.trim()
          ? [{ carrier: carrier.trim() || 'Default Carrier', domain: sniDomain.trim() }]
          : [],
      });

      showToast({
        type: 'success',
        title: 'Node Created',
        message: `Node ${name} registered successfully.`,
      });

      // Reset form
      setName('');
      setHost('');
      setLocation('Japan 🇯🇵');
      setFlag('🇯🇵');
      setGrpcPort('10085');
      setInboundPort('443');
      setRealityPrivKey('');
      setRealityPubKey('');
      setRealityShortId('');
      setCarrier('Docomo 5G');
      setSniDomain('images.apple.com');
      setIsAddSheetOpen(false);

      await loadNodes();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message: err instanceof Error ? err.message : 'Failed to register node',
      });
    } finally {
      setIsSubmitting(false);
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
    setNewCarrier('');
    setNewSniDomain('');
    const existingPorts = node.sni_profiles?.map((s) => s.port) || [];
    const nextPort = existingPorts.length > 0 ? Math.max(...existingPorts) + 1 : node.inbound_port;
    setNewPort(String(nextPort));
  };

  const handleAddSniProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeSniNode) return;
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
      await addSniProfile(token, activeSniNode.id, {
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

      // Reload node list and update active modal node
      const updatedNodes = await fetchNodes(token);
      setNodes(updatedNodes);
      const refreshedActive = updatedNodes.find((n) => n.id === activeSniNode.id);
      if (refreshedActive) {
        setActiveSniNode(refreshedActive);
        const ports = refreshedActive.sni_profiles?.map((s) => s.port) || [];
        const next = ports.length > 0 ? Math.max(...ports) + 1 : refreshedActive.inbound_port;
        setNewPort(String(next));
      }
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
    if (!token || !activeSniNode) return;
    try {
      await deleteSniProfile(token, activeSniNode.id, sniId);
      showToast({
        type: 'success',
        title: 'SNI Removed',
        message: 'SNI profile deleted.',
      });
      const updatedNodes = await fetchNodes(token);
      setNodes(updatedNodes);
      const refreshedActive = updatedNodes.find((n) => n.id === activeSniNode.id);
      if (refreshedActive) {
        setActiveSniNode(refreshedActive);
        const ports = refreshedActive.sni_profiles?.map((s) => s.port) || [];
        const next = ports.length > 0 ? Math.max(...ports) + 1 : refreshedActive.inbound_port;
        setNewPort(String(next));
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'SNI Delete Error',
        message: err instanceof Error ? err.message : 'Failed to remove SNI profile',
      });
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
    setScriptDescription('Lightweight sync script: updates /etc/xray/config.json and restarts xray-core in 0.5s without touching other services');
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
                <th className="py-3 px-5">State &amp; Reality Keys</th>
                <th className="py-3 px-5">Carrier SNI Profiles</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading node infrastructure...
                  </td>
                </tr>
              ) : nodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
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
                  <tr key={node.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Node & Region */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl select-none">{node.flag || '🌐'}</span>
                        <div>
                          <span className="font-semibold text-slate-900 block text-sm">{node.name}</span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {node.location || 'Unknown location'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Host IP & Port */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5 font-mono text-slate-700">
                        <span>{node.host}:{node.inbound_port}</span>
                        <button
                          onClick={() => copyToClipboard(node.host, 'Host IP', `host-${node.id}`)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
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
                        gRPC Port: {node.grpc_port}
                      </span>
                    </td>

                    {/* State & Reality Keys */}
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        <Badge
                          variant={node.is_active ? 'emerald' : 'slate'}
                          size="sm"
                          dot={true}
                          pulseDot={node.is_active}
                        >
                          {node.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                          <Key className="w-3 h-3 text-slate-400" />
                          <span>Pub: {node.reality_public_key.substring(0, 8)}...</span>
                          <button
                            onClick={() => copyToClipboard(node.reality_public_key, 'Reality Public Key', `key-${node.id}`)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title="Copy Public Key"
                          >
                            {copiedId === `key-${node.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
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
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-mono"
                              title={`Carrier: ${sni.carrier} | Port: ${sni.port}`}
                            >
                              <span className="font-semibold text-slate-500">{sni.carrier}:</span>
                              <span>{sni.domain}</span>
                              <span className="text-slate-400 font-normal">:{sni.port}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No SNI configured</span>
                        )}
                        <button
                          onClick={() => handleOpenSniModal(node)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-slate-300 text-[11px] text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-colors"
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
                        {/* 1-Line Sync Script */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenSyncScript(node)}
                          title="Quick 1-second sync script for VPS"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Sync</span>
                        </Button>

                        {/* 1-Line Install Script */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenInstallScript(node)}
                          title="View 1-line installation script"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Setup</span>
                        </Button>

                        {/* Toggle Active/Inactive */}
                        <button
                          onClick={() => handleToggleNodeActive(node)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            node.is_active
                              ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              : 'border-slate-200 text-slate-400 hover:bg-slate-100'
                          }`}
                          title={node.is_active ? 'Disable Node' : 'Enable Node'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Node */}
                        <button
                          onClick={() => handleDeleteNode(node)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                          title="Delete Node"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Slide-over Sheet: Add Node Form */}
      <Sheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        title="Register Remote Node"
        description="Connect a VPS instance running xray-core via gRPC API"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddSheetOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddNode}
              disabled={isSubmitting}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'Saving...' : 'Register Node'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddNode} className="space-y-4">
          <Input
            label="Node Name"
            placeholder="e.g. Tokyo Node 01"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            hint="Human-readable identifier for this proxy server"
          />

          <Input
            label="Host / IP Address"
            placeholder="e.g. 159.65.12.88"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
            hint="Public IPv4 or IPv6 of the remote VPS"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Region / Location"
              placeholder="Tokyo, Japan"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Input
              label="Country Flag"
              placeholder="🇯🇵"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="gRPC Control Port"
              placeholder="10085"
              value={grpcPort}
              onChange={(e) => setGrpcPort(e.target.value)}
              hint="Xray Handler & Stats port"
            />
            <Input
              label="Inbound Port"
              placeholder="443"
              value={inboundPort}
              onChange={(e) => setInboundPort(e.target.value)}
              hint="VLESS Reality listener"
            />
          </div>

          {/* Reality Cryptographic Keys Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  Reality X25519 Keys
                </h4>
                <p className="text-[11px] text-slate-500">Auto-generated if left empty</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={handleGenerateKeys}
                disabled={isGeneratingKeys}
                leftIcon={<Sparkles className="w-3 h-3 text-amber-500" />}
              >
                {isGeneratingKeys ? 'Generating...' : 'Auto-Generate'}
              </Button>
            </div>

            <Input
              label="Private Key (optional)"
              placeholder="Auto-generated if empty (base64url)"
              value={realityPrivKey}
              onChange={(e) => setRealityPrivKey(e.target.value)}
            />
            <Input
              label="Public Key (optional)"
              placeholder="Auto-generated if empty"
              value={realityPubKey}
              onChange={(e) => setRealityPubKey(e.target.value)}
            />
            <Input
              label="Short ID (optional)"
              placeholder="Auto-generated 16 hex characters"
              value={realityShortId}
              onChange={(e) => setRealityShortId(e.target.value)}
            />
          </div>

          {/* Initial SNI Profile Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
            <h4 className="text-xs font-semibold text-slate-800">Initial SNI Profile</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Carrier Name"
                placeholder="e.g. Docomo 5G"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
              <Input
                label="Camouflage Domain (SNI)"
                placeholder="images.apple.com"
                value={sniDomain}
                onChange={(e) => setSniDomain(e.target.value)}
              />
            </div>
          </div>
        </form>
      </Sheet>

      {/* Modal: Manage SNI Profiles */}
      <Modal
        isOpen={activeSniNode !== null}
        onClose={() => setActiveSniNode(null)}
        title={`SNI Profiles - ${activeSniNode?.name || ''}`}
        description="Configure multiple carrier-tailored SNI camouflage domains for this node"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Current SNIs List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Configured Profiles ({activeSniNode?.sni_profiles?.length || 0})
            </h4>

            {activeSniNode?.sni_profiles && activeSniNode.sni_profiles.length > 0 ? (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {activeSniNode.sni_profiles.map((sni) => (
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
          {activeSniNode && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-indigo-900">
                <div className="font-semibold text-indigo-950">Apply Changes to VPS</div>
                <div className="text-[11px] text-indigo-700/90">Reload multi-inbound ports on VPS in 0.5s without touching other services.</div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className="w-3.5 h-3.5 text-indigo-600" />}
                onClick={() => handleOpenSyncScript(activeSniNode)}
              >
                View Sync Script
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: 1-Line Installation or Sync Script */}
      <Modal
        isOpen={activeScriptNode !== null}
        onClose={() => setActiveScriptNode(null)}
        title={scriptTitle}
        description={scriptDescription}
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Target Host: <strong className="font-mono text-slate-800">{activeScriptNode?.host}</strong></span>
            <Button
              variant="primary"
              size="sm"
              leftIcon={copiedId === 'script-full' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={() => copyToClipboard(scriptContent, 'Script', 'script-full')}
            >
              {copiedId === 'script-full' ? 'Copied!' : 'Copy Script'}
            </Button>
          </div>

          {isLoadingScript ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Generating script...
            </div>
          ) : (
            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed">
                {scriptContent}
              </pre>
            </div>
          )}

          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900">
            <strong>Usage:</strong> SSH into your remote VPS as root and paste the script directly into bash, or run <code className="font-mono bg-white/70 px-1 py-0.5 rounded text-amber-950">bash -c &quot;$(cat &lt;&lt; &apos;EOF&apos; ... EOF)&quot;</code>.
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NodesTab;
