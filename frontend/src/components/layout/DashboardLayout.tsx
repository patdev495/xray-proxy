import React, { useState } from 'react';
import { Sidebar, type NavTabId } from './Sidebar';
import { Header } from './Header';
import type { ConnectionStatus } from '../../types/api';

interface DashboardLayoutProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  status: ConnectionStatus;
  isRefreshing: boolean;
  onRefresh: () => void;
  lastChecked?: string;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  activeTab,
  onSelectTab,
  status,
  isRefreshing,
  onRefresh,
  lastChecked,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          status={status}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
          lastChecked={lastChecked}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>

        <footer className="border-t border-slate-200/80 py-4 px-6 text-center text-xs text-slate-400 bg-white">
          xray-proxy Control Plane &bull; Built with FastAPI (Python UV) &amp; React TypeScript Tailwind CSS
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
