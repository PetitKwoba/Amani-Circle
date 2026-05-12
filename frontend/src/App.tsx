import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaseFollowUp } from './features/community/CaseFollowUp';
import { CommunityReport } from './features/community/CommunityReport';
import { PublicDashboard } from './features/public-dashboard/PublicDashboard';
import { ResponderDashboard } from './features/responder/ResponderDashboard';
import { QuickExit } from './features/safety/QuickExit';
import { LanguagePicker } from './features/language/LanguagePicker';
import { AccessibilityPreferences } from './features/accessibility/AccessibilityPreferences';

type View = 'community' | 'followup' | 'responder' | 'public';

const views: View[] = ['community', 'followup', 'responder', 'public'];

export function App() {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<View>('community');

  return (
    <div className="min-h-screen bg-slate-50 text-amani-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-amani-forest focus:shadow-lg focus:outline-none focus:ring-4 focus:ring-amani-sun"
      >
        {t('skipToContent')}
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-sm font-bold uppercase tracking-wide text-amani-forest">{t('appName')}</h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">{t('tagline')}</p>
            </div>
            <QuickExit />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t('nav.label')}>
              {views.map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveView(view)}
                  aria-current={activeView === view ? 'page' : undefined}
                  className={`min-h-12 rounded-md px-3 py-2 text-sm font-bold ${
                    activeView === view
                      ? 'bg-amani-forest text-white ring-2 ring-amani-forest ring-offset-2'
                      : 'border border-slate-300 bg-white text-slate-800'
                  } focus:outline-none focus:ring-4 focus:ring-amani-sun`}
                >
                  {activeView === view ? t('nav.current', { section: t(`nav.${view}`) }) : t(`nav.${view}`)}
                </button>
              ))}
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <AccessibilityPreferences />
              <LanguagePicker />
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-6 sm:px-6" tabIndex={-1}>
        {activeView === 'community' && <CommunityReport />}
        {activeView === 'followup' && <CaseFollowUp />}
        {activeView === 'responder' && <ResponderDashboard />}
        {activeView === 'public' && <PublicDashboard />}
      </main>
    </div>
  );
}
