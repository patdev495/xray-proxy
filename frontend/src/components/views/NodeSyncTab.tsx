import React, { useState } from 'react';
import { 
  Clock, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';

interface SyncLogItem {
  id: string;
  timestamp: string;
  node: string;
  service: 'StatsService' | 'HandlerService';
  operation: string;
  status: 'success' | 'warning' | 'error';
  deltaMb: number;
}

export const NodeSyncTab: React.FC = () => {
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>([
    {
      id: 'log-01',
      timestamp: '15:08:12',
      node: 'Tokyo Node 01 (159.65.12.88)',
      service: 'StatsService',
      operation: 'QueryUserTraffic(pattern="user>>>")',
      status: 'success',
      deltaMb: 142.5,
    },
    {
      id: 'log-02',
      timestamp: '15:08:13',
      node: 'Singapore Node 01 (128.199.204.14)',
      service: 'StatsService',
      operation: 'QueryUserTraffic(pattern="user>>>")',
      status: 'success',
      deltaMb: 89.2,
    },
    {
      id: 'log-03',
      timestamp: '15:05:00',
      node: 'Tokyo Node 01 (159.65.12.88)',
      service: 'HandlerService',
      operation: 'SyncActiveUsers(count=3)',
      status: 'success',
      deltaMb: 0.0,
    },
  ]);

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    // Simulate gRPC round-trip
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newLog: SyncLogItem = {
      id: `log-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      node: 'All Active Nodes (JP-01, SG-01)',
      service: 'StatsService',
      operation: 'QueryUserTraffic + EnforceQuotas',
      status: 'success',
      deltaMb: parseFloat((Math.random() * 50 + 10).toFixed(1)),
    };

    setSyncLogs((prev) => [newLog, ...prev]);
    setLastSyncTime(new Date().toLocaleTimeString());
    setIsSyncing(false);

    showToast({
      type: 'success',
      title: 'Node Sync Complete',
      message: 'Direct gRPC telemetry collected and Traffic Quotas reconciled.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Node Sync &amp; Telemetry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Direct gRPC synchronization with <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">xray-core</code> StatsService and HandlerService.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            isLoading={isSyncing}
            leftIcon={<Zap className="w-4 h-4" />}
            onClick={handleTriggerSync}
          >
            Trigger gRPC Sync Now
          </Button>
        </div>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">Sync State</span>
              <Badge variant="emerald" size="sm" dot={true}>Connected</Badge>
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">gRPC Stream</div>
            <p className="text-xs text-slate-400">Targeting 2 active Nodes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">Last đối soát</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">{lastSyncTime}</div>
            <p className="text-xs text-slate-400">Scheduled interval: every 60s</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">Auto-Enforcement</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900">Active</div>
            <p className="text-xs text-slate-400">1 expired subscription revoked</p>
          </CardContent>
        </Card>
      </div>

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
                <th className="py-3 px-5">Traffic Delta</th>
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
                  <td className="py-3.5 px-5 text-slate-700">
                    {log.deltaMb > 0 ? `+${log.deltaMb} MB` : '0 MB'}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <Badge variant={log.status === 'success' ? 'emerald' : 'rose'} size="sm">
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
