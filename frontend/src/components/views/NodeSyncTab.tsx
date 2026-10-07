import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatDateTime } from '../../utils/date';

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
  const { i18n, t } = useTranslation();

  const [isSyncingStats, setIsSyncingStats] = useState<boolean>(false);
  const [isEnforcingLimits, setIsEnforcingLimits] = useState<boolean>(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(t('sync.never'));
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [suspendedTotal, setSuspendedTotal] = useState<number>(0);

  const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>([
    {
      id: 'init-01',
      timestamp: formatDateTime(new Date(), i18n.language),
      node: t('sync.system'),
      service: 'StatsService',
      operation: t('sync.pollerInterval'),
      status: 'success',
      deltaInfo: t('sync.standby'),
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
        title: t('sync.statusFetchFailed'),
        message: err instanceof Error ? err.message : t('sync.statusFetchMessage'),
      });
    } finally {
      setIsLoadingStatus(false);
    }
  }, [token, showToast, t]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSyncLiveStats = async () => {
    if (!token) return;
    setIsSyncingStats(true);
    try {
      const resp = await triggerLiveStatsSync(token);
      const timeStr = formatDateTime(new Date(), i18n.language);
      setLastSyncTime(timeStr);

      const newLog: SyncLogItem = {
        id: `log-${Date.now()}-1`,
        timestamp: timeStr,
        node: `${t('sync.activeNodes')} (${resp.details.synced_nodes})`,
        service: 'StatsService',
        operation: `QueryStats: ${resp.details.updated_subscriptions}`,
        status: 'success',
        deltaInfo: t('sync.liveStats'),
      };

      const extraLogs: SyncLogItem[] = [];
      if (resp.details.suspended_count > 0) {
        setSuspendedTotal((prev) => prev + resp.details.suspended_count);
        extraLogs.push({
          id: `log-${Date.now()}-2`,
          timestamp: timeStr,
          node: t('sync.activeNodes'),
          service: 'HandlerService',
          operation: t('sync.accountsSuspended', { count: resp.details.suspended_count }),
          status: 'warning',
          deltaInfo: t('sync.autoEnforcement'),
        });
      }

      setSyncLogs((prev) => [...extraLogs, newLog, ...prev]);

      showToast({
        type: 'success',
        title: t('sync.statsPolled'),
        message: t('sync.statsPolledMessage', { nodes: resp.details.synced_nodes, subscriptions: resp.details.updated_subscriptions, suspended: resp.details.suspended_count }),
      });

      await loadStatus();
    } catch (err) {
      showToast({
        type: 'error',
        title: t('sync.syncFailed'),
        message: err instanceof Error ? err.message : t('sync.syncFailedMessage'),
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
      const timeStr = formatDateTime(new Date(), i18n.language);
      setLastSyncTime(timeStr);

      if (resp.details.suspended_count > 0) {
        setSuspendedTotal((prev) => prev + resp.details.suspended_count);
      }

      const newLog: SyncLogItem = {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        node: t('sync.activeNodes'),
        service: 'HandlerService',
        operation: t('sync.accountsSuspended', { count: resp.details.suspended_count }),
        status: resp.details.suspended_count > 0 ? 'warning' : 'success',
        deltaInfo: t('sync.accountsSuspended', { count: resp.details.suspended_count }),
      };

      setSyncLogs((prev) => [newLog, ...prev]);

      showToast({
        type: 'success',
        title: t('sync.limitsEvaluated'),
        message: t('sync.limitsMessage', { count: resp.details.suspended_count }),
      });

      await loadStatus();
    } catch (err) {
      showToast({
        type: 'error',
        title: t('sync.enforcementFailed'),
        message: err instanceof Error ? err.message : t('sync.enforcementMessage'),
      });
    } finally {
      setIsEnforcingLimits(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t('sync.title')}</h2>
            <Badge variant="cyan" size="sm" dot={true}>gRPC Live</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('sync.description')}
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
            {t('sync.forceLimits')}
          </Button>

          <Button
            variant="gradient"
            size="sm"
            isLoading={isSyncingStats}
            leftIcon={<Zap className="w-4 h-4 text-white" />}
            onClick={handleSyncLiveStats}
          >
            {t('sync.liveStats')}
          </Button>
        </div>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="glass" className="hover-lift relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-80" />
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">{t('sync.grpcStatus')}</span>
              <Badge 
                variant={syncStatus && syncStatus.active_nodes_count > 0 ? 'emerald' : 'slate'} 
                size="sm" 
                dot={true}
              >
                {syncStatus && syncStatus.active_nodes_count > 0 ? t('sync.connected') : t('sync.noNodes')}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {syncStatus?.active_nodes_count || 0} <span className="text-sm font-sans font-medium text-slate-500">{t('sync.activeNodes')}</span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-500" />
              {t('sync.daemonChannels')}
            </p>
          </CardContent>
        </Card>

        <Card variant="glass" className="hover-lift relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-80" />
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">{t('sync.lastSync')}</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{lastSyncTime}</div>
            <p className="text-xs text-slate-400">{t('sync.pollerInterval')}</p>
          </CardContent>
        </Card>

        <Card variant="glass" className="hover-lift relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">{t('sync.autoEnforcement')}</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 font-mono tracking-tight">{t('admin.active')}</div>
            <p className="text-xs text-slate-400">
              {suspendedTotal > 0 ? t('sync.accountsSuspended', { count: suspendedTotal }) : t('sync.allWithinQuota')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Nodes Connectivity Status */}
      <Card variant="glass">
        <CardHeader className="border-b border-slate-100/80">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">{t('sync.telemetryChannels')}</CardTitle>
              <CardDescription>{t('sync.telemetryChannelsDescription')}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadStatus}
              disabled={isLoadingStatus}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingStatus ? 'animate-spin' : ''}`} />}
            >
              {t('sync.refreshStatus')}
            </Button>
          </div>
        </CardHeader>
        <div className="p-5">
          {isLoadingStatus ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
              {t('sync.pollingNodes')}
            </div>
          ) : !syncStatus?.nodes || syncStatus.nodes.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Server className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              {t('sync.noNodesDescription')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {syncStatus.nodes.map((node: NodeGrpcStatus) => (
                <div 
                  key={node.id} 
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 bg-white/60 hover:bg-white transition-all hover:shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      node.is_reachable 
                        ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20' 
                        : 'bg-rose-50 text-rose-600 ring-1 ring-rose-500/20'
                    }`}>
                      <Server className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-slate-900">{node.name}</div>
                      <div className="text-xs font-mono text-slate-500">
                        {node.host}:{node.grpc_port}
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={node.is_reachable ? 'emerald' : 'rose'} 
                    size="sm" 
                    dot={true}
                  >
                    {node.is_reachable ? t('sync.grpcActive') : t('sync.unreachable')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card variant="glass">
        <CardHeader className="border-b border-slate-100/80">
          <CardTitle className="text-base font-bold text-slate-900">{t('sync.auditLog')}</CardTitle>
          <CardDescription>{t('sync.auditDescription')}</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-5">{t('portal.timestamp')}</th>
                <th className="py-3 px-5">{t('sync.targetNode')}</th>
                <th className="py-3 px-5">{t('sync.grpcInterface')}</th>
                <th className="py-3 px-5">{t('sync.operation')}</th>
                <th className="py-3 px-5">{t('sync.detail')}</th>
                <th className="py-3 px-5 text-right">{t('sync.result')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {syncLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-5 text-slate-500">{log.timestamp}</td>
                  <td className="py-3.5 px-5 text-slate-800 font-sans font-medium">{log.node}</td>
                  <td className="py-3.5 px-5">
                    <span className="font-sans px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100">
                      {log.service}
                    </span>
                  </td>
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
