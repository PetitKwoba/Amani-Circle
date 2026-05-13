import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const dismissedAtKey = 'amani-install-dismissed-at';
const installedKey = 'amani-install-installed';
const dismissCooldownMs = 7 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed() {
  const dismissedAt = Number(localStorage.getItem(dismissedAtKey) ?? '0');
  return dismissedAt > 0 && Date.now() - dismissedAt < dismissCooldownMs;
}

function isStandalone() {
  return (
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function InstallAppPrompt() {
  const { t } = useTranslation();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(installedKey) === 'true' || isStandalone() || wasRecentlyDismissed()) {
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function handleInstalled() {
      localStorage.setItem(installedKey, 'true');
      setInstallEvent(null);
      setVisible(false);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
    setVisible(false);
  }

  function dismiss() {
    localStorage.setItem(dismissedAtKey, String(Date.now()));
    setVisible(false);
  }

  if (!visible || !installEvent) return null;

  return (
    <section
      className="mx-auto mt-4 max-w-5xl rounded-md border border-amani-forest bg-white p-4 shadow-sm"
      aria-labelledby="install-app-title"
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="install-app-title" className="text-base font-bold text-amani-ink">
            {t('install.title')}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">{t('install.description')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={installApp}
            className="min-h-11 rounded-md bg-amani-forest px-4 py-2 text-sm font-bold text-white focus:outline-none focus:ring-4 focus:ring-amani-sun"
          >
            {t('install.action')}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="min-h-11 rounded-md border border-slate-400 px-4 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun"
          >
            {t('install.dismiss')}
          </button>
        </div>
      </div>
    </section>
  );
}
