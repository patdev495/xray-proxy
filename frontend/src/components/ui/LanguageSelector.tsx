import React from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from '../../i18n';

export const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const language: SupportedLanguage = i18n.language === 'en' ? 'en' : 'vi';

  return (
    <label className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus-within:ring-2 focus-within:ring-slate-400">
      <Languages aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
      <span className="sr-only">{t('common.language')}</span>
      <select
        aria-label={t('common.language')}
        className="cursor-pointer appearance-none bg-transparent pr-1 text-xs font-bold text-slate-700 outline-none"
        value={language}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
          void i18n.changeLanguage(event.target.value);
        }}
      >
        <option value="vi">VI</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
};
