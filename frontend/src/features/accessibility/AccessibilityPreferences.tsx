import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const storageKey = 'amani-comfort-mode';

function readInitialComfortMode() {
  return localStorage.getItem(storageKey) === 'true';
}

export function AccessibilityPreferences() {
  const { t } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [comfortMode, setComfortMode] = useState(readInitialComfortMode);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.dataset.comfortMode = comfortMode ? 'true' : 'false';
    localStorage.setItem(storageKey, String(comfortMode));
  }, [comfortMode]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    function handleKeys(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="min-h-12 rounded-md border border-slate-400 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun"
      >
        {t('accessibility.open')}
      </button>

      {open && (
        <section
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${panelId}-title`}
          className="absolute right-0 top-14 z-20 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-slate-300 bg-white p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 id={`${panelId}-title`} className="text-lg font-bold text-amani-ink">
                {t('accessibility.title')}
              </h2>
              <p className="text-sm leading-6 text-slate-700">{t('accessibility.description')}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun"
            >
              {t('accessibility.close')}
            </button>
          </div>

          <div className="mt-4 rounded-md border border-slate-300 bg-slate-50 p-3">
            <label htmlFor="comfort-mode-toggle" className="flex cursor-pointer items-start gap-3">
              <input
                id="comfort-mode-toggle"
                type="checkbox"
                checked={comfortMode}
                onChange={(event) => setComfortMode(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-slate-400 text-amani-forest focus:ring-4 focus:ring-amani-sun"
              />
              <span>
                <span className="block text-base font-bold text-amani-ink">{t('accessibility.comfortMode')}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-700">
                  {t('accessibility.comfortModeHelp')}
                </span>
                <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 ring-1 ring-slate-300">
                  {comfortMode ? t('accessibility.enabled') : t('accessibility.disabled')}
                </span>
              </span>
            </label>
          </div>
        </section>
      )}
    </div>
  );
}
