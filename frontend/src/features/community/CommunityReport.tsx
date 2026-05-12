import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReportPayload, ReportSubmissionResponse, submitReport } from '../../api';
import {
  clearReportDraft,
  enqueuePendingReport,
  loadReportDraft,
  loadPendingReports,
  loadReportReceipts,
  PendingReport,
  ReportReceipt,
  ReportCategory,
  ReportUrgency,
  saveReportDraft,
} from '../../offline/db';
import { syncPendingReports } from '../../offline/sync';

const categories: ReportCategory[] = [
  'conflict_risk',
  'resource_dispute',
  'exclusion',
  'corruption',
  'abuse',
  'other',
];

const urgencyLevels: ReportUrgency[] = ['low', 'medium', 'high'];
const totalSteps = 4;
const placeTypes = ['market', 'school', 'clinic', 'water_point', 'road', 'place_of_worship', 'other'];

function createFollowUpSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

type Step = 'category' | 'details' | 'location' | 'review' | 'success';

type FormState = {
  category: ReportCategory | '';
  urgency: ReportUrgency;
  roughLocation: string;
  roughRegion: string;
  nearbyLandmark: string;
  locationPlaceType: string;
  details: string;
  evidenceNotes: string;
  contactPreference: 'none' | 'if_needed' | 'urgent';
  contactMethod: 'phone' | 'email' | 'trusted_contact' | 'other' | '';
  contactDetails: string;
  exactLocationConsent: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    precision: 'exact';
  } | null;
};

type StatusState = {
  tone: 'info' | 'error';
  message: string;
  target?: 'category' | 'details' | 'location' | 'contact' | 'sync';
};

const emptyForm: FormState = {
  category: '',
  urgency: 'medium',
  roughLocation: '',
  roughRegion: '',
  nearbyLandmark: '',
  locationPlaceType: '',
  details: '',
  evidenceNotes: '',
  contactPreference: 'none',
  contactMethod: '',
  contactDetails: '',
  exactLocationConsent: false,
  currentLocation: null,
};

function SyncStatusPanel({
  isOnline,
  isSyncing,
  pendingReports,
  latestReceipt,
  onRetry,
}: {
  isOnline: boolean;
  isSyncing: boolean;
  pendingReports: PendingReport[];
  latestReceipt?: ReportReceipt;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const failedCount = pendingReports.filter((report) => report.status === 'failed').length;
  const pendingCount = pendingReports.filter((report) => report.status === 'pending' || report.status === 'syncing').length;

  if (pendingReports.length === 0 && !latestReceipt) return null;

  return (
    <section
      className="rounded-md border border-slate-300 bg-white p-4 text-sm text-slate-800"
      aria-labelledby="sync-status-title"
      aria-live="polite"
    >
      <h2 id="sync-status-title" className="text-base font-bold text-amani-ink">
        {t('community.syncStatusTitle')}
      </h2>
      <p className="mt-2 leading-6">
        {isSyncing
          ? t('community.syncingReports')
          : pendingReports.length > 0
            ? t('community.pendingReports', { count: pendingReports.length })
            : t('community.allReportsSent')}
      </p>
      {failedCount > 0 && <p className="mt-2 font-semibold text-rose-900">{t('community.failedReports', { count: failedCount })}</p>}
      {pendingCount > 0 && <p className="mt-2 text-slate-700">{t('community.localPrivacyWarning')}</p>}
      {latestReceipt && (
        <p className="mt-2 font-semibold text-amani-forest">
          {t('community.latestReceipt', { caseId: latestReceipt.caseId })}
        </p>
      )}
      {pendingReports.length > 0 && (
        <button
          type="button"
          onClick={onRetry}
          disabled={!isOnline || isSyncing}
          className="mt-3 min-h-12 rounded-md border border-amani-forest px-4 py-3 text-base font-bold text-amani-forest disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-500 focus:outline-none focus:ring-4 focus:ring-amani-sun"
        >
          {isSyncing ? t('community.syncing') : t('community.retryNow')}
        </button>
      )}
    </section>
  );
}

export function CommunityReport() {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState<Step>('category');
  const [status, setStatus] = useState<StatusState | null>(null);
  const [submission, setSubmission] = useState<ReportSubmissionResponse | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [receipts, setReceipts] = useState<ReportReceipt[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const stepIndex = useMemo(() => {
    if (step === 'details') return 2;
    if (step === 'location') return 3;
    if (step === 'review') return 4;
    return 1;
  }, [step]);

  const hasValidationError = status?.tone === 'error';
  const latestReceipt = receipts[0];

  async function refreshQueueState() {
    const [pending, storedReceipts] = await Promise.all([loadPendingReports(), loadReportReceipts()]);
    setPendingReports(pending);
    setReceipts(storedReceipts);
  }

  async function retryQueuedReports() {
    if (!navigator.onLine) {
      setStatus({ tone: 'info', message: t('community.syncOffline'), target: 'sync' });
      return;
    }

    setIsSyncing(true);
    setStatus({ tone: 'info', message: t('community.syncingReports'), target: 'sync' });
    try {
      const result = await syncPendingReports();
      await refreshQueueState();
      if (result.syncedCount > 0) {
        setStatus({ tone: 'info', message: t('community.syncedReports', { count: result.syncedCount }), target: 'sync' });
      } else if (result.failedCount > 0) {
        setStatus({ tone: 'error', message: t('community.syncFailed'), target: 'sync' });
      } else {
        setStatus({ tone: 'info', message: t('community.noPendingReports'), target: 'sync' });
      }
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    refreshQueueState().catch(() => undefined);
    loadReportDraft()
      .then((draft) => {
        if (draft) {
          setForm({
            category: draft.category,
            urgency: draft.urgency,
            roughLocation: draft.roughLocation,
            roughRegion: draft.roughRegion ?? '',
            nearbyLandmark: draft.nearbyLandmark ?? '',
            locationPlaceType: draft.locationPlaceType ?? '',
            details: draft.details,
            evidenceNotes: draft.evidenceNotes ?? '',
            contactPreference: draft.contactPreference ?? 'none',
            contactMethod: draft.contactMethod ?? '',
            contactDetails: draft.contactDetails ?? '',
            exactLocationConsent: draft.exactLocationConsent ?? false,
            currentLocation: draft.currentLocation ?? null,
          });
          setStatus({ tone: 'info', message: t('community.draftLoaded') });
        }
      })
      .catch(() => setStatus(null));

    const updateOnlineState = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        setIsSyncing(true);
        syncPendingReports()
          .then(async (result) => {
            await refreshQueueState();
            if (result.syncedCount > 0) {
              setStatus({ tone: 'info', message: t('community.syncedReports', { count: result.syncedCount }), target: 'sync' });
            } else if (result.failedCount > 0) {
              setStatus({ tone: 'error', message: t('community.syncFailed'), target: 'sync' });
            }
          })
          .catch(() => undefined)
          .finally(() => setIsSyncing(false));
      }
    };
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);

    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, [t]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  async function saveCurrentDraft(message = t('community.saved')) {
    await saveReportDraft(form);
    setStatus({ tone: 'info', message });
  }

  function validateCurrentStep(): boolean {
    if (step === 'category' && !form.category) {
      setStatus({ tone: 'error', message: t('community.validationCategory'), target: 'category' });
      return false;
    }

    if (step === 'details' && form.details.trim().length < 8) {
      setStatus({ tone: 'error', message: t('community.validationDetails'), target: 'details' });
      return false;
    }

    if (step === 'location' && form.roughLocation.trim().length < 2) {
      setStatus({ tone: 'error', message: t('community.validationLocation'), target: 'location' });
      return false;
    }

    if (
      step === 'location' &&
      form.contactPreference !== 'none' &&
      (!form.contactMethod || form.contactDetails.trim().length < 3)
    ) {
      setStatus({ tone: 'error', message: t('community.validationContact'), target: 'contact' });
      return false;
    }

    setStatus(null);
    return true;
  }

  async function goNext() {
    if (!validateCurrentStep()) return;

    await saveCurrentDraft(t('community.saved'));

    if (step === 'category') setStep('details');
    if (step === 'details') setStep('location');
    if (step === 'location') setStep('review');
  }

  function goBack() {
    setStatus(null);
    if (step === 'details') setStep('category');
    if (step === 'location') setStep('details');
    if (step === 'review') setStep('location');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.category) {
      setStep('category');
      setStatus({ tone: 'error', message: t('community.validationCategory'), target: 'category' });
      return;
    }

    if (form.details.trim().length < 8) {
      setStep('details');
      setStatus({ tone: 'error', message: t('community.validationDetails'), target: 'details' });
      return;
    }

    if (form.roughLocation.trim().length < 2) {
      setStep('location');
      setStatus({ tone: 'error', message: t('community.validationLocation'), target: 'location' });
      return;
    }

    if (form.contactPreference !== 'none' && (!form.contactMethod || form.contactDetails.trim().length < 3)) {
      setStep('location');
      setStatus({ tone: 'error', message: t('community.validationContact'), target: 'contact' });
      return;
    }

    const clientReportId = crypto.randomUUID();
    const followUpSecret = createFollowUpSecret();
    const payload: ReportPayload = {
      client_report_id: clientReportId,
      follow_up_secret: followUpSecret,
      category: form.category,
      urgency: form.urgency,
      details: form.details,
      rough_location: form.roughLocation,
      rough_region: form.roughRegion || undefined,
      nearby_landmark: form.nearbyLandmark || undefined,
      location_place_type: form.locationPlaceType || undefined,
      evidence_notes: form.evidenceNotes || undefined,
      contact_preference: form.contactPreference,
      contact_method: form.contactMethod || undefined,
      contact_details: form.contactPreference === 'none' ? undefined : form.contactDetails,
      exact_location_consent: form.exactLocationConsent,
      current_location: form.exactLocationConsent && form.currentLocation ? form.currentLocation : undefined,
    };

    setIsSubmitting(true);
    try {
      const result = await submitReport(payload);
      setSubmission({ ...result, follow_up_code: followUpSecret });
      await clearReportDraft();
      await refreshQueueState();
      setStatus(null);
      setStep('success');
    } catch {
      await enqueuePendingReport(clientReportId, payload);
      await clearReportDraft();
      await refreshQueueState();
      setSubmission(null);
      setStatus({ tone: 'info', message: t('community.queuedOffline'), target: 'sync' });
      setStep('success');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startNewReport() {
    setForm(emptyForm);
    setSubmission(null);
    setStatus(null);
    setStep('category');
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus({ tone: 'error', message: t('community.locationUnsupported') });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          exactLocationConsent: true,
          currentLocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            precision: 'exact',
          },
        }));
        setStatus({ tone: 'info', message: t('community.locationCaptured') });
      },
      () => setStatus({ tone: 'error', message: t('community.locationDenied') }),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  if (step === 'success') {
    return (
      <section className="space-y-5" aria-labelledby="community-success-title">
        <div className="rounded-md border border-amani-forest bg-amani-mist p-5" role="status">
          <h1
            id="community-success-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold text-amani-ink focus:outline-none"
          >
            {t('community.submittedTitle')}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
            {submission ? t('community.submittedMessage') : t('community.queuedMessage')}
          </p>
          {submission && (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-white p-4">
                <dt className="text-sm font-bold text-slate-600">{t('community.caseId')}</dt>
                <dd className="mt-1 text-xl font-bold text-amani-ink">{submission.case_id}</dd>
              </div>
              <div className="rounded-md bg-white p-4">
                <dt className="text-sm font-bold text-slate-600">{t('community.followUpCode')}</dt>
                <dd className="mt-1 text-xl font-bold text-amani-ink">{submission.follow_up_code}</dd>
              </div>
            </dl>
          )}
          {submission && <p className="mt-3 text-sm font-semibold text-slate-700">{t('community.saveCodes')}</p>}
          {!submission && latestReceipt && (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-white p-4">
                <dt className="text-sm font-bold text-slate-700">{t('community.caseId')}</dt>
                <dd className="mt-1 text-xl font-bold text-amani-ink">{latestReceipt.caseId}</dd>
              </div>
              <div className="rounded-md bg-white p-4">
                <dt className="text-sm font-bold text-slate-700">{t('community.followUpCode')}</dt>
                <dd className="mt-1 text-xl font-bold text-amani-ink">{latestReceipt.followUpCode}</dd>
              </div>
            </dl>
          )}
        </div>

        <SyncStatusPanel
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingReports={pendingReports}
          latestReceipt={latestReceipt}
          onRetry={retryQueuedReports}
        />

        <button
          type="button"
          onClick={startNewReport}
          className="min-h-12 w-full rounded-md bg-amani-forest px-4 py-3 text-base font-bold text-white shadow-sm hover:bg-amani-leaf focus:outline-none focus:ring-4 focus:ring-amani-sun sm:w-auto"
        >
          {t('community.anotherReport')}
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="community-title">
      <div className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-wide text-amani-forest">
          {t('community.stepStatus', { current: stepIndex, total: totalSteps })}
        </p>
        <h1
          id="community-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-amani-ink focus:outline-none"
        >
          {t(`community.steps.${step}`)}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-700">{t('community.intro')}</p>
        <p className="max-w-2xl rounded-md border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
          {t('community.anonymousNotice')}
        </p>
      </div>

      {!isOnline && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900" role="status">
          {t('community.offline')}
        </div>
      )}

      <SyncStatusPanel
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingReports={pendingReports}
        latestReceipt={latestReceipt}
        onRetry={retryQueuedReports}
      />

      {status && (
        <p
          id="report-status"
          className={`rounded-md border p-4 text-sm font-medium ${
            status.tone === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-900'
              : 'border-slate-200 bg-slate-100 text-slate-800'
          }`}
          role={status.tone === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-describedby={status ? 'report-status' : undefined}>
        {step === 'category' && (
          <div className="space-y-5">
            <fieldset
              className="space-y-3"
              aria-invalid={hasValidationError && status?.target === 'category'}
              aria-describedby={status?.target === 'category' ? 'report-status' : undefined}
            >
              <legend className="text-base font-bold text-amani-ink">{t('community.category')}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {categories.map((category) => (
                  <label
                    key={category}
                    className={`flex min-h-14 cursor-pointer items-center rounded-md border px-4 py-3 text-base font-semibold ${
                      form.category === category
                        ? 'border-amani-forest bg-amani-mist text-amani-ink'
                        : 'border-slate-300 bg-white text-slate-800'
                    } focus-within:ring-4 focus-within:ring-amani-sun`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={category}
                      checked={form.category === category}
                      onChange={() => {
                        setForm((current) => ({ ...current, category }));
                        setStatus(null);
                      }}
                      className="mr-3 h-5 w-5 accent-amani-forest"
                    />
                    <span>{t(`categories.${category}`)}</span>
                    {form.category === category && (
                      <span className="ml-auto text-sm font-bold">
                        {t('community.selected')}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-base font-bold text-amani-ink">{t('community.urgency')}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {urgencyLevels.map((urgency) => (
                  <label
                    key={urgency}
                    className={`flex min-h-12 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-bold ${
                      form.urgency === urgency
                        ? 'border-amani-forest bg-amani-forest text-white'
                        : 'border-slate-300 bg-white text-slate-800'
                    } focus-within:ring-4 focus-within:ring-amani-sun`}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value={urgency}
                      checked={form.urgency === urgency}
                      onChange={() => setForm((current) => ({ ...current, urgency }))}
                      className="mr-2 h-5 w-5 accent-amani-forest"
                    />
                    <span>{t(`urgency.${urgency}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-2">
            <label htmlFor="report-details" className="block text-base font-bold text-amani-ink">
              {t('community.details')}
            </label>
            <span id="report-details-help" className="block text-sm text-slate-600">
              {t('community.detailsHelp')}
            </span>
            <textarea
              id="report-details"
              value={form.details}
              onChange={(event) => {
                setForm((current) => ({ ...current, details: event.target.value }));
                setStatus(null);
              }}
              aria-describedby={status?.target === 'details' ? 'report-details-help report-status' : 'report-details-help'}
              aria-invalid={hasValidationError && status?.target === 'details'}
              className="min-h-44 w-full rounded-md border border-slate-300 px-4 py-3 text-base leading-7 focus:border-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-mist"
              placeholder={t('community.detailsPlaceholder')}
            />
          </div>
        )}

        {step === 'location' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <fieldset className="space-y-3">
                <legend className="text-base font-bold text-amani-ink">{t('community.placeType')}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {placeTypes.map((placeType) => (
                    <button
                      key={placeType}
                      type="button"
                      aria-pressed={form.locationPlaceType === placeType}
                      onClick={() => setForm((current) => ({ ...current, locationPlaceType: placeType }))}
                      className={`min-h-11 rounded-md border px-3 py-2 text-sm font-bold ${
                        form.locationPlaceType === placeType
                          ? 'border-amani-forest bg-amani-mist text-amani-ink'
                          : 'border-slate-300 bg-white text-slate-800'
                      } focus:outline-none focus:ring-4 focus:ring-amani-sun`}
                    >
                      {form.locationPlaceType === placeType
                        ? t('community.selectedOption', { option: t(`placeTypes.${placeType}`) })
                        : t(`placeTypes.${placeType}`)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label htmlFor="rough-location" className="block text-base font-bold text-amani-ink">
                {t('community.location')}
              </label>
              <span id="rough-location-help" className="block text-sm text-slate-600">
                {t('community.locationHelp')}
              </span>
              <input
                id="rough-location"
                type="text"
                value={form.roughLocation}
                onChange={(event) => {
                  setForm((current) => ({ ...current, roughLocation: event.target.value }));
                  setStatus(null);
                }}
                aria-describedby={status?.target === 'location' ? 'rough-location-help report-status' : 'rough-location-help'}
                aria-invalid={hasValidationError && status?.target === 'location'}
                className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 text-base focus:border-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-mist"
                placeholder={t('community.locationPlaceholder')}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="rough-region" className="block space-y-2">
                <span className="text-base font-bold text-amani-ink">{t('community.region')}</span>
                <input
                  id="rough-region"
                  type="text"
                  value={form.roughRegion}
                  onChange={(event) => setForm((current) => ({ ...current, roughRegion: event.target.value }))}
                  className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 text-base focus:border-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-mist"
                  placeholder={t('community.regionPlaceholder')}
                />
              </label>
              <label htmlFor="nearby-landmark" className="block space-y-2">
                <span className="text-base font-bold text-amani-ink">{t('community.landmark')}</span>
                <input
                  id="nearby-landmark"
                  type="text"
                  value={form.nearbyLandmark}
                  onChange={(event) => setForm((current) => ({ ...current, nearbyLandmark: event.target.value }))}
                  className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 text-base focus:border-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-mist"
                  placeholder={t('community.landmarkPlaceholder')}
                />
              </label>
            </div>

            <div className="space-y-2">
              <label htmlFor="evidence-notes" className="block text-base font-bold text-amani-ink">
                {t('community.evidence')}
              </label>
              <span id="evidence-notes-help" className="block text-sm text-slate-600">
                {t('community.evidenceHelp')}
              </span>
              <textarea
                id="evidence-notes"
                value={form.evidenceNotes}
                onChange={(event) => setForm((current) => ({ ...current, evidenceNotes: event.target.value }))}
                aria-describedby="evidence-notes-help"
                className="min-h-28 w-full rounded-md border border-slate-300 px-4 py-3 text-base leading-7 focus:border-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-mist"
                placeholder={t('community.evidencePlaceholder')}
              />
            </div>

            <fieldset className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
              <legend className="text-base font-bold text-amani-ink">{t('community.contactQuestion')}</legend>
              <p className="text-sm leading-6 text-slate-700">{t('community.contactWarning')}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(['none', 'if_needed', 'urgent'] as const).map((preference) => (
                  <label key={preference} className="flex min-h-12 items-center rounded-md border border-slate-300 px-3 py-2 font-semibold focus-within:ring-4 focus-within:ring-amani-sun">
                    <input
                      type="radio"
                      name="contactPreference"
                      checked={form.contactPreference === preference}
                      onChange={() => setForm((current) => ({ ...current, contactPreference: preference }))}
                      className="mr-2 h-5 w-5 accent-amani-forest"
                    />
                    {t(`contactPreference.${preference}`)}
                  </label>
                ))}
              </div>
              {form.contactPreference !== 'none' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label htmlFor="contact-method" className="block space-y-2">
                    <span className="text-sm font-bold text-slate-700">{t('community.contactMethod')}</span>
                    <select
                      id="contact-method"
                      value={form.contactMethod}
                      onChange={(event) => setForm((current) => ({ ...current, contactMethod: event.target.value as FormState['contactMethod'] }))}
                      aria-describedby={status?.target === 'contact' ? 'report-status' : undefined}
                      aria-invalid={hasValidationError && status?.target === 'contact'}
                      className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
                    >
                      <option value="">{t('community.chooseContactMethod')}</option>
                      <option value="phone">{t('contactMethod.phone')}</option>
                      <option value="email">{t('contactMethod.email')}</option>
                      <option value="trusted_contact">{t('contactMethod.trusted_contact')}</option>
                      <option value="other">{t('contactMethod.other')}</option>
                    </select>
                  </label>
                  <label htmlFor="contact-details" className="block space-y-2">
                    <span className="text-sm font-bold text-slate-700">{t('community.contactDetails')}</span>
                    <input
                      id="contact-details"
                      type="text"
                      value={form.contactDetails}
                      onChange={(event) => setForm((current) => ({ ...current, contactDetails: event.target.value }))}
                      aria-describedby={status?.target === 'contact' ? 'report-status' : undefined}
                      aria-invalid={hasValidationError && status?.target === 'contact'}
                      className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
                    />
                  </label>
                </div>
              )}
            </fieldset>

            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h2 className="text-base font-bold text-amani-ink">{t('community.currentLocationTitle')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{t('community.currentLocationWarning')}</p>
              <button
                type="button"
                onClick={useCurrentLocation}
                className="mt-3 min-h-12 rounded-md border border-amani-forest px-4 py-3 text-base font-bold text-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-sun"
              >
                {t('community.useCurrentLocation')}
              </button>
              {form.currentLocation && <p className="mt-2 text-sm font-semibold text-slate-700">{t('community.locationReady')}</p>}
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-amani-ink">{t('community.reviewTitle')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{t('community.reviewIntro')}</p>
            </div>
            <dl className="grid gap-3">
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-bold text-slate-600">{t('community.category')}</dt>
                <dd className="mt-1 text-base text-amani-ink">{form.category ? t(`categories.${form.category}`) : t('community.missing')}</dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-bold text-slate-600">{t('community.urgency')}</dt>
                <dd className="mt-1 text-base text-amani-ink">{t(`urgency.${form.urgency}`)}</dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-bold text-slate-600">{t('community.details')}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-base leading-7 text-amani-ink">{form.details}</dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-bold text-slate-600">{t('community.location')}</dt>
                <dd className="mt-1 text-base text-amani-ink">{form.roughLocation}</dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-bold text-slate-600">{t('community.contactQuestion')}</dt>
                <dd className="mt-1 text-base text-amani-ink">{t(`contactPreference.${form.contactPreference}`)}</dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <dt className="text-sm font-bold text-slate-600">{t('community.evidence')}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-base leading-7 text-amani-ink">
                  {form.evidenceNotes.trim() || t('community.missing')}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {step !== 'category' && (
            <button
              type="button"
              onClick={goBack}
              className="min-h-12 rounded-md border border-amani-forest px-4 py-3 text-base font-bold text-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-sun"
            >
              {t('community.back')}
            </button>
          )}
          <button
            type="button"
            onClick={() => saveCurrentDraft()}
            className="min-h-12 rounded-md border border-amani-forest px-4 py-3 text-base font-bold text-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-sun"
          >
            {t('community.saveDraft')}
          </button>
          {step === 'review' ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-12 rounded-md bg-amani-forest px-4 py-3 text-base font-bold text-white shadow-sm hover:bg-amani-leaf focus:outline-none focus:ring-4 focus:ring-amani-sun"
            >
              {isSubmitting ? t('community.submitting') : t('community.submit')}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="min-h-12 rounded-md bg-amani-forest px-4 py-3 text-base font-bold text-white shadow-sm hover:bg-amani-leaf focus:outline-none focus:ring-4 focus:ring-amani-sun"
            >
              {t('community.next')}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
