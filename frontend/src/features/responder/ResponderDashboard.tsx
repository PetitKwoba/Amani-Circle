import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchResponderReports,
  fetchResponderSession,
  loginResponder,
  logoutResponder,
  ReportStatus,
  ResponderReport,
  updateResponderStatus,
} from '../../api';
import { ReportCategory, ReportUrgency } from '../../offline/db';

const statuses: ReportStatus[] = ['received', 'under_review', 'referred', 'needs_more_information', 'closed'];
const categories: ReportCategory[] = ['conflict_risk', 'resource_dispute', 'exclusion', 'corruption', 'abuse', 'other'];
const urgencies: ReportUrgency[] = ['low', 'medium', 'high'];
type StatusFormState = {
  status: ReportStatus;
  reporterMessage: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function ResponderDashboard() {
  const { t } = useTranslation();
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reports, setReports] = useState<ResponderReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ReportCategory>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | ReportUrgency>('all');
  const [forms, setForms] = useState<Record<number, StatusFormState>>({});
  const [loadingState, setLoadingState] = useState<'locked' | 'loading' | 'ready' | 'error'>('loading');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setLoadingState('loading');
    fetchResponderSession()
      .then(async (session) => {
        if (!session.authenticated) {
          setLoadingState('locked');
          return null;
        }
        setIsAuthenticated(true);
        return fetchResponderReports('');
      })
      .then((result) => {
        if (!result) return;
        setReports(result);
        setForms(
          Object.fromEntries(
            result.map((report) => [
              report.id,
              {
                status: report.status,
                reporterMessage: '',
              },
            ]),
          ),
        );
        setSelectedReportId(result[0]?.id ?? null);
        setLoadingState('ready');
      })
      .catch(() => {
        setLoadingState('locked');
      });
  }, []);

  const visibleReports = useMemo(
    () =>
      reports.filter((report) => {
        const statusMatches = statusFilter === 'all' || report.status === statusFilter;
        const categoryMatches = categoryFilter === 'all' || report.category === categoryFilter;
        const urgencyMatches = urgencyFilter === 'all' || report.urgency === urgencyFilter;
        return statusMatches && categoryMatches && urgencyMatches;
      }),
    [categoryFilter, reports, statusFilter, urgencyFilter],
  );

  const selectedReport =
    visibleReports.find((report) => report.id === selectedReportId) ?? visibleReports[0] ?? null;

  async function unlockDashboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!usernameInput.trim() || !passwordInput) return;
    setLoadingState('loading');
    setSaveError('');
    try {
      await loginResponder(usernameInput.trim(), passwordInput);
      const result = await fetchResponderReports('');
      setIsAuthenticated(true);
      setReports(result);
      setForms(
        Object.fromEntries(result.map((report) => [report.id, { status: report.status, reporterMessage: '' }])),
      );
      setSelectedReportId(result[0]?.id ?? null);
      setUsernameInput('');
      setPasswordInput('');
      setLoadingState('ready');
    } catch {
      setLoadingState('locked');
      setSaveError(t('responder.loginError'));
    }
  }

  async function lockDashboard() {
    await logoutResponder().catch(() => undefined);
    setIsAuthenticated(false);
    setReports([]);
    setSelectedReportId(null);
    setLoadingState('locked');
  }

  async function handleStatusSubmit(event: FormEvent<HTMLFormElement>, report: ResponderReport) {
    event.preventDefault();
    const form = forms[report.id];
    if (!form || !isAuthenticated) return;

    setSavingId(report.id);
    setSaveError('');
    try {
      const updatedReport = await updateResponderStatus(report.id, form.status, form.reporterMessage, '');
      setReports((currentReports) =>
        currentReports.map((currentReport) => (currentReport.id === updatedReport.id ? updatedReport : currentReport)),
      );
      setForms((currentForms) => ({
        ...currentForms,
        [report.id]: {
          status: updatedReport.status,
          reporterMessage: '',
        },
      }));
    } catch {
      setSaveError(t('responder.saveError'));
    } finally {
      setSavingId(null);
    }
  }

  if (loadingState === 'locked') {
    return (
      <section className="space-y-5" aria-labelledby="responder-lock-title">
        <div className="space-y-2">
          <h1 id="responder-lock-title" className="text-2xl font-bold text-amani-ink">
            {t('responder.lockTitle')}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-700">{t('responder.lockIntro')}</p>
        </div>
        <form onSubmit={unlockDashboard} className="max-w-xl space-y-4 rounded-md border border-slate-300 bg-white p-4">
          <label htmlFor="responder-username" className="block space-y-2">
            <span className="text-base font-bold text-amani-ink">{t('responder.username')}</span>
            <input
              id="responder-username"
              type="text"
              autoComplete="username"
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              className="min-h-12 w-full rounded-md border border-slate-400 px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-amani-sun"
            />
          </label>
          <label htmlFor="responder-password" className="block space-y-2">
            <span className="text-base font-bold text-amani-ink">{t('responder.password')}</span>
            <input
              id="responder-password"
              type="password"
              autoComplete="current-password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              className="min-h-12 w-full rounded-md border border-slate-400 px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-amani-sun"
            />
          </label>
          <button
            type="submit"
            className="min-h-12 rounded-md bg-amani-forest px-4 py-3 text-base font-bold text-white focus:outline-none focus:ring-4 focus:ring-amani-sun"
          >
            {t('responder.unlock')}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="responder-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 id="responder-title" className="text-2xl font-bold text-amani-ink">
            {t('responder.title')}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-700">{t('responder.intro')}</p>
        </div>
        <button
          type="button"
          onClick={lockDashboard}
          className="min-h-12 rounded-md border border-slate-400 px-4 py-3 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun"
        >
          {t('responder.lock')}
        </button>
      </div>

      <fieldset className="grid gap-3 rounded-md border border-slate-300 bg-white p-4 lg:grid-cols-3">
        <legend className="px-1 text-base font-bold text-amani-ink">{t('responder.filters')}</legend>
        <label htmlFor="responder-status-filter" className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">{t('responder.statusLabel')}</span>
          <select
            id="responder-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | ReportStatus)}
            className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
          >
            <option value="all">{t('responder.allStatuses')}</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {t(`reportStatus.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="responder-category-filter" className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">{t('community.category')}</span>
          <select
            id="responder-category-filter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as 'all' | ReportCategory)}
            className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
          >
            <option value="all">{t('responder.allCategories')}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {t(`categories.${category}`)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="responder-urgency-filter" className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">{t('community.urgency')}</span>
          <select
            id="responder-urgency-filter"
            value={urgencyFilter}
            onChange={(event) => setUrgencyFilter(event.target.value as 'all' | ReportUrgency)}
            className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
          >
            <option value="all">{t('responder.allUrgencies')}</option>
            {urgencies.map((urgency) => (
              <option key={urgency} value={urgency}>
                {t(`urgency.${urgency}`)}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      {loadingState === 'loading' && (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-700" role="status">
          {t('responder.loading')}
        </p>
      )}

      {loadingState === 'ready' && (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700" role="status">
          {t('responder.resultCount', { count: visibleReports.length })}
        </p>
      )}

      {saveError && (
        <p className="rounded-md border border-rose-300 bg-rose-50 p-4 font-medium text-rose-900" role="alert">
          {saveError}
        </p>
      )}

      {loadingState === 'ready' && visibleReports.length === 0 && (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-700">{t('responder.empty')}</p>
      )}

      {loadingState === 'ready' && visibleReports.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
          <div className="space-y-3" role="list" aria-label={t('responder.reportList')}>
            {visibleReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                aria-pressed={selectedReport?.id === report.id}
                className={`w-full rounded-md border p-4 text-left focus:outline-none focus:ring-4 focus:ring-amani-sun ${
                  selectedReport?.id === report.id
                    ? 'border-amani-forest bg-amani-mist'
                    : 'border-slate-300 bg-white'
                }`}
              >
                <span className="block text-base font-bold text-amani-ink">{report.case_id}</span>
                <span className="mt-1 block text-sm font-semibold text-slate-700">
                  {t(`categories.${report.category}`)} | {t(`urgency.${report.urgency}`)}
                </span>
                <span className="mt-1 block text-sm text-slate-700">{t(`reportStatus.${report.status}`)}</span>
                <span className="mt-1 block text-sm text-slate-600">{formatDate(report.created_at)}</span>
                <span className="mt-1 block text-sm text-slate-700">
                  {[report.rough_location, report.rough_region].filter(Boolean).join(', ')}
                </span>
              </button>
            ))}
          </div>

          {selectedReport && (
            <article className="rounded-md border border-slate-300 bg-white p-4 shadow-sm" aria-labelledby="selected-report-title">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 id="selected-report-title" className="text-xl font-bold text-amani-ink">
                    {selectedReport.case_id}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {t(`categories.${selectedReport.category}`)} | {t(`urgency.${selectedReport.urgency}`)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{formatDate(selectedReport.created_at)}</p>
                </div>
                <span className="rounded-full bg-amani-mist px-3 py-1 text-sm font-bold text-amani-forest">
                  {t(`reportStatus.${selectedReport.status}`)}
                </span>
              </div>

              <dl className="mt-4 grid gap-3">
                <div>
                  <dt className="text-sm font-bold text-slate-700">{t('community.details')}</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-base leading-7 text-slate-900">{selectedReport.details}</dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-slate-700">{t('community.location')}</dt>
                  <dd className="mt-1 text-base text-slate-900">
                    {[selectedReport.rough_location, selectedReport.rough_region, selectedReport.nearby_landmark]
                      .filter(Boolean)
                      .join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-slate-700">{t('responder.notes')}</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-base text-slate-900">
                    {selectedReport.evidence_notes || t('community.missing')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-slate-700">{t('responder.contact')}</dt>
                  <dd className="mt-1 text-base text-slate-900">
                    {selectedReport.contact_details && selectedReport.contact_method
                      ? `${t(`contactMethod.${selectedReport.contact_method}`)}: ${selectedReport.contact_details}`
                      : t('responder.contactHidden')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-bold text-slate-700">{t('responder.exactLocation')}</dt>
                  <dd className="mt-1 text-base text-slate-900">
                    {selectedReport.has_exact_location &&
                    selectedReport.exact_latitude !== null &&
                    selectedReport.exact_longitude !== null
                      ? `${selectedReport.exact_latitude.toFixed(4)}, ${selectedReport.exact_longitude.toFixed(4)}`
                      : t('responder.exactLocationHidden')}
                  </dd>
                </div>
              </dl>

              <form
                onSubmit={(event) => handleStatusSubmit(event, selectedReport)}
                className="mt-4 grid gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-2"
                aria-label={t('responder.updateCaseStatus', { caseId: selectedReport.case_id })}
              >
                <label htmlFor={`status-${selectedReport.id}`} className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">{t('responder.updateStatus')}</span>
                  <select
                    id={`status-${selectedReport.id}`}
                    value={forms[selectedReport.id]?.status ?? selectedReport.status}
                    onChange={(event) =>
                      setForms((currentForms) => ({
                        ...currentForms,
                        [selectedReport.id]: {
                          status: event.target.value as ReportStatus,
                          reporterMessage: currentForms[selectedReport.id]?.reporterMessage ?? '',
                        },
                      }))
                    }
                    className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {t(`reportStatus.${status}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor={`message-${selectedReport.id}`} className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">{t('responder.reporterMessage')}</span>
                  <input
                    id={`message-${selectedReport.id}`}
                    type="text"
                    value={forms[selectedReport.id]?.reporterMessage ?? ''}
                    onChange={(event) =>
                      setForms((currentForms) => ({
                        ...currentForms,
                        [selectedReport.id]: {
                          status: currentForms[selectedReport.id]?.status ?? selectedReport.status,
                          reporterMessage: event.target.value,
                        },
                      }))
                    }
                    aria-describedby={`message-help-${selectedReport.id}`}
                    className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
                  />
                  <span id={`message-help-${selectedReport.id}`} className="block text-xs text-slate-600">
                    {t('responder.reporterMessageHelp')}
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={savingId === selectedReport.id}
                  className="min-h-12 rounded-md bg-amani-forest px-4 py-3 text-base font-bold text-white focus:outline-none focus:ring-4 focus:ring-amani-sun sm:col-span-2 sm:w-fit"
                >
                  {savingId === selectedReport.id ? t('responder.saving') : t('responder.saveStatus')}
                </button>
              </form>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
