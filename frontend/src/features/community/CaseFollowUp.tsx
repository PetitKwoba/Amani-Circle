import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaseStatusResponse, checkCaseStatus } from '../../api';

export function CaseFollowUp() {
  const { t } = useTranslation();
  const [caseId, setCaseId] = useState('');
  const [followUpCode, setFollowUpCode] = useState('');
  const [status, setStatus] = useState<CaseStatusResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!caseId.trim() || !followUpCode.trim()) {
      setError(t('followup.required'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await checkCaseStatus(caseId.trim(), followUpCode.trim());
      setStatus(result);
    } catch {
      setError(t('followup.notFound'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="followup-title">
      <div className="space-y-2">
        <h1 id="followup-title" className="text-2xl font-bold text-amani-ink">
          {t('followup.title')}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-700">{t('followup.intro')}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-md border border-slate-200 bg-white p-4"
        noValidate
        aria-describedby={error ? 'followup-error' : undefined}
      >
        <label htmlFor="case-id" className="block space-y-2">
          <span className="text-base font-bold text-amani-ink">{t('followup.caseId')}</span>
          <input
            id="case-id"
            type="text"
            autoComplete="off"
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            aria-invalid={Boolean(error && !caseId.trim())}
            aria-describedby={error && !caseId.trim() ? 'followup-error' : undefined}
            className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-amani-sun"
          />
        </label>

        <label htmlFor="follow-up-code" className="block space-y-2">
          <span className="text-base font-bold text-amani-ink">{t('followup.code')}</span>
          <input
            id="follow-up-code"
            type="text"
            autoComplete="off"
            value={followUpCode}
            onChange={(event) => setFollowUpCode(event.target.value)}
            aria-invalid={Boolean(error && !followUpCode.trim())}
            aria-describedby={error && !followUpCode.trim() ? 'followup-error' : undefined}
            className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-amani-sun"
          />
        </label>

        {error && (
          <p id="followup-error" className="rounded-md border border-rose-300 bg-rose-50 p-4 text-sm font-medium text-rose-900" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="min-h-12 w-full rounded-md bg-amani-forest px-4 py-3 text-base font-bold text-white focus:outline-none focus:ring-4 focus:ring-amani-sun sm:w-auto"
        >
          {isLoading ? t('followup.checking') : t('followup.submit')}
        </button>
      </form>

      {status && (
        <article className="rounded-md border border-amani-forest bg-amani-mist p-4" aria-live="polite">
          <h2 className="text-lg font-bold text-amani-ink">{t('followup.statusTitle')}</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-bold text-slate-600">{t('followup.caseId')}</dt>
              <dd className="text-base font-semibold text-amani-ink">{status.case_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-slate-600">{t('followup.status')}</dt>
              <dd className="text-base font-semibold text-amani-ink">{t(`reportStatus.${status.status}`)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-base leading-7 text-slate-700">
            {status.reporter_message || t(`reporterMessages.${status.reporter_message_code}`)}
          </p>
        </article>
      )}
    </section>
  );
}
