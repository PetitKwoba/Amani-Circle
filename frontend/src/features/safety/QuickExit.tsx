import { useTranslation } from 'react-i18next';
import { logoutResponder } from '../../api';
import { clearSensitiveLocalReportState } from '../../offline/db';

export function QuickExit() {
  const { t } = useTranslation();

  async function leaveNow() {
    await clearSensitiveLocalReportState().catch(() => undefined);
    await logoutResponder().catch(() => undefined);
    window.location.assign('https://www.google.com');
  }

  return (
    <button
      type="button"
      onClick={leaveNow}
      className="min-h-12 rounded-md bg-rose-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-800 focus:outline-none focus:ring-4 focus:ring-rose-200"
    >
      {t('quickExit')}
    </button>
  );
}
