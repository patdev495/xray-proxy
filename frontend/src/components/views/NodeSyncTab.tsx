import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Zap, 
  ShieldCheck,
  RefreshCw,
  Server
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { 
  triggerLiveStatsSync, 
  triggerEnforceLimits, 
  fetchSyncStatus 
} from '../../services/apiClient';
import type { SyncStatusResponse, NodeGrpcStatus } from '../../types/sync';

interface SyncLogItem {
  id: string;
  timestamp: string;
  node: string;
  service: 'StatsService' | 'HandlerService';
  operation: string;
  status: 'success' | 'warning' | 'error';
  deltaInfo: string;
}

export const NodeSyncTab: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [isSyncingStats, setIsSyncingStats] = useState<boolean>(false);
  const [isEnforcingLimits, setIsEnforcingLimits] = useState<boolean>(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never');
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [suspendedTotal, setSuspendedTotal] = useState<number>(0);

  const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>([
    {
      id: 'init-01',
      timestamp: new Date().toLocaleTimeString(),
      node: 'System',
      service: 'StatsService',
      operation: 'Background Poller standby (every 300s)',
      status: 'success',
      deltaInfo: 'Standby',
    },
  ]);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoadingStatus(true);
      const data = await fetchSyncStatus(token);
      setSyncStatus(data);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Status Fetch Failed',
        message: err instanceof Error ? err.message : 'Could not fetch node sync status',
      });
    } finally {
      setIsLoadingStatus(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSyncLiveStats = async () => {
    if (!token) return;
    setIsSyncingStats(true);
    try {
      const resp = await triggerLiveStatsSync(token);
      const timeStr = new Date().toLocaleTimeString();
      setLastSyncTime(timeStr);

      const newLog: SyncLogItem = {
        id: `log-${Date.now()}-1`,
        timestamp: timeStr,
        node: `All Nodes (${resp.details.synced_nodes})`,
        service: 'StatsService',
        operation: `QueryStats: ${resp.details.updated_subscriptions} subs updated`,
        status: 'success',
        deltaInfo: `Delta Polled`,
      };

      const extraLogs: SyncLogItem[] = [];
      if (resp.details.suspended_count > 0) {
        setSuspendedTotal((prev) => prev + resp.details.suspended_count);
        extraLogs.push({
          id: `log-${Date.now()}-2`,
          timestamp: timeStr,
          node: `All Nodes`,
          service: 'HandlerService',
          operation: `Auto-Enforcement: ${resp.details.suspended_count} subscriptions suspended`,
          status: 'warning',
          deltaInfo: 'Limit Exceeded',
        });
      }

      setSyncLogs((prev) => [...extraLogs, newLog, ...prev]);

      showToast({
        type: 'success',
        title: 'Live Stats Polled',
        message: `Synced ${resp.details.synced_nodes} nodes, updated ${resp.details.updated_subscriptions} subscriptions (${resp.details.suspended_count} suspended).`,
      });

      await loadStatus();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Sync Failed',
        message: err instanceof Error ? err.message : 'Failed to poll live stats',
      });
    } finally {
      setIsSyncingStats(false);
    }
  };

  const handleForceEnforceLimits = async () => {
    if (!token) return;
    setIsEnforcingLimits(true);
    try {
      const resp = await triggerEnforceLimits(token);
      const timeStr = new Date().toLocaleTimeString();
      setLastSyncTime(timeStr);

      if (resp.details.suspended_count > 0) {
        setSuspendedTotal((prev) => prev + resp.details.suspended_count);
      }

      const newLog: SyncLogItem = {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        node: `All Nodes`,
        service: 'HandlerService',
        operation: `Manual Limit Check: ${resp.details.suspended_count} suspended`,
        status: resp.details.suspended_count > 0 ? 'warning' : 'success',
        deltaInfo: `${resp.details.suspended_count} Suspended`,
      };

      setSyncLogs((prev) => [newLog, ...prev]);

      showToast({
        type: 'success',
        title: 'Limits Evaluated',
        message: `Policies enforced. ${resp.details.suspended_count} accounts suspended.`,
      });

      await loadStatus();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Enforcement Failed',
        message: err instanceof Error ? err.message : 'Failed to enforce limits',
      });
    } finally {
      setIsEnforcingLimits(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Node Sync &amp; Telemetry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Direct gRPC synchronization with <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">xray-core</code> StatsService and HandlerService.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            isLoading={isEnforcingLimits}
            leftIcon={<ShieldCheck className="w-4 h-4 text-slate-600" />}
            onClick={handleForceEnforceLimits}
          >
            Force Check Limits
          </Button>

          <Button
            variant="primary"
            size="sm"
            isLoading={isSyncingStats}
            leftIcon={<Zap className="w-4 h-4" />}
            onClick={handleSyncLiveStats}
          >
            Sync Live Stats
          </Button>
        </div>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">Node gRPC Status</span>
              <Badge 
                variant={syncStatus && syncStatus.active_nodes_count > 0 ? 'emerald' : 'slate'} 
                size="sm" 
                dot={true}
              >
                {syncStatus && syncStatus.active_nodes_count > 0 ? 'Connected' : 'No Nodes'}
              </Badge>
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {syncStatus?.active_nodes_count || 0} Active Nodes
            </div>
            <p className="text-xs text-slate-400">gRPC ports monitored</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">Last Sync</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">{lastSyncTime}</div>
            <p className="text-xs text-slate-400">Background Poller: every 300s</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">Auto-Enforcement</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">Active</div>
            <p className="text-xs text-slate-400">
              {suspendedTotal > 0 ? `${suspendedTotal} accounts suspended` : 'All accounts within quota'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Nodes Connectivity Status */}
      <Card>
        <CardHeader>
          <CardTitle>Active Nodes gRPC Telemetry Channels</CardTitle>
          <CardDescription>Direct reachability to xray-core management port on each managed VPS</CardDescription>
        </CardHeader>
        <div className="p-5 pt-0">
          {isLoadingStatus ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-slate-400" />
              Checking node reachability...
            </div>
          ) : !syncStatus?.nodes || syncStatus.nodes.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              <Server className="w-5 h-5 mx-auto mb-1 text-slate-300" />
              No active nodes found. Add a node in the Nodes tab to start syncing.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {syncStatus.nodes.map((node: NodeGrpcStatus) => (
                <div 
                  key={node.id} 
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-900">{node.name}</div>
                    <div className="text-xs font-mono text-slate-500">
                      {node.host}:{node.grpc_port}
                    </div>
                  </div>
                  <Badge 
                    variant={node.is_reachable ? 'emerald' : 'rose'} 
                    size="sm" 
                    dot={true}
                  >
                    {node.is_reachable ? 'gRPC Active' : 'Unreachable'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>gRPC Synchronization Audit Log</CardTitle>
          <CardDescription>Real-time record of StatsService bandwidth queries and HandlerService user disconnections</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Target Node</th>
                <th className="py-3 px-5">gRPC Interface</th>
                <th className="py-3 px-5">Operation</th>
                <th className="py-3 px-5">Detail</th>
                <th className="py-3 px-5 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {syncLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-5 text-slate-500">{log.timestamp}</td>
                  <td className="py-3.5 px-5 text-slate-800 font-sans font-medium">{log.node}</td>
                  <td className="py-3.5 px-5 text-indigo-700 font-medium">{log.service}</td>
                  <td className="py-3.5 px-5 text-slate-600 max-w-xs truncate">{log.operation}</td>
                  <td className="py-3.5 px-5 text-slate-700">{log.deltaInfo}</td>
                  <td className="py-3.5 px-5 text-right">
                    <Badge 
                      variant={log.status === 'success' ? 'emerald' : log.status === 'warning' ? 'amber' : 'rose'} 
                      size="sm"
                    >
                      {log.status.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default NodeSyncTab;
