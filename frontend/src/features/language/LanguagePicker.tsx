import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { i18n } from '../../i18n';
import { supportedLanguages } from '../../i18n/languages';

function languageMatches(query: string, language: (typeof supportedLanguages)[number]) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    language.code,
    language.label,
    language.nativeLabel,
    language.group,
    ...language.regions,
    ...language.aliases,
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

export function LanguagePicker() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const currentLanguage = supportedLanguages.find((language) => language.code === i18n.language) ?? supportedLanguages[0];
  const filteredLanguages = useMemo(() => {
    return supportedLanguages
      .filter((language) => languageMatches(query, language))
      .sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.label.localeCompare(b.label));
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    searchRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  function selectLanguage(code: string) {
    i18n.changeLanguage(code);
    setIsOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  }

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        className="min-h-12 rounded-md border border-slate-400 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun"
        aria-haspopup="dialog"
      >
        {t('languagePicker.change', { language: currentLanguage.nativeLabel })}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="language-dialog-title"
          className="fixed inset-0 z-50 bg-slate-950/60 px-4 py-6"
        >
          <div ref={dialogRef} className="mx-auto flex max-h-full max-w-xl flex-col rounded-md bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="language-dialog-title" className="text-xl font-bold text-amani-ink">
                  {t('languagePicker.title')}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-700">{t('languagePicker.help')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                className="min-h-11 rounded-md border border-slate-400 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun"
              >
                {t('languagePicker.close')}
              </button>
            </div>

            <label htmlFor="language-search" className="mt-4 block space-y-2">
              <span className="text-sm font-bold text-slate-800">{t('languagePicker.searchLabel')}</span>
              <input
                ref={searchRef}
                id="language-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('languagePicker.searchPlaceholder')}
                className="min-h-12 w-full rounded-md border border-slate-400 px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-amani-sun"
              />
            </label>

            <p className="mt-3 text-sm font-semibold text-slate-700" role="status">
              {t('languagePicker.resultCount', { count: filteredLanguages.length })}
            </p>

            <div className="mt-3 overflow-y-auto" role="list" aria-label={t('languagePicker.resultsLabel')}>
              {filteredLanguages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  disabled={!language.enabled}
                  onClick={() => selectLanguage(language.code)}
                  className={`mb-2 flex min-h-14 w-full items-center justify-between gap-3 rounded-md border px-4 py-3 text-left focus:outline-none focus:ring-4 focus:ring-amani-sun ${
                    language.enabled
                      ? 'border-slate-300 bg-white text-slate-900 hover:border-amani-forest'
                      : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-600'
                  }`}
                >
                  <span>
                    <span className="block font-bold">{language.nativeLabel}</span>
                    <span className="block text-sm">{language.label}</span>
                  </span>
                  <span className="text-sm font-bold">
                    {language.enabled
                      ? language.code === currentLanguage.code
                        ? t('languagePicker.current')
                        : t('languagePicker.available')
                      : t('languagePicker.unavailable')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
