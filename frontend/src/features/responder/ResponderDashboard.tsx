import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaAssignment,
  AdminUserSummary,
  createAreaAssignment,
  deleteAreaAssignment,
  fetchAdminUsers,
  fetchAreaAssignments,
  fetchResponderNotifications,
  fetchResponderReports,
  fetchResponderSession,
  loginResponder,
  logoutResponder,
  markResponderNotificationRead,
  ReportStatus,
  ResponderNotification,
  ResponderReport,
  updateAdminPublicApproval,
  updateResponderCategory,
  updateResponderPublicReview,
  updateResponderStatus,
} from '../../api';
import { ReportCategory, ReportUrgency } from '../../offline/db';
import { CommunityContentManager } from './CommunityContentManager';

const statuses: ReportStatus[] = ['received', 'under_review', 'referred', 'needs_more_information', 'closed'];
const categories: ReportCategory[] = ['conflict_risk', 'resource_dispute', 'exclusion', 'corruption', 'abuse', 'other'];
const urgencies: ReportUrgency[] = ['low', 'medium', 'high'];
type StatusFormState = {
  status: ReportStatus;
  reporterMessage: string;
};

type CategoryFormState = {
  assignedCategory: string;
  customLabel: string;
  note: string;
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
  const [role, setRole] = useState<'reporter' | 'responder' | 'admin' | null>(null);
  const [reports, setReports] = useState<ResponderReport[]>([]);
  const [notifications, setNotifications] = useState<ResponderNotification[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserSummary[]>([]);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<AreaAssignment[]>([]);
  const [assignmentScope, setAssignmentScope] = useState<'country' | 'city' | 'village'>('country');
  const [assignmentCountry, setAssignmentCountry] = useState('');
  const [assignmentCity, setAssignmentCity] = useState('');
  const [assignmentVillage, setAssignmentVillage] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ReportCategory>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | ReportUrgency>('all');
  const [forms, setForms] = useState<Record<number, StatusFormState>>({});
  const [categoryForms, setCategoryForms] = useState<Record<number, CategoryFormState>>({});
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
        setRole((session.role as typeof role) ?? null);
        const [reportResult, notificationResult, userResult] = await Promise.all([
          fetchResponderReports(''),
          fetchResponderNotifications(),
          session.role === 'admin' ? fetchAdminUsers() : Promise.resolve([]),
        ]);
        setNotifications(notificationResult);
        setAdminUsers(userResult);
        setSelectedAdminUserId(userResult[0]?.id ?? null);
        if (userResult[0]) {
          setAssignments(await fetchAreaAssignments(userResult[0].id));
        }
        return reportResult;
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
        setCategoryForms(
          Object.fromEntries(
            result.map((report) => [
              report.id,
              {
                assignedCategory: report.assigned_category,
                customLabel: report.assigned_category === 'custom' ? report.assigned_category_label ?? '' : '',
                note: '',
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

  function categoryLabel(report: ResponderReport) {
    if (report.assigned_category === 'custom') return report.assigned_category_label || t('responder.customCategory');
    return t(`categories.${report.assigned_category}`);
  }

  async function unlockDashboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!usernameInput.trim() || !passwordInput) return;
    setLoadingState('loading');
    setSaveError('');
    try {
      await loginResponder(usernameInput.trim(), passwordInput);
      const session = await fetchResponderSession();
      const [result, notificationResult, userResult] = await Promise.all([
        fetchResponderReports(''),
        fetchResponderNotifications(),
        session.role === 'admin' ? fetchAdminUsers() : Promise.resolve([]),
      ]);
      setIsAuthenticated(true);
      setRole((session.role as typeof role) ?? null);
      setReports(result);
      setNotifications(notificationResult);
      setAdminUsers(userResult);
      setSelectedAdminUserId(userResult[0]?.id ?? null);
      if (userResult[0]) {
        setAssignments(await fetchAreaAssignments(userResult[0].id));
      }
      setForms(
        Object.fromEntries(result.map((report) => [report.id, { status: report.status, reporterMessage: '' }])),
      );
      setCategoryForms(
        Object.fromEntries(
          result.map((report) => [
            report.id,
            {
              assignedCategory: report.assigned_category,
              customLabel: report.assigned_category === 'custom' ? report.assigned_category_label ?? '' : '',
              note: '',
            },
          ]),
        ),
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
    setRole(null);
    setReports([]);
    setNotifications([]);
    setAdminUsers([]);
    setAssignments([]);
    setCategoryForms({});
    setSelectedReportId(null);
    setLoadingState('locked');
  }

  async function handleNotificationRead(notification: ResponderNotification) {
    const updated = await markResponderNotificationRead(notification.id);
    setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedReportId(updated.report_id);
  }

  async function loadAssignments(userId: number) {
    setSelectedAdminUserId(userId);
    setAssignments(await fetchAreaAssignments(userId));
  }

  async function handleAssignmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAdminUserId || !assignmentCountry.trim()) return;
    const created = await createAreaAssignment(selectedAdminUserId, {
      scope_type: assignmentScope,
      country: assignmentCountry.trim(),
      city: assignmentScope === 'city' || assignmentScope === 'village' ? assignmentCity.trim() : undefined,
      village: assignmentScope === 'village' ? assignmentVillage.trim() : undefined,
    });
    setAssignments((current) => [created, ...current]);
    setAssignmentCountry('');
    setAssignmentCity('');
    setAssignmentVillage('');
  }

  async function handleAssignmentDelete(assignmentId: number) {
    if (!selectedAdminUserId) return;
    await deleteAreaAssignment(selectedAdminUserId, assignmentId);
    setAssignments((current) => current.filter((assignment) => assignment.id !== assignmentId));
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

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>, report: ResponderReport) {
    event.preventDefault();
    const form = categoryForms[report.id];
    if (!form) return;

    setSavingId(report.id);
    setSaveError('');
    try {
      const updatedReport = await updateResponderCategory(report.id, {
        assigned_category: form.assignedCategory,
        assigned_category_label: form.assignedCategory === 'custom' ? form.customLabel : undefined,
        category_edit_note: form.note || undefined,
      });
      setReports((currentReports) =>
        currentReports.map((currentReport) => (currentReport.id === updatedReport.id ? updatedReport : currentReport)),
      );
      setCategoryForms((currentForms) => ({
        ...currentForms,
        [report.id]: {
          assignedCategory: updatedReport.assigned_category,
          customLabel: updatedReport.assigned_category === 'custom' ? updatedReport.assigned_category_label ?? '' : '',
          note: '',
        },
      }));
    } catch {
      setSaveError(t('responder.saveError'));
    } finally {
      setSavingId(null);
    }
  }

  async function handlePublicReview(report: ResponderReport, approved: boolean) {
    setSavingId(report.id);
    setSaveError('');
    try {
      const updatedReport = await updateResponderPublicReview(report.id, approved);
      setReports((currentReports) =>
        currentReports.map((currentReport) => (currentReport.id === updatedReport.id ? updatedReport : currentReport)),
      );
    } catch {
      setSaveError(t('responder.saveError'));
    } finally {
      setSavingId(null);
    }
  }

  async function handleAdminPublicApproval(report: ResponderReport, approved: boolean) {
    setSavingId(report.id);
    setSaveError('');
    try {
      const updatedReport = await updateAdminPublicApproval(report.id, approved);
      setReports((currentReports) =>
        currentReports.map((currentReport) => (currentReport.id === updatedReport.id ? updatedReport : currentReport)),
      );
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

      {loadingState === 'ready' && (
        <section className="rounded-md border border-slate-300 bg-white p-4" aria-labelledby="responder-notifications-title">
          <h2 id="responder-notifications-title" className="text-lg font-bold text-amani-ink">
            {t('responder.notifications')}
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {t('responder.unreadNotifications', { count: notifications.filter((notification) => !notification.read_at).length })}
          </p>
          {notifications.length === 0 ? (
            <p className="mt-3 text-sm text-slate-700">{t('responder.noNotifications')}</p>
          ) : (
            <div className="mt-3 space-y-2">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-amani-ink">{t('responder.newReportNotice', { caseId: notification.case_id })}</p>
                    <p className="text-sm text-slate-600">{formatDate(notification.created_at)}</p>
                  </div>
                  {!notification.read_at && (
                    <button
                      type="button"
                      onClick={() => handleNotificationRead(notification)}
                      className="min-h-11 rounded-md border border-amani-forest px-3 py-2 font-bold text-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-sun"
                    >
                      {t('responder.markRead')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
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
                  {categoryLabel(report)} | {t(`urgency.${report.urgency}`)}
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
                    {categoryLabel(selectedReport)} | {t(`urgency.${selectedReport.urgency}`)}
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

              <section className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3" aria-labelledby={`category-review-${selectedReport.id}`}>
                <h3 id={`category-review-${selectedReport.id}`} className="text-base font-bold text-amani-ink">
                  {t('responder.categoryReviewTitle')}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{t('responder.categoryReviewHelp')}</p>
                <dl className="mt-3 grid gap-2 text-sm text-slate-800 sm:grid-cols-2">
                  <div>
                    <dt className="font-bold">{t('responder.originalCategory')}</dt>
                    <dd>{t(`categories.${selectedReport.category}`)}</dd>
                  </div>
                  <div>
                    <dt className="font-bold">{t('responder.assignedCategory')}</dt>
                    <dd>{categoryLabel(selectedReport)}</dd>
                  </div>
                  {selectedReport.reporter_category_text && (
                    <div>
                      <dt className="font-bold">{t('responder.reporterOtherText')}</dt>
                      <dd>{selectedReport.reporter_category_text}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-bold">{t('responder.categoryEdited')}</dt>
                    <dd>
                      {selectedReport.category_edited_at
                        ? `${selectedReport.category_edited_by ?? t('community.missing')} - ${formatDate(selectedReport.category_edited_at)}`
                        : t('responder.categoryNotEdited')}
                    </dd>
                  </div>
                </dl>
                <form
                  onSubmit={(event) => handleCategorySubmit(event, selectedReport)}
                  className="mt-3 grid gap-3 sm:grid-cols-2"
                  aria-label={t('responder.categoryReviewTitle')}
                >
                  <label className="block space-y-2" htmlFor={`assigned-category-${selectedReport.id}`}>
                    <span className="text-sm font-bold text-slate-700">{t('responder.assignedCategory')}</span>
                    <select
                      id={`assigned-category-${selectedReport.id}`}
                      value={categoryForms[selectedReport.id]?.assignedCategory ?? selectedReport.assigned_category}
                      onChange={(event) =>
                        setCategoryForms((current) => ({
                          ...current,
                          [selectedReport.id]: {
                            assignedCategory: event.target.value,
                            customLabel: current[selectedReport.id]?.customLabel ?? '',
                            note: current[selectedReport.id]?.note ?? '',
                          },
                        }))
                      }
                      className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {t(`categories.${category}`)}
                        </option>
                      ))}
                      <option value="custom">{t('responder.customCategory')}</option>
                    </select>
                  </label>
                  {(categoryForms[selectedReport.id]?.assignedCategory ?? selectedReport.assigned_category) === 'custom' && (
                    <label className="block space-y-2" htmlFor={`custom-category-${selectedReport.id}`}>
                      <span className="text-sm font-bold text-slate-700">{t('responder.customCategoryLabel')}</span>
                      <input
                        id={`custom-category-${selectedReport.id}`}
                        value={categoryForms[selectedReport.id]?.customLabel ?? ''}
                        onChange={(event) =>
                          setCategoryForms((current) => ({
                            ...current,
                            [selectedReport.id]: {
                              assignedCategory: current[selectedReport.id]?.assignedCategory ?? 'custom',
                              customLabel: event.target.value,
                              note: current[selectedReport.id]?.note ?? '',
                            },
                          }))
                        }
                        className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
                      />
                    </label>
                  )}
                  <label className="block space-y-2 sm:col-span-2" htmlFor={`category-note-${selectedReport.id}`}>
                    <span className="text-sm font-bold text-slate-700">{t('responder.categoryEditNote')}</span>
                    <input
                      id={`category-note-${selectedReport.id}`}
                      value={categoryForms[selectedReport.id]?.note ?? ''}
                      onChange={(event) =>
                        setCategoryForms((current) => ({
                          ...current,
                          [selectedReport.id]: {
                            assignedCategory: current[selectedReport.id]?.assignedCategory ?? selectedReport.assigned_category,
                            customLabel: current[selectedReport.id]?.customLabel ?? '',
                            note: event.target.value,
                          },
                        }))
                      }
                      className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={savingId === selectedReport.id}
                    className="min-h-12 rounded-md bg-amani-forest px-4 py-3 text-base font-bold text-white focus:outline-none focus:ring-4 focus:ring-amani-sun sm:w-fit"
                  >
                    {savingId === selectedReport.id ? t('responder.saving') : t('responder.saveCategory')}
                  </button>
                </form>
              </section>

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

              <section className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3" aria-labelledby={`public-review-${selectedReport.id}`}>
                <h3 id={`public-review-${selectedReport.id}`} className="text-base font-bold text-amani-ink">
                  {t('responder.publicReviewTitle')}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{t('responder.publicReviewHelp')}</p>
                <dl className="mt-3 grid gap-2 text-sm text-slate-800 sm:grid-cols-2">
                  <div>
                    <dt className="font-bold">{t('responder.responderPublicStatus')}</dt>
                    <dd>
                      {selectedReport.responder_public_approved
                        ? t('responder.publicRecommended')
                        : t('responder.publicNotRecommended')}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold">{t('responder.adminPublicStatus')}</dt>
                    <dd>
                      {selectedReport.admin_public_approved ? t('responder.publicApproved') : t('responder.publicNotApproved')}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={savingId === selectedReport.id}
                    onClick={() => handlePublicReview(selectedReport, !selectedReport.responder_public_approved)}
                    className="min-h-11 rounded-md border border-amani-forest px-3 py-2 text-sm font-bold text-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-sun"
                  >
                    {selectedReport.responder_public_approved
                      ? t('responder.removePublicRecommendation')
                      : t('responder.recommendPublic')}
                  </button>
                  {role === 'admin' && (
                    <button
                      type="button"
                      disabled={savingId === selectedReport.id || !selectedReport.responder_public_approved}
                      onClick={() => handleAdminPublicApproval(selectedReport, !selectedReport.admin_public_approved)}
                      className="min-h-11 rounded-md bg-amani-forest px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400 focus:outline-none focus:ring-4 focus:ring-amani-sun"
                    >
                      {selectedReport.admin_public_approved
                        ? t('responder.removeAdminPublicApproval')
                        : t('responder.approvePublic')}
                    </button>
                  )}
                </div>
              </section>
            </article>
          )}
        </div>
      )}

      {loadingState === 'ready' && role === 'admin' && (
        <section className="rounded-md border border-slate-300 bg-white p-4" aria-labelledby="admin-assignments-title">
          <h2 id="admin-assignments-title" className="text-lg font-bold text-amani-ink">
            {t('responder.adminAssignments')}
          </h2>
          <p className="mt-2 text-sm text-slate-700">{t('responder.assignmentHelp')}</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">{t('responder.selectResponder')}</span>
              <select
                value={selectedAdminUserId ?? ''}
                onChange={(event) => void loadAssignments(Number(event.target.value))}
                className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
              >
                {adminUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <form onSubmit={handleAssignmentSubmit} className="mt-4 grid gap-3 lg:grid-cols-4">
            <select value={assignmentScope} onChange={(event) => setAssignmentScope(event.target.value as typeof assignmentScope)} className="min-h-12 rounded-md border border-slate-300 px-4 py-3">
              <option value="country">{t('responder.scopeCountry')}</option>
              <option value="city">{t('responder.scopeCity')}</option>
              <option value="village">{t('responder.scopeVillage')}</option>
            </select>
            <input value={assignmentCountry} onChange={(event) => setAssignmentCountry(event.target.value)} placeholder={t('community.country')} className="min-h-12 rounded-md border border-slate-300 px-4 py-3" />
            {assignmentScope !== 'country' && (
              <input value={assignmentCity} onChange={(event) => setAssignmentCity(event.target.value)} placeholder={t('community.city')} className="min-h-12 rounded-md border border-slate-300 px-4 py-3" />
            )}
            {assignmentScope === 'village' && (
              <input value={assignmentVillage} onChange={(event) => setAssignmentVillage(event.target.value)} placeholder={t('community.village')} className="min-h-12 rounded-md border border-slate-300 px-4 py-3" />
            )}
            <button type="submit" className="min-h-12 rounded-md bg-amani-forest px-4 py-3 font-bold text-white focus:outline-none focus:ring-4 focus:ring-amani-sun">
              {t('responder.addAssignment')}
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-700">{t('responder.noAssignments')}</p>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-800">
                    {assignment.scope_type}: {[assignment.village, assignment.city, assignment.country].filter(Boolean).join(', ')}
                  </p>
                  <button type="button" onClick={() => void handleAssignmentDelete(assignment.id)} className="min-h-11 rounded-md border border-slate-400 px-3 py-2 font-bold text-slate-900">
                    {t('responder.removeAssignment')}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {loadingState === 'ready' && <CommunityContentManager role={role} />}
    </section>
  );
}
