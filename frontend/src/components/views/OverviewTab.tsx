import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Server, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  RefreshCw,
  Activity,
  Users,
  HardDrive,
  Zap,
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
import { formatDateTime } from '../../utils/date';

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
  const { i18n, t } = useTranslation();

  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>(t('admin.justNow'));

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
      setLastRefreshed(formatDateTime(new Date(), i18n.language));
    } catch (err) {
      showToast({
        type: 'error',
        title: t('admin.overviewLoadFailed'),
        message: err instanceof Error ? err.message : t('admin.metricsLoadFailed'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast, i18n.language, t]);

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
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/70 shadow-md shadow-indigo-950/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              {t('admin.welcomeBack', { name: user?.username || 'Administrator' })}
            </h1>
            <Badge variant="emerald" size="sm" dot={true} pulseDot={true}>{t('admin.online')}</Badge>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">&bull; {t('admin.telemetrySynced', { time: lastRefreshed })}</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            {t('admin.overviewDescription')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-indigo-600" />}
            onClick={loadData}
            className="font-bold text-xs"
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Server className="w-3.5 h-3.5 text-cyan-600" />}
            onClick={() => onNavigateTab('nodes')}
            className="font-bold text-xs"
          >
            {t('admin.manageNodes')}
          </Button>
          <Button
            variant="gradient"
            size="sm"
            leftIcon={<Users className="w-3.5 h-3.5" />}
            onClick={() => onNavigateTab('subscriptions')}
            className="font-bold text-xs shadow-md shadow-indigo-500/20"
          >
            {t('admin.issueSubscription')}
          </Button>
        </div>
      </div>

      {/* Bento Grid 1: Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Backend Core Health */}
        <Card className="rounded-3xl border border-indigo-100/70 shadow-md shadow-indigo-950/5 bg-white/90 backdrop-blur-xl hover:-translate-y-1 transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.fastApiCore')}</span>
              <div className={`p-2 rounded-xl ${status === 'connected' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                {status === 'connected' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {health ? health.status.toUpperCase() : 'ONLINE'}
            </div>
            <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              v{health?.version || '0.1.0'} &bull; SQLite Async Active
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Active Data Plane Nodes */}
        <Card hoverable onClick={() => onNavigateTab('nodes')} className="rounded-3xl border border-cyan-100/70 shadow-md shadow-cyan-950/5 bg-white/90 backdrop-blur-xl hover:-translate-y-1 transition-all cursor-pointer">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.managedNodes')}</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600">
                <Server className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {t('admin.activeTotal', { active: activeNodes.length, total: nodes.length })}
            </div>
            <p className="text-xs text-slate-500 truncate font-medium">
              {activeNodes.length > 0 
                ? activeNodes.map(n => `${n.flag || '🌐'} ${n.name}`).join(' • ')
                : t('admin.noActiveNodes')}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Active Subscriptions */}
        <Card hoverable onClick={() => onNavigateTab('subscriptions')} className="rounded-3xl border border-indigo-100/70 shadow-md shadow-indigo-950/5 bg-white/90 backdrop-blur-xl hover:-translate-y-1 transition-all cursor-pointer">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.subscriptions')}</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {t('admin.activeTotal', { active: activeSubs.length, total: subscriptions.length })}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {t('admin.subscriptionState', { suspended: suspendedSubs.length, expired: expiredSubs.length })}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Protocol Stack */}
        <Card className="rounded-3xl border border-purple-100/70 shadow-md shadow-purple-950/5 bg-white/90 backdrop-blur-xl hover:-translate-y-1 transition-all">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.proxyCamouflage')}</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                <Radio className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              VLESS-Reality
            </div>
            <p className="text-xs text-slate-500 font-medium">
              TLS 1.3 &bull; TCP 8443 &bull; SNI Carrier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bento Grid 2: Bandwidth Quota Spectrum & System Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Quota Progress Bento Card */}
        <Card className="lg:col-span-2 rounded-3xl border border-indigo-100/80 shadow-md shadow-indigo-950/5 bg-white/95 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">{t('admin.bandwidthSpectrum')}</CardTitle>
                <CardDescription>
                  {t('admin.bandwidthDescription')}
                </CardDescription>
              </div>
              <Badge 
                variant={percentUsed > 90 ? 'rose' : percentUsed > 70 ? 'amber' : 'emerald'} 
                size="md"
                dot={true}
              >
                {percentUsed < 70 ? t('admin.normalCapacity') : percentUsed > 90 ? t('admin.criticalBandwidth') : t('admin.heavyTraffic')} ({percentUsed.toFixed(1)}%)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProgressBar
              value={totalUsedGb}
              max={totalQuotaGb > 0 ? totalQuotaGb : 1}
              showLabel={true}
              height="lg"
              variant="auto"
              labelFormat={() => (
                <div className="flex items-center justify-between text-xs text-slate-600 font-mono tabular-nums pb-1">
                  <span className="font-medium">{t('admin.consumedQuota', { used: formatDataSize(totalUsedBytes), total: totalQuotaGb.toFixed(1) })}</span>
                  <span className="font-extrabold text-indigo-700">{percentUsed.toFixed(1)}%</span>
                </div>
              )}
            />

            {/* 3 Metric Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-1">
                  <HardDrive className="w-4 h-4" />
                  <span>{t('admin.totalQuota')}</span>
                </div>
                <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
                  {totalQuotaGb.toFixed(1)} GB
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-100">
                <div className="flex items-center gap-2 text-cyan-700 text-xs font-bold mb-1">
                  <Zap className="w-4 h-4" />
                  <span>{t('admin.bandwidthUsed')}</span>
                </div>
                <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
                  {formatDataSize(totalUsedBytes)}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('admin.remainingQuota')}</span>
                </div>
                <span className="text-xl font-black text-emerald-700 font-mono tabular-nums">
                  {totalRemainingGb.toFixed(1)} GB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Services & Engine Bento Card */}
        <Card className="rounded-3xl border border-indigo-100/80 shadow-md shadow-indigo-950/5 bg-white/95 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t('admin.servicesStatus')}</CardTitle>
                <CardDescription>{t('admin.servicesDescription')}</CardDescription>
              </div>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 block">{t('admin.webControlPlane')}</span>
                <span className="text-[10px] text-emerald-700 font-mono">FastAPI :8040 &bull; SSL Nginx</span>
              </div>
              <Badge variant="emerald" size="sm" dot={true}>{t('admin.online')}</Badge>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
              <div>
                <span className="font-bold text-cyan-950 block">{t('admin.xrayDataPlane')}</span>
                <span className="text-[10px] text-cyan-700 font-mono">VLESS-Reality :8443</span>
              </div>
              <Badge variant="cyan" size="sm" dot={true}>{t('admin.listening')}</Badge>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
              <div>
                <span className="font-bold text-indigo-950 block">{t('admin.grpcChannel')}</span>
                <span className="text-[10px] text-indigo-700 font-mono">Handler &amp; Stats :10085</span>
              </div>
              <Badge variant="indigo" size="sm" dot={true}>{t('admin.streaming')}</Badge>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">{t('admin.telemetryPoller')}</span>
                <span className="text-[10px] text-slate-500 font-mono">Sync Interval: 300s</span>
              </div>
              <Badge variant="slate" size="sm">{t('admin.active')}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;
