import React, { useEffect, useState, useCallback } from 'react';
import { 
  Server, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  RefreshCw,
  Activity,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Button } from '../ui/Button';
import type { HealthResponse, ConnectionStatus } from '../../types/api';
import type { NavTabId } from '../layout/Sidebar';
import type { NodeItem } from '../../types/node';
import type { SubscriptionItem } from '../../types/subscription';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fetchNodes, fetchSubscriptions } from '../../services/apiClient';

interface OverviewTabProps {
  health: HealthResponse | null;
  status: ConnectionStatus;
  onNavigateTab: (tab: NavTabId) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  health,
  status,
  onNavigateTab,
}) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');


  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const [nodesData, subsData] = await Promise.all([
        fetchNodes(token),
        fetchSubscriptions(token),
      ]);
      setNodes(nodesData);
      setSubscriptions(subsData);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Overview Load Failed',
        message: err instanceof Error ? err.message : 'Failed to load system metrics',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate Metrics
  const activeNodes = nodes.filter((n) => n.is_active);
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
  const suspendedSubs = subscriptions.filter((s) => s.status === 'SUSPENDED');
  const expiredSubs = subscriptions.filter((s) => s.status === 'EXPIRED');

  const totalQuotaBytes = subscriptions.reduce((acc, s) => acc + s.traffic_quota_bytes, 0);
  const totalUsedBytes = subscriptions.reduce((acc, s) => acc + s.traffic_used_bytes, 0);
  const totalRemainingBytes = Math.max(0, totalQuotaBytes - totalUsedBytes);

  const totalQuotaGb = totalQuotaBytes / (1024 * 1024 * 1024);
  const totalUsedGb = totalUsedBytes / (1024 * 1024 * 1024);
  const totalRemainingGb = totalRemainingBytes / (1024 * 1024 * 1024);

  const percentUsed = totalQuotaBytes > 0 ? (totalUsedBytes / totalQuotaBytes) * 100 : 0;

  const formatDataSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${bytes} B`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.username || 'Administrator'}
            </h1>
            <Badge variant="emerald" size="sm" dot={true}>Control Plane Online</Badge>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">&bull; Updated {lastRefreshed}</span>
          </div>

          <p className="text-xs text-slate-500 mt-1">
            Real-time management for Xray VLESS-Reality nodes, customer traffic telemetry, and automated quota enforcement.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={loadData}
          >
            Refresh Data
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Server className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('nodes')}
          >
            Manage Nodes
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Users className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('subscriptions')}
          >
            Issue Subscription
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Backend Core Health */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FastAPI Core</span>
              <div className={`p-2 rounded-lg ${status === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {status === 'connected' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {health ? health.status.toUpperCase() : 'ONLINE'}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              v{health?.version || '0.1.0'} &bull; SQLite Async Active
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Active Data Plane Nodes */}
        <Card hoverable onClick={() => onNavigateTab('nodes')} className="cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Managed Nodes</span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
              {activeNodes.length} Active <span className="text-sm font-normal text-slate-400 font-sans">/ {nodes.length} total</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {activeNodes.length > 0 
                ? activeNodes.map(n => `${n.flag || '🌐'} ${n.name}`).join(' • ')
                : 'No nodes configured yet'}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Active Subscriptions */}
        <Card hoverable onClick={() => onNavigateTab('subscriptions')} className="cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscriptions</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
              {activeSubs.length} Active <span className="text-sm font-normal text-slate-400 font-sans">/ {subscriptions.length} issued</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {suspendedSubs.length} suspended &bull; {expiredSubs.length} expired
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Protocol Stack */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Protocol Stack</span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              VLESS-Reality
            </div>
            <p className="text-xs text-slate-500 mt-1">
              TCP Port 8443 &bull; IPv4 Optimized
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bandwidth Quota & Telemetry Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Quota Progress Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Bandwidth Utilization</CardTitle>
                <CardDescription>
                  Cumulative uplink &amp; downlink consumption across all customer subscriptions
                </CardDescription>
              </div>
              <Badge 
                variant={percentUsed > 90 ? 'rose' : percentUsed > 70 ? 'amber' : 'emerald'} 
                size="sm"
              >
                {percentUsed < 70 ? 'Healthy' : percentUsed < 90 ? 'Moderate' : 'High Usage'} ({percentUsed.toFixed(1)}%)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProgressBar
              value={totalUsedGb}
              max={totalQuotaGb > 0 ? totalQuotaGb : 1}
              showLabel={true}
              height="md"
              labelFormat={() => (
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span>{formatDataSize(totalUsedBytes)} Consumed / {totalQuotaGb.toFixed(1)} GB Total Cap</span>
                  <span className="font-semibold text-slate-700">{percentUsed.toFixed(1)}%</span>
                </div>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block">Total Quota Cap</span>
                <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                  {totalQuotaGb.toFixed(1)} GB
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block">Total Consumed</span>
                <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                  {formatDataSize(totalUsedBytes)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block">Remaining Quota</span>
                <span className="text-lg font-bold text-emerald-700 font-mono tabular-nums">
                  {totalRemainingGb.toFixed(1)} GB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Services & Engine Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Service Fleet Status</CardTitle>
                <CardDescription>Core processes running on control &amp; data planes</CardDescription>
              </div>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-emerald-950 block">Web Control Plane</span>
                <span className="text-[10px] text-emerald-700 font-mono">FastAPI :8040 &bull; SSL Nginx</span>
              </div>
              <Badge variant="emerald" size="sm" dot={true}>ONLINE</Badge>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-emerald-950 block">Xray Data Plane</span>
                <span className="text-[10px] text-emerald-700 font-mono">VLESS-Reality :8443</span>
              </div>
              <Badge variant="emerald" size="sm" dot={true}>LISTENING</Badge>
            </div>

            <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-indigo-950 block">gRPC Control Channel</span>
                <span className="text-[10px] text-indigo-700 font-mono">Handler &amp; Stats :10085</span>
              </div>
              <Badge variant="indigo" size="sm">ACTIVE</Badge>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">Bandwidth Telemetry Poller</span>
                <span className="text-[10px] text-slate-500 font-mono">Periodic interval: 300s</span>
              </div>
              <Badge variant="slate" size="sm">STANDBY</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;
