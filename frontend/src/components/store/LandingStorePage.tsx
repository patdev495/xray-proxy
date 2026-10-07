import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Zap,
  Loader2,
  MessageSquare,
  Send,
  Layers,
  LogOut,
  Sparkles,
  Globe,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  fetchPublicPlans,
  fetchPublicSettings,
  fetchRegionsStatus,
  createOrder,
} from '../../services/apiClient';
import type { PlanItem, SystemSettings } from '../../types/plan';
import type { RegionStatus } from '../../types/node';
import type { Order } from '../../types/order';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CheckoutModal } from './CheckoutModal';
import { StorePlanCard } from './StorePlanCard';
import { LanguageSelector } from '../ui/LanguageSelector';

interface LandingStorePageProps {
  onNavigate: (path: string) => void;
}

export const LandingStorePage: React.FC<LandingStorePageProps> = ({ onNavigate }) => {
  const { user, token, logout } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [regions, setRegions] = useState<RegionStatus[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected region per plan ID: { [planId: number]: string }
  const [selectedRegions, setSelectedRegions] = useState<Record<number, string>>({});
  const [creatingPlanId, setCreatingPlanId] = useState<number | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  const loadStoreData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, regionsData, settingsData] = await Promise.all([
        fetchPublicPlans(),
        fetchRegionsStatus(),
        fetchPublicSettings(),
      ]);
      setPlans(plansData);
      setRegions(regionsData);
      setSettings(settingsData);

      // Default selected regions for each plan
      const initialSelected: Record<number, string> = {};
      plansData.forEach((p) => {
        if (p.allowed_regions && p.allowed_regions.length > 0) {
          const firstAvailable = p.allowed_regions.find((regCode) => {
            const r = regionsData.find((item) => item.code === regCode || item.location === regCode);
            return r && !r.is_sold_out;
          });
          initialSelected[p.id] = firstAvailable || p.allowed_regions[0];
        } else if (regionsData.length > 0) {
          const firstAvailable = regionsData.find((r) => !r.is_sold_out);
          initialSelected[p.id] = firstAvailable?.code || firstAvailable?.location || regionsData[0].location;
        }
      });
      setSelectedRegions(initialSelected);
    } catch {
      showToast({
        type: 'error',
        title: t('store.loadFailed'),
        message: t('store.plansLoadFailed'),
      });
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  const handleRegionChange = (planId: number, regionCode: string) => {
    setSelectedRegions((prev) => ({ ...prev, [planId]: regionCode }));
  };

  const handleBuyPlan = async (plan: PlanItem, cycle: 'MONTHLY' | 'DAILY' = 'MONTHLY', durationDays: number = 30) => {
    if (!token || !user) {
      showToast({
        type: 'info',
        title: t('store.loginRequired'),
        message: t('store.loginRequiredMessage'),
      });
      onNavigate('/login');
      return;
    }

    const region = selectedRegions[plan.id];
    if (!region) {
      showToast({
        type: 'error',
        title: t('store.noRegion'),
        message: t('store.noRegionMessage'),
      });
      return;
    }

    // Check capacity before calling backend
    const regStatus = regions.find((r) => r.code === region || r.location === region);
    if (regStatus && regStatus.is_sold_out) {
      showToast({
        type: 'error',
        title: t('store.regionSoldOut'),
        message: t('store.regionSoldOutMessage', { region }),
      });
      return;
    }

    setCreatingPlanId(plan.id);
    try {
      const order = await createOrder(token, plan.id, region, cycle, durationDays);
      setActiveOrder(order);
      setIsCheckoutOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('store.createOrderFailed');
      showToast({
        type: 'error',
        title: t('store.createOrderFailed'),
        message: msg,
      });
    } finally {
      setCreatingPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-aurora-mesh text-slate-900 flex flex-col selection:bg-indigo-600 selection:text-white relative">
      {/* Ambient background glow dots */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-40 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Glass Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-white/60 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-slate-900 text-base sm:text-lg">
                xray<span className="text-indigo-600">-proxy</span>
              </span>
              <Badge variant="cyan" size="sm" dot={true}>VLESS Reality</Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{t('store.badge')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          {/* Support Buttons */}
          {settings?.support_telegram_url && (
            <a
              href={settings.support_telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200/80 bg-sky-50/70 hover:bg-sky-100/80 text-sky-700 text-xs font-semibold transition-all hover:-translate-y-0.5"
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span>Telegram</span>
            </a>
          )}
          {settings?.support_zalo_url && (
            <a
              href={settings.support_zalo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200/80 bg-blue-50/70 hover:bg-blue-100/80 text-blue-700 text-xs font-semibold transition-all hover:-translate-y-0.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <span>Zalo</span>
            </a>
          )}

          {/* User Navigation */}
          {user ? (
            <div className="flex items-center gap-2">
              <Button
                variant="gradient"
                size="sm"
                onClick={() => onNavigate(user.role === 'ADMIN' ? '/admin' : '/portal')}
                className="text-xs"
              >
                {user.role === 'ADMIN' ? t('store.adminDashboard') : t('store.customerPortal')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                title={t('store.signOut')}
                leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-500" />}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/login')}
                className="text-xs font-bold"
              >
                {t('store.signIn')}
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={() => onNavigate('/register')}
                className="text-xs font-bold shadow-md shadow-indigo-500/20"
              >
                {t('store.getStarted')}
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 px-4 sm:px-8 border-b border-indigo-100/50">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-indigo-200/80 text-xs font-bold text-indigo-900 shadow-sm shadow-indigo-500/10 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>{t('store.heroBadge')}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
            {t('store.heroTitle')}{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              {t('store.heroAccent')}
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
            {t('store.heroDescription')}
          </p>

          {/* Feature Highlights Bento Badges */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/80 border border-emerald-200/80 text-emerald-800 shadow-xs backdrop-blur-xs">
              <Zap className="w-4 h-4 text-emerald-600 fill-current" />
              <span>{t('store.featurePort')}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/80 border border-indigo-200/80 text-indigo-800 shadow-xs backdrop-blur-xs">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>{t('store.featureSni')}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/80 border border-cyan-200/80 text-cyan-800 shadow-xs backdrop-blur-xs">
              <Lock className="w-4 h-4 text-cyan-600" />
              <span>{t('store.featureTls')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Pricing Store Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="indigo" size="md">{t('store.chooseBandwidth')}</Badge>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {t('store.plansTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {t('store.plansDescription')}
          </p>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-9 h-9 animate-spin text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('store.loadingInfrastructure')}
            </span>
          </div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-md max-w-md mx-auto space-y-3">
            <Layers className="w-10 h-10 text-indigo-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">{t('store.noActivePlans')}</h3>
            <p className="text-xs text-slate-500">{t('store.noActivePlansDescription')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <StorePlanCard
                key={plan.id}
                plan={plan}
                regions={regions}
                selectedRegion={selectedRegions[plan.id] || ''}
                onSelectRegion={handleRegionChange}
                onBuyPlan={handleBuyPlan}
                isBuying={creatingPlanId === plan.id}
                isLoggedIn={Boolean(user)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Support & Community Section */}
      <section className="border-t border-indigo-100/60 bg-white/70 backdrop-blur-md py-10 px-4 sm:px-8 mt-16">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left space-y-1">
            <h4 className="text-base font-extrabold text-slate-900">{t('store.supportTitle')}</h4>
            <p className="text-xs text-slate-500">{t('store.supportDescription')}</p>
          </div>
          <div className="flex items-center gap-3">
            {settings?.support_telegram_url && (
              <a
                href={settings.support_telegram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 hover:bg-sky-600 transition-all hover:-translate-y-0.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('store.joinTelegram')}</span>
              </a>
            )}
            {settings?.support_zalo_url && (
              <a
                href={settings.support_zalo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all hover:-translate-y-0.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{t('store.joinZalo')}</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-slate-900 text-slate-400 py-8 px-4 text-center text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>xray-proxy Control Plane</span>
          </div>
          <p>{t('store.footer')}</p>
        </div>
      </footer>

      {/* VietQR Checkout Modal */}
      <CheckoutModal
        order={activeOrder}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onPaymentSuccess={() => {
          showToast({
            type: 'success',
            title: t('store.paymentSuccess'),
            message: t('store.paymentSuccessMessage'),
          });
          setIsCheckoutOpen(false);
          onNavigate('/portal');
        }}
      />
    </div>
  );
};

export default LandingStorePage;
