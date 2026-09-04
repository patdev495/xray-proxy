import React, { useEffect, useState, useCallback } from 'react';
import { 
  Server, 
  ShieldCheck, 
  Activity, 
  Database, 
  Radio, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Layers, 
  ExternalLink,
  LogOut,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { fetchHealth } from './services/apiClient';
import type { HealthResponse, ConnectionStatus } from './types/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';

const DashboardContent: React.FC = () => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastChecked, setLastChecked] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const data = await fetchHealth();
      setHealth(data);
      setStatus(data.status === 'ok' ? 'connected' : 'degraded');
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setStatus('offline');
      setErrorMessage(err instanceof Error ? err.message : 'Unable to connect to backend');
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
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-300">
      {/* Top Ambient Glow Gradient */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-950/20 via-purple-950/10 to-transparent pointer-events-none blur-3xl" />

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-white/5 bg-gray-950/40 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg tracking-tight text-white">xray-proxy</h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Control Plane
                </span>
              </div>
              <p className="text-xs text-gray-400">Enterprise Xray VLESS-Reality Orchestrator</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Live Backend Connection Indicator */}
            <div className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-gray-900/80 border border-white/10 text-xs shadow-inner">
              <span className="relative flex h-2.5 w-2.5">
                {status === 'connected' && (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </>
                )}
                {status === 'checking' && (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 animate-pulse" />
                )}
                {status === 'degraded' && (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                )}
                {status === 'offline' && (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                )}
              </span>
              <span className="font-medium capitalize text-gray-300">
                {status === 'connected' && 'Backend Online'}
                {status === 'checking' && 'Connecting...'}
                {status === 'degraded' && 'System Degraded'}
                {status === 'offline' && 'Backend Offline'}
              </span>
            </div>

            <button
              onClick={checkConnection}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white border border-white/10 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              title="Refresh Health Status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Authenticated User Profile Badge & Logout */}
            {user && (
              <div className="flex items-center space-x-3 pl-3 border-l border-white/10">
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-medium text-white block">{user.username}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-mono">{user.role}</span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg bg-gray-900 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 border border-white/10 transition-all duration-200 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Welcome & Overview Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              System Overview
              <span className="text-xs font-normal text-emerald-400 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                Session Authenticated (Issue 02)
              </span>
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Admin session active for user <strong className="text-gray-200">{user?.username}</strong>. Real-time telemetry across Control Plane and Data Plane.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="http://127.0.0.1:8000/docs" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all duration-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Interactive API Docs (/docs)
            </a>
          </div>
        </div>

        {/* System Health Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Control Plane Health */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-indigo-500/30 group">
            <div className="absolute top-0 right-0 p-4 text-white/5 group-hover:text-indigo-500/10 transition-colors">
              <Activity className="w-16 h-16" />
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">FastAPI Core</span>
              <div className={`p-2 rounded-xl ${status === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {status === 'connected' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {health ? health.status.toUpperCase() : 'CHECKING'}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Version: {health?.version || '0.1.0'} | App: {health?.app || 'xray-proxy'}
            </p>
          </div>

          {/* Card 2: Database Connectivity */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-indigo-500/30 group">
            <div className="absolute top-0 right-0 p-4 text-white/5 group-hover:text-indigo-500/10 transition-colors">
              <Database className="w-16 h-16" />
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Storage Engine</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight capitalize">
              {health?.database || 'Connecting...'}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              SQLite 3.x with SQLAlchemy 2.0 Async
            </p>
          </div>

          {/* Card 3: Xray Node Telemetry */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-indigo-500/30 group">
            <div className="absolute top-0 right-0 p-4 text-white/5 group-hover:text-indigo-500/10 transition-colors">
              <Server className="w-16 h-16" />
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data Plane Nodes</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              Ready
            </div>
            <p className="text-xs text-gray-400 mt-1">
              gRPC Handler & Stats Service Enabled
            </p>
          </div>

          {/* Card 4: Protocol Stack */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-indigo-500/30 group">
            <div className="absolute top-0 right-0 p-4 text-white/5 group-hover:text-indigo-500/10 transition-colors">
              <Radio className="w-16 h-16" />
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Protocol</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              VLESS-Reality
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Dynamic SNI Whitelist (Docomo / SoftBank / Rakuten)
            </p>
          </div>
        </div>

        {/* System Information & Architecture Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Full-Stack Foundation Status</h3>
                  <p className="text-xs text-gray-400">Authentication & Security session active</p>
                </div>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {lastChecked ? `Checked at ${lastChecked}` : 'Initializing...'}
              </span>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Backend Connection Issue</p>
                  <p className="text-xs text-rose-300/80 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Session User</span>
                  <span className="text-xs font-mono text-emerald-400 font-medium">{user?.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Security Token</span>
                  <span className="text-xs font-mono text-gray-200">JWT (HS256 Bearer)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Password Storage</span>
                  <span className="text-xs font-mono text-emerald-400">bcrypt hash</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Next Sprint</span>
                  <span className="text-xs font-mono text-indigo-400 font-medium">Issue 03 (Node & SNI)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Deploy Target</span>
                  <span className="text-xs font-mono text-gray-200">Docker VPS (ADR-0008)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Client Compatibility</span>
                  <span className="text-xs font-mono text-gray-200">Shadowrocket / v2rayNG</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-5">
            <div className="flex items-center space-x-3 border-b border-white/5 pb-4">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Active Roadmap</h3>
                <p className="text-xs text-gray-400">Core MVP Tracker</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <span className="font-semibold text-emerald-300">01. Foundation</span>
                <span className="text-[10px] uppercase font-bold text-emerald-400">DONE</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <span className="font-semibold text-emerald-300">02. Admin Auth & Session</span>
                <span className="text-[10px] uppercase font-bold text-emerald-400">DONE</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="font-semibold text-gray-300">03. Node & SNI Management</span>
                <span className="text-[10px] uppercase font-bold text-indigo-400">NEXT</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-6 text-center text-xs text-gray-500">
        xray-proxy Control Plane &bull; Built with FastAPI (Python UV) &amp; React TypeScript Tailwind CSS
      </footer>
    </div>
  );
};

const AuthGate: React.FC = () => {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-xs tracking-wider uppercase font-medium">Validating Session...</span>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <LoginPage />;
  }

  return <DashboardContent />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
};

export default App;
