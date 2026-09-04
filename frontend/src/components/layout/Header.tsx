import React from 'react';
import { Menu, RefreshCw, ExternalLink } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { ConnectionStatus } from '../../types/api';
import type { NavTabId } from './Sidebar';

interface HeaderProps {
  activeTab: NavTabId;
  status: ConnectionStatus;
  isRefreshing: boolean;
  onRefresh: () => void;
  lastChecked?: string;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  status,
  isRefreshing,
  onRefresh,
  lastChecked,
  onToggleMobileMenu,
}) => {
  const tabTitles: Record<NavTabId, { title: string; subtitle: string }> = {
    overview: {
      title: 'System Overview',
      subtitle: 'Real-time telemetry across Control Plane and Data Plane nodes',
    },
    nodes: {
      title: 'Nodes & SNI Profiles',
      subtitle: 'Manage remote VPS instances running xray-core and carrier SNI overrides',
    },
    subscriptions: {
      title: 'Customer Subscriptions',
      subtitle: 'Traffic Quotas, token issuance, and Client App bundles (Shadowrocket)',
    },
    sync: {
      title: 'Node Sync & Telemetry',
      subtitle: 'Manual gRPC bandwidth query and automatic quota enforcement',
    },
  };

  const statusVariants: Record<
    ConnectionStatus,
    { variant: 'emerald' | 'amber' | 'rose'; label: string; pulse: boolean }
  > = {
    connected: { variant: 'emerald', label: 'Backend Online', pulse: true },
    checking: { variant: 'amber', label: 'Checking...', pulse: true },
    degraded: { variant: 'amber', label: 'Degraded', pulse: false },
    offline: { variant: 'rose', label: 'Backend Offline', pulse: false },
  };

  const currentStatus = statusVariants[status];

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Breadcrumb */}
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Control Plane</span>
              <span>/</span>
              <span className="font-medium text-slate-700">{tabTitles[activeTab].title}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
              {tabTitles[activeTab].title}
            </h2>
          </div>
        </div>

        {/* Right: Telemetry Actions & Status Indicator */}
        <div className="flex items-center gap-3">
          {/* Backend Status Badge */}
          <Badge
            variant={currentStatus.variant}
            size="md"
            dot={true}
            pulseDot={currentStatus.pulse}
            className="shadow-2xs font-medium"
          >
            {currentStatus.label}
          </Badge>

          {/* Refresh Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            isLoading={isRefreshing}
            leftIcon={!isRefreshing && <RefreshCw className="w-3.5 h-3.5" />}
            title={lastChecked ? `Last refreshed: ${lastChecked}` : 'Refresh telemetry'}
          >
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* API Docs Link */}
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>API Docs</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
