import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ArrowRight, Sparkles, Plus, Minus, Zap } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { PlanItem } from '../../types/plan';
import type { RegionStatus } from '../../types/node';
import { formatVnd } from '../../utils/date';

interface StorePlanCardProps {
  plan: PlanItem;
  regions: RegionStatus[];
  selectedRegion: string;
  onSelectRegion: (planId: number, regionCode: string) => void;
  onBuyPlan: (plan: PlanItem, cycle: 'MONTHLY' | 'DAILY', durationDays: number) => void;
  isBuying: boolean;
  isLoggedIn: boolean;
}

const DAY_PRESETS = [1, 3, 7];

export const StorePlanCard: React.FC<StorePlanCardProps> = ({
  plan,
  regions,
  selectedRegion,
  onSelectRegion,
  onBuyPlan,
  isBuying,
  isLoggedIn,
}) => {
  const { i18n, t } = useTranslation();
  const [cycle, setCycle] = useState<'MONTHLY' | 'DAILY'>('MONTHLY');
  const [selectedDays, setSelectedDays] = useState<number>(1);
  const [customInput, setCustomInput] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const allowedList =
    plan.allowed_regions && plan.allowed_regions.length > 0
      ? plan.allowed_regions
      : regions.map((r) => r.code || r.location);

  const currentRegStatus = regions.find(
    (r) => r.code === selectedRegion || r.location === selectedRegion
  );
  const isRegionSoldOut = Boolean(currentRegStatus && currentRegStatus.is_sold_out);

  const isDaily = cycle === 'DAILY';

  // Computed display values
  const priceDaily = plan.price_daily_vnd ?? 3000;
  const quotaDailyGb = plan.quota_daily_gb ?? 6;

  const displayPrice = isDaily
    ? priceDaily * selectedDays
    : plan.price_vnd;

  const displayQuota = isDaily
    ? `${quotaDailyGb * selectedDays} GB`
    : (plan.quota_gb > 0 ? `${plan.quota_gb} GB` : t('store.unlimited'));

  const displayDays = isDaily
    ? t('store.dayHours', { days: selectedDays, hours: selectedDays * 24 })
    : t('store.days', { count: plan.days_valid });

  const handlePresetClick = (days: number) => {
    setSelectedDays(days);
    setIsCustom(false);
    setCustomInput('');
  };

  const handleCustomToggle = () => {
    setIsCustom(true);
    setCustomInput(String(selectedDays));
  };

  const handleCustomChange = (val: string) => {
    setCustomInput(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= 90) {
      setSelectedDays(n);
    }
  };

  const handleStepDays = (delta: number) => {
    const next = Math.min(90, Math.max(1, selectedDays + delta));
    setSelectedDays(next);
    if (isCustom) setCustomInput(String(next));
  };

  const handleSwitchCycle = (c: 'MONTHLY' | 'DAILY') => {
    setCycle(c);
    if (c === 'DAILY') {
      setSelectedDays(1);
      setIsCustom(false);
      setCustomInput('');
    }
  };

  const isHotPlan = plan.price_vnd >= 20000 && plan.price_vnd <= 70000;

  return (
    <Card 
      className={`flex flex-col justify-between p-6 rounded-3xl transition-all duration-300 relative ${
        isHotPlan 
          ? 'border-2 border-indigo-500/70 shadow-xl shadow-indigo-500/15 bg-white/95 backdrop-blur-xl ring-4 ring-indigo-500/10'
          : 'border border-slate-200/90 shadow-md shadow-indigo-950/5 hover:shadow-xl hover:shadow-indigo-500/10 bg-white/90 backdrop-blur-xl hover:-translate-y-1'
      }`}
    >
      {/* Popular floating badge */}
      {isHotPlan && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md shadow-indigo-500/30">
            <Zap className="w-3 h-3 fill-current" />
            {t('store.mostPopular')}
          </span>
        </div>
      )}

      <div className="space-y-5">
        {/* Cycle Toggle Pill (if daily tier is enabled) */}
        {plan.enable_daily && (
          <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-xs font-semibold backdrop-blur-xs">
            <button
              type="button"
              onClick={() => handleSwitchCycle('MONTHLY')}
              className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                cycle === 'MONTHLY'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{t('store.monthly')}</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">
                {formatVnd(plan.price_vnd, i18n.language)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchCycle('DAILY')}
              className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                cycle === 'DAILY'
                  ? 'bg-white text-amber-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('store.dailyPass')}</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{plan.name}</h3>
            {isDaily ? (
              <Badge variant="amber" size="sm" dot={true}>
                {selectedDays}D / {selectedDays * 24}H
              </Badge>
            ) : (
              <Badge variant="indigo" size="sm">{t('store.days', { count: plan.days_valid })}</Badge>
            )}
          </div>

          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
              {formatVnd(displayPrice, i18n.language)}
            </span>
            {isDaily && (
              <span className="text-[11px] text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25 font-semibold ml-1">
                {formatVnd(priceDaily, i18n.language)}/{t('store.days', { count: 1 })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="text-slate-400">{t('store.bandwidth')}:</span>
            <span className="font-bold text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {displayQuota}
            </span>
            {isDaily && <span className="text-[11px] text-slate-400">({t('store.dailyQuota', { quota: quotaDailyGb })})</span>}
          </div>

          {isDaily && (
            <p className="text-[11px] text-slate-400 italic leading-relaxed pt-0.5">
              {t('store.expirationNote')}
            </p>
          )}
        </div>

        {/* Day Selector — only shown when DAILY cycle */}
        {isDaily && (
          <div className="space-y-2.5 border border-amber-200/60 rounded-2xl p-3.5 bg-amber-50/40 backdrop-blur-xs">
            <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">{t('store.selectDuration')}</p>

            {/* Preset chips */}
            <div className="flex gap-2 flex-wrap">
              {DAY_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handlePresetClick(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    !isCustom && selectedDays === d
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
                  }`}
                >
                  {t('store.days', { count: d })}
                </button>
              ))}
              <button
                type="button"
                onClick={handleCustomToggle}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isCustom
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
                }`}
              >
                {t('store.custom')}
              </button>
            </div>

            {/* Stepper / custom input */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleStepDays(-1)}
                disabled={selectedDays <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              {isCustom ? (
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={customInput}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  className="w-16 h-8 text-center text-sm font-mono font-bold border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white text-slate-900"
                />
              ) : (
                <span className="w-16 h-8 flex items-center justify-center text-sm font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-xl">
                  {selectedDays}
                </span>
              )}

              <button
                type="button"
                onClick={() => handleStepDays(1)}
                disabled={selectedDays >= 90}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs text-amber-900 font-mono font-medium ml-1">
                = <strong>{formatVnd(displayPrice, i18n.language)}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Features list */}
        <div className="border-t border-slate-100/90 pt-4 space-y-2.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{t('store.tlsFeature')}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">4G Zero-Rating: Viettel, VinaPhone, MobiFone</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{t('store.validity')}: <strong className="text-slate-800">{displayDays}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">Shadowrocket, V2rayNG, Streisand, Clash</span>
          </div>
        </div>

        {/* Region Selector */}
        <div className="border-t border-slate-100/90 pt-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-800">{t('store.selectRegion')}:</label>
            {isRegionSoldOut && (
              <span className="text-rose-600 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                {t('store.soldOut')}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {allowedList.map((regCode) => {
              const r = regions.find((item) => item.code === regCode || item.location === regCode);
              const soldOut = Boolean(r?.is_sold_out || (r && r.available_slots <= 0));
              const isSelected = selectedRegion === regCode;
              const flag = r?.flag || '🌐';
              const label = r ? (r.location || r.name || regCode) : regCode;

              return (
                <button
                  key={regCode}
                  type="button"
                  disabled={soldOut}
                  onClick={() => onSelectRegion(plan.id, regCode)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all text-left cursor-pointer ${
                    soldOut
                      ? 'bg-rose-50/50 border border-rose-200/80 text-slate-400 cursor-not-allowed opacity-75'
                      : isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border border-transparent shadow-md shadow-indigo-500/20 font-semibold'
                      : 'bg-white/80 border border-slate-200/90 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/30'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{flag}</span>
                    <span
                      className={`font-semibold truncate ${
                        isSelected ? 'text-white' : soldOut ? 'text-rose-800' : 'text-slate-800'
                      }`}
                    >
                      {label}
                    </span>
                  </div>

                  {soldOut ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold">
                      {t('store.soldOut')}
                    </span>
                  ) : (
                    <span
                      className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isSelected
                          ? 'bg-white/20 text-white border-white/30'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                      }`}
                    >
                      {t('store.slotsLeft', { count: r?.available_slots ?? 0 })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Action */}
      <div className="pt-6">
        <Button
          variant={isRegionSoldOut ? 'secondary' : isHotPlan ? 'gradient' : 'primary'}
          size="md"
          onClick={() => onBuyPlan(plan, cycle, isDaily ? selectedDays : plan.days_valid)}
          disabled={isRegionSoldOut || isBuying}
          isLoading={isBuying}
          className="w-full text-xs font-bold justify-center shadow-md"
          rightIcon={!isRegionSoldOut && !isBuying ? <ArrowRight className="w-4 h-4" /> : undefined}
        >
          {isRegionSoldOut
            ? t('store.regionSoldOutCta')
            : isLoggedIn
            ? isDaily
              ? t('store.subscribeDaily', { count: selectedDays, price: formatVnd(displayPrice, i18n.language) })
              : t('store.subscribeMonthly')
            : t('store.signInPurchase')}
        </Button>
      </div>
    </Card>
  );
};

export default StorePlanCard;
