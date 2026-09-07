import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { PlanItem } from '../../types/plan';
import type { RegionStatus } from '../../types/node';

interface StorePlanCardProps {
  plan: PlanItem;
  regions: RegionStatus[];
  selectedRegion: string;
  onSelectRegion: (planId: number, regionCode: string) => void;
  onBuyPlan: (plan: PlanItem, cycle: 'MONTHLY' | 'DAILY') => void;
  isBuying: boolean;
  isLoggedIn: boolean;
}

export const StorePlanCard: React.FC<StorePlanCardProps> = ({
  plan,
  regions,
  selectedRegion,
  onSelectRegion,
  onBuyPlan,
  isBuying,
  isLoggedIn,
}) => {
  const [cycle, setCycle] = useState<'MONTHLY' | 'DAILY'>('MONTHLY');

  const allowedList =
    plan.allowed_regions && plan.allowed_regions.length > 0
      ? plan.allowed_regions
      : regions.map((r) => r.code || r.location);

  const currentRegStatus = regions.find(
    (r) => r.code === selectedRegion || r.location === selectedRegion
  );
  const isRegionSoldOut = Boolean(currentRegStatus && currentRegStatus.is_sold_out);

  const isDaily = cycle === 'DAILY';
  const displayPrice = isDaily
    ? (plan.price_daily_vnd ?? 3000)
    : plan.price_vnd;
  const displayQuota = isDaily
    ? (plan.quota_daily_gb ? `${plan.quota_daily_gb} GB` : '6 GB')
    : (plan.quota_gb > 0 ? `${plan.quota_gb} GB` : 'Không giới hạn');
  const displayDays = isDaily ? '1 Ngày (24 Giờ)' : `${plan.days_valid} Ngày`;

  return (
    <Card className="flex flex-col justify-between p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow relative bg-white">
      <div className="space-y-5">
        {/* Cycle Toggle Pill (if daily tier is enabled) */}
        {plan.enable_daily && (
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCycle('MONTHLY')}
              className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                cycle === 'MONTHLY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>30 Ngày</span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">
                {plan.price_vnd.toLocaleString('vi-VN')}đ
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCycle('DAILY')}
              className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                cycle === 'DAILY'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Dùng thử 1 Ngày</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
            {isDaily ? (
              <Badge variant="amber" size="sm" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Test 24H</span>
              </Badge>
            ) : (
              <Badge variant="indigo" size="sm">{plan.days_valid} Ngày</Badge>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {displayPrice.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs font-semibold text-slate-400 uppercase">VND</span>
            {isDaily && (
              <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium ml-2">
                Gói 24h dùng thử
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 font-mono">
            Lưu lượng: <strong className="text-slate-800">{displayQuota}</strong>
            {isDaily && ' / 24 giờ'}
          </p>

          {isDaily && (
            <p className="text-[11px] text-slate-400 italic">
              * Thu hồi slot máy chủ ngay sau 24h. Không hỗ trợ gia hạn in-place.
            </p>
          )}
        </div>

        {/* Features list */}
        <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Mã hóa TLS 1.3 chống chặn phát hiện</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Bypass SNI không tốn 4G tốc độ cao</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Thời hạn sử dụng: {displayDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Hỗ trợ Streisand, Shadowrocket, V2rayNG, v2rayN</span>
          </div>
        </div>

        {/* Region Selector */}
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-700">Chọn khu vực máy chủ:</label>
            {isRegionSoldOut && (
              <span className="text-rose-600 font-semibold text-[11px]">Đã hết slot</span>
            )}
          </div>

          <div className="space-y-1.5">
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
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all text-left ${
                    soldOut
                      ? 'bg-rose-50/60 border border-rose-200 text-slate-400 cursor-not-allowed opacity-75'
                      : isSelected
                      ? 'bg-slate-900 text-white border-2 border-slate-900 shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">{flag}</span>
                    <span
                      className={`font-medium truncate ${
                        isSelected ? 'text-white' : soldOut ? 'text-rose-800' : 'text-slate-800'
                      }`}
                    >
                      {label}
                    </span>
                  </div>

                  {soldOut ? (
                    <span className="shrink-0 px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold">
                      Hết chỗ
                    </span>
                  ) : (
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border ${
                        isSelected
                          ? 'bg-slate-800 text-slate-200 border-slate-700'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      Còn {r?.available_slots ?? 0} slots
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
          variant={isRegionSoldOut ? 'secondary' : 'primary'}
          size="md"
          onClick={() => onBuyPlan(plan, cycle)}
          disabled={isRegionSoldOut || isBuying}
          isLoading={isBuying}
          className="w-full text-xs font-semibold justify-center"
          rightIcon={!isRegionSoldOut && !isBuying ? <ArrowRight className="w-3.5 h-3.5" /> : undefined}
        >
          {isRegionSoldOut
            ? 'Hết chỗ (Sold out)'
            : isLoggedIn
            ? isDaily
              ? 'Đăng Ký Gói Test 1 Ngày'
              : 'Mua Gói 30 Ngày'
            : 'Đăng nhập để Mua'}
        </Button>
      </div>
    </Card>
  );
};
