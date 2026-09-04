import React from 'react';
import { 
  Server, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Button } from '../ui/Button';
import type { HealthResponse, ConnectionStatus } from '../../types/api';
import { useAuth } from '../../context/AuthContext';

interface OverviewTabProps {
  health: HealthResponse | null;
  status: ConnectionStatus;
  onNavigateTab: (tab: 'nodes' | 'subscriptions' | 'sync') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  health,
  status,
  onNavigateTab,
}) => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.username || 'Administrator'}
            </h1>
            <Badge variant="emerald" size="sm" dot={true}>Session Active</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control Plane orchestrator connected. Centralized management for Xray VLESS-Reality nodes and Customer subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigateTab('nodes')}
          >
            Manage Nodes
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigateTab('subscriptions')}
          >
            Issue Subscription
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Backend Health */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FastAPI Core</span>
              <div className={`p-2 rounded-lg ${status === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {status === 'connected' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {health ? health.status.toUpperCase() : 'CHECKING'}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              v{health?.version || '0.1.0'} &bull; SQLite Async
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Active Data Plane Nodes */}
        <Card hoverable onClick={() => onNavigateTab('nodes')} className="cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Plane Nodes</span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              2 Active
            </div>
            <p className="text-xs text-slate-500 mt-1">
              🇯🇵 Tokyo (JP-01) &bull; 🇸🇬 SG-01
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
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              3 Issued
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              100% Client App Compatible
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Protocol Stack */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inbound Protocol</span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              VLESS-Reality
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Multi-Carrier SNI (Docomo, SoftBank)
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
                <CardTitle>Total Bandwidth Consumption</CardTitle>
                <CardDescription>Aggregate usage across all active Customer subscriptions</CardDescription>
              </div>
              <Badge variant="emerald" size="sm">Healthy (28.4%)</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProgressBar
              value={71.2}
              max={250.0}
              showLabel={true}
              height="md"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block">Total Quota Cap</span>
                <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">250.0 GB</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block">Total Consumed</span>
                <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">71.2 GB</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-medium block">Remaining Quota</span>
                <span className="text-lg font-bold text-emerald-700 font-mono tabular-nums">178.8 GB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roadmap Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sprint Roadmap</CardTitle>
            <CardDescription>MVP milestones from .scratch/</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-emerald-900 block">01. Foundation Scaffold</span>
                <span className="text-[10px] text-emerald-700 font-mono">FastAPI + UV + React</span>
              </div>
              <Badge variant="emerald" size="sm">DONE</Badge>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-emerald-900 block">02. Admin Auth &amp; Session</span>
                <span className="text-[10px] text-emerald-700 font-mono">JWT + bcrypt + Session Gate</span>
              </div>
              <Badge variant="emerald" size="sm">DONE</Badge>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">03. Node &amp; SNI Profiles</span>
                <span className="text-[10px] text-slate-500 font-mono">gRPC sync + Carrier SNI</span>
              </div>
              <Badge variant="indigo" size="sm">ACTIVE</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;
