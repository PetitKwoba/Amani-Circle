import { FormEvent, lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ContentType,
  createResponderContent,
  fetchAdminContentReview,
  fetchResponderContent,
  PublicContent,
  reviewAdminContent,
  submitResponderContent,
  RichTextDocument,
  updateResponderContent,
  uploadResponderContentAsset,
} from '../../api';
import { RichTextRenderer } from '../content/RichTextRenderer';

const RichTextEditor = lazy(() =>
  import('../content/RichTextEditor').then((module) => ({ default: module.RichTextEditor })),
);

type Props = {
  role: 'reporter' | 'responder' | 'admin' | null;
};

const emptyForm = {
  contentType: 'article' as ContentType,
  title: '',
  heroMessage: '',
  summary: '',
  bodyJson: null as RichTextDocument | null,
  bodyText: '',
  meetingStartsAt: '',
  meetingLocation: '',
  country: '',
  city: '',
  village: '',
};

function formatDate(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function CommunityContentManager({ role }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<PublicContent[]>([]);
  const [reviewItems, setReviewItems] = useState<PublicContent[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [reviewNote, setReviewNote] = useState('');
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<number | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');

  async function loadContent() {
    const [owned, review] = await Promise.all([
      fetchResponderContent(),
      role === 'admin' ? fetchAdminContentReview() : Promise.resolve([]),
    ]);
    setItems(owned);
    setReviewItems(review);
    setStatus('ready');
  }

  useEffect(() => {
    loadContent().catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    try {
      const payload = {
        content_type: form.contentType,
        title: form.title,
        hero_message: form.contentType === 'article' ? form.heroMessage : undefined,
        summary: form.summary,
        body: form.contentType === 'article' ? form.bodyText : undefined,
        body_json: form.contentType === 'article' && form.bodyJson ? form.bodyJson : undefined,
        body_text: form.contentType === 'article' ? form.bodyText : undefined,
        meeting_starts_at: form.contentType === 'meeting' ? form.meetingStartsAt : undefined,
        meeting_location: form.contentType === 'meeting' ? form.meetingLocation : undefined,
        country: form.country || undefined,
        city: form.city || undefined,
        village: form.village || undefined,
      };
      if (editingContentId) {
        await updateResponderContent(editingContentId, payload);
      } else {
        await createResponderContent(payload);
      }
      setForm(emptyForm);
      setEditingContentId(null);
      await loadContent();
    } catch {
      setStatus('error');
    }
  }

  function startEditing(item: PublicContent) {
    setEditingContentId(item.id);
    setForm({
      contentType: item.content_type,
      title: item.title,
      heroMessage: item.hero_message ?? '',
      summary: item.summary,
      bodyJson: item.body_json,
      bodyText: item.body_text ?? item.body ?? '',
      meetingStartsAt: item.meeting_starts_at ?? '',
      meetingLocation: item.meeting_location ?? '',
      country: item.country ?? '',
      city: item.city ?? '',
      village: item.village ?? '',
    });
  }

  function cancelEditing() {
    setEditingContentId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(contentId: number) {
    setStatus('saving');
    try {
      await submitResponderContent(contentId);
      await loadContent();
    } catch {
      setStatus('error');
    }
  }

  async function handleReview(contentId: number, action: 'approve' | 'reject' | 'archive') {
    setStatus('saving');
    try {
      await reviewAdminContent(contentId, action, reviewNote);
      setReviewNote('');
      await loadContent();
    } catch {
      setStatus('error');
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContentId || !selectedFile) return;
    setStatus('saving');
    try {
      await uploadResponderContentAsset(Number(selectedContentId), selectedFile);
      setSelectedFile(null);
      await loadContent();
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="space-y-5 rounded-md border border-slate-300 bg-white p-4" aria-labelledby="content-manager-title">
      <div>
        <h2 id="content-manager-title" className="text-lg font-bold text-amani-ink">
          {t('content.managerTitle')}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{t('content.managerHelp')}</p>
      </div>

      {status === 'error' && (
        <p className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-900" role="alert">
          {t('content.error')}
        </p>
      )}
      {status === 'saving' && (
        <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700" role="status">
          {t('content.saving')}
        </p>
      )}

      <form onSubmit={handleCreate} className="grid gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">{t('content.type')}</span>
          <select
            value={form.contentType}
            onChange={(event) => setForm((current) => ({ ...current, contentType: event.target.value as ContentType }))}
            className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
          >
            <option value="article">{t('content.article')}</option>
            <option value="meeting">{t('content.meeting')}</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">{t('content.title')}</span>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
          />
        </label>
        <label className="block space-y-2 sm:col-span-2">
          <span className="text-sm font-bold text-slate-700">{t('content.summary')}</span>
          <input
            value={form.summary}
            onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
            className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
          />
        </label>
        {form.contentType === 'article' ? (
          <>
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">{t('content.heroMessage')}</span>
              <textarea
                value={form.heroMessage}
                onChange={(event) => setForm((current) => ({ ...current, heroMessage: event.target.value }))}
                maxLength={240}
                className="min-h-24 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
              />
              <span className="block text-sm leading-6 text-slate-700">{t('content.heroMessageHelp')}</span>
            </label>
            <div className="sm:col-span-2">
              <p id="article-body-label" className="mb-2 text-sm font-bold text-slate-700">
                {t('content.body')}
              </p>
              <Suspense fallback={<p role="status" className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">{t('content.editorLoading')}</p>}>
                <RichTextEditor
                  value={form.bodyJson}
                  labelledBy="article-body-label"
                  imageAssets={
                    editingContentId
                      ? items.find((item) => item.id === editingContentId)?.assets.filter((asset) => asset.asset_type === 'image') ?? []
                      : []
                  }
                  onChange={(bodyJson, bodyText) => setForm((current) => ({ ...current, bodyJson, bodyText }))}
                />
              </Suspense>
            </div>
          </>
        ) : (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">{t('content.meetingStartsAt')}</span>
              <input
                type="datetime-local"
                value={form.meetingStartsAt}
                onChange={(event) => setForm((current) => ({ ...current, meetingStartsAt: event.target.value }))}
                className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">{t('content.meetingLocation')}</span>
              <input
                value={form.meetingLocation}
                onChange={(event) => setForm((current) => ({ ...current, meetingLocation: event.target.value }))}
                className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3 focus:outline-none focus:ring-4 focus:ring-amani-sun"
              />
            </label>
          </>
        )}
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">{t('community.country')}</span>
          <input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">{t('community.city')}</span>
          <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3" />
        </label>
        <p className="text-sm leading-6 text-slate-700 sm:col-span-2">{t('content.safetyNote')}</p>
        <button type="submit" className="min-h-12 rounded-md bg-amani-forest px-4 py-3 font-bold text-white focus:outline-none focus:ring-4 focus:ring-amani-sun sm:w-fit">
          {editingContentId ? t('content.saveDraft') : t('content.createDraft')}
        </button>
        {editingContentId && (
          <button type="button" onClick={cancelEditing} className="min-h-12 rounded-md border border-slate-400 px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun sm:w-fit">
            {t('content.cancelEdit')}
          </button>
        )}
      </form>

      <div>
        <h3 className="text-base font-bold text-amani-ink">{t('content.myDrafts')}</h3>
        <form onSubmit={handleUpload} className="mt-3 grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">{t('content.attachTo')}</span>
            <select
              value={selectedContentId}
              onChange={(event) => setSelectedContentId(event.target.value ? Number(event.target.value) : '')}
              className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3"
            >
              <option value="">{t('content.chooseDraft')}</option>
              {items
                .filter((item) => item.status === 'draft' || item.status === 'rejected')
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">{t('content.mediaFile')}</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.mp4,.webm"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3"
            />
          </label>
          <button type="submit" className="min-h-12 self-end rounded-md border border-amani-forest px-4 py-3 font-bold text-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-sun">
            {t('content.uploadMedia')}
          </button>
          <p className="text-sm leading-6 text-slate-700 sm:col-span-3">{t('content.mediaSafetyNote')}</p>
        </form>
        <div className="mt-3 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-slate-700">{t('content.empty')}</p>
          ) : (
            items.map((item) => (
              <article key={item.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="font-bold text-amani-ink">{item.title}</h4>
                    {item.hero_message && <p className="mt-1 text-sm font-semibold text-slate-800">{item.hero_message}</p>}
                    <p className="text-sm text-slate-700">{item.summary}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {t(`content.status.${item.status}`)} | {t(`content.${item.content_type}`)}
                    </p>
                    {item.admin_review_note && <p className="mt-1 text-sm text-slate-700">{item.admin_review_note}</p>}
                    {item.assets.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {item.assets.map((asset) => (
                          <li key={asset.id}>
                            {asset.original_filename} - {asset.scan_status ? t(`content.scanStatus.${asset.scan_status}`) : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {(item.status === 'draft' || item.status === 'rejected') && (
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => startEditing(item)} className="min-h-11 rounded-md border border-slate-400 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun">
                        {t('content.editDraft')}
                      </button>
                      <button type="button" onClick={() => handleSubmit(item.id)} className="min-h-11 rounded-md border border-amani-forest px-3 py-2 text-sm font-bold text-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-sun">
                        {t('content.submitForReview')}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {role === 'admin' && (
        <div>
          <h3 className="text-base font-bold text-amani-ink">{t('content.adminReview')}</h3>
          <label className="mt-3 block space-y-2">
            <span className="text-sm font-bold text-slate-700">{t('content.reviewNote')}</span>
            <input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} className="min-h-12 w-full rounded-md border border-slate-300 px-4 py-3" />
          </label>
          <div className="mt-3 space-y-3">
            {reviewItems.length === 0 ? (
              <p className="text-sm text-slate-700">{t('content.noReviewItems')}</p>
            ) : (
              reviewItems.map((item) => (
                <article key={item.id} className="rounded-md border border-slate-200 p-3">
                  <h4 className="font-bold text-amani-ink">{item.title}</h4>
                  {item.hero_message && <p className="mt-1 text-sm font-semibold text-slate-800">{item.hero_message}</p>}
                  <p className="text-sm text-slate-700">{item.summary}</p>
                  {item.meeting_starts_at && <p className="text-sm text-slate-700">{formatDate(item.meeting_starts_at)}</p>}
                  {item.meeting_location && <p className="text-sm text-slate-700">{item.meeting_location}</p>}
                  <RichTextRenderer document={item.body_json} fallbackText={item.body_text ?? item.body} assets={item.assets} />
                  {item.assets.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {item.assets.map((asset) => (
                        <li key={asset.id}>
                          {asset.original_filename} - {asset.scan_status ? t(`content.scanStatus.${asset.scan_status}`) : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => handleReview(item.id, 'approve')} className="min-h-11 rounded-md bg-amani-forest px-3 py-2 text-sm font-bold text-white focus:outline-none focus:ring-4 focus:ring-amani-sun">
                      {t('content.approve')}
                    </button>
                    <button type="button" onClick={() => handleReview(item.id, 'reject')} className="min-h-11 rounded-md border border-slate-400 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun">
                      {t('content.reject')}
                    </button>
                    <button type="button" onClick={() => handleReview(item.id, 'archive')} className="min-h-11 rounded-md border border-slate-400 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun">
                      {t('content.archive')}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
