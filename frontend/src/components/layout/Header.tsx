import React from 'react';
import { Menu, RefreshCw, ExternalLink, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import type { ConnectionStatus } from '../../types/api';
import type { NavTabId } from './Sidebar';
import { LanguageSelector } from '../ui/LanguageSelector';

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
  const { logout } = useAuth();
  const { t } = useTranslation();

  const tabTitles: Record<NavTabId, { title: string; subtitle: string }> = {
    overview: {
      title: t('navigation.overview'),
      subtitle: t('admin.overviewSubtitle'),
    },
    nodes: {
      title: t('navigation.nodes'),
      subtitle: t('admin.nodesSubtitle'),
    },
    subscriptions: {
      title: t('navigation.subscriptions'),
      subtitle: t('admin.subscriptionsSubtitle'),
    },
    plans: {
      title: t('navigation.plans'),
      subtitle: t('admin.plansSubtitle'),
    },
    orders: {
      title: t('navigation.orders'),
      subtitle: t('admin.ordersSubtitle'),
    },
    sync: {
      title: t('navigation.sync'),
      subtitle: t('admin.syncSubtitle'),
    },
  };

  const statusVariants: Record<
    ConnectionStatus,
    { variant: 'emerald' | 'amber' | 'rose'; label: string; pulse: boolean }
  > = {
    connected: { variant: 'emerald', label: t('admin.online'), pulse: true },
    checking: { variant: 'amber', label: t('admin.checking'), pulse: true },
    degraded: { variant: 'amber', label: t('admin.degraded'), pulse: false },
    offline: { variant: 'rose', label: t('admin.offline'), pulse: false },
  };

  const currentStatus = statusVariants[status];

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-white/60 px-4 sm:px-8 py-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Breadcrumb */}
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              title={t('navigation.openNavigation')}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>{t('navigation.controlPlane')}</span>
              <span>/</span>
              <span className="font-semibold text-indigo-600">{tabTitles[activeTab].title}</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight mt-0.5">
              {tabTitles[activeTab].title}
            </h2>
          </div>
        </div>

        {/* Right: Telemetry Actions & Status Indicator */}
        <div className="flex items-center gap-3">
          <LanguageSelector />
          {/* Backend Status Badge */}
          <Badge
            variant={currentStatus.variant}
            size="md"
            dot={true}
            pulseDot={currentStatus.pulse}
            className="shadow-xs font-bold"
          >
            {currentStatus.label}
          </Badge>

          {/* Refresh Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            isLoading={isRefreshing}
            leftIcon={!isRefreshing && <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />}
            title={lastChecked ? t('admin.lastRefreshed', { time: lastChecked }) : t('admin.refreshTelemetry')}
            className="font-semibold text-xs"
          >
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>

          {/* API Docs Link */}
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 border border-slate-200/90 transition-all hover:-translate-y-0.5 shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t('admin.fastApiDocs')}</span>
          </a>

          {/* Sign Out Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-400" />}
            className="text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50"
            title={t('admin.signOutTitle')}
          >
            <span className="hidden sm:inline">{t('common.signOut')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
