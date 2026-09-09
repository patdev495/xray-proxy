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
    <div className="min-h-screen bg-aurora-mesh flex font-sans text-slate-900 selection:bg-indigo-600 selection:text-white relative">
      {/* Ambient decorative glow */}
      <div className="fixed top-0 left-64 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

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

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>

        <footer className="border-t border-slate-200/60 py-4 px-6 text-center text-xs text-slate-400 bg-white/60 backdrop-blur-md">
          xray-proxy Control Plane &bull; High-Performance VLESS-Reality &amp; gRPC Traffic Management
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
