import React, { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchHealth } from './services/apiClient';
import type { HealthResponse, ConnectionStatus } from './types/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPage } from './components/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import type { NavTabId } from './components/layout/Sidebar';
import { OverviewTab } from './components/views/OverviewTab';
import { NodesTab } from './components/views/NodesTab';
import { SubscriptionsTab } from './components/views/SubscriptionsTab';
import { NodeSyncTab } from './components/views/NodeSyncTab';

const AuthenticatedDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabId>('overview');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastChecked, setLastChecked] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const checkConnection = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchHealth();
      setHealth(data);
      setStatus(data.status === 'ok' ? 'connected' : 'degraded');
      setLastChecked(new Date().toLocaleTimeString());
    } catch {
      setStatus('offline');
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return (
    <DashboardLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      status={status}
      isRefreshing={isRefreshing}
      onRefresh={checkConnection}
      lastChecked={lastChecked}
    >
      {activeTab === 'overview' && (
        <OverviewTab
          health={health}
          status={status}
          onNavigateTab={setActiveTab}
        />
      )}
      {activeTab === 'nodes' && <NodesTab />}
      {activeTab === 'subscriptions' && <SubscriptionsTab />}
      {activeTab === 'sync' && <NodeSyncTab />}
    </DashboardLayout>
  );
};

const AuthGate: React.FC = () => {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-slate-800" />
          <span className="text-xs font-medium tracking-wide uppercase text-slate-400">
            Validating Session...
          </span>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <LoginPage />;
  }

  return <AuthenticatedDashboard />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthGate />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
