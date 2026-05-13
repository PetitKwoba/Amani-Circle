import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchPublicContent, fetchPublicStats, publicAssetUrl, PublicBucket, PublicContent, PublicStats } from '../../api';
import { RichTextRenderer } from '../content/RichTextRenderer';

function BucketList({
  buckets,
  labelKey,
  total,
}: {
  buckets: PublicBucket[];
  labelKey?: string;
  total: number;
}) {
  const { t, i18n } = useTranslation();

  if (buckets.length === 0) {
    return <p className="mt-3 text-sm text-slate-600">{t('public.empty')}</p>;
  }

  return (
    <div className="mt-4 space-y-3" role="list">
      {buckets.map((bucket) => {
        const translationKey = labelKey ? `${labelKey}.${bucket.key}` : '';
        const label = labelKey && i18n.exists(translationKey) ? t(translationKey) : bucket.key;
        const percentage = total > 0 ? Math.round((bucket.count / total) * 100) : 0;

        return (
          <div key={bucket.key} role="listitem">
            <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-700">
              <span>{label}</span>
              <span>
                {bucket.count} ({percentage}%)
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className="h-full rounded-full bg-amani-leaf" style={{ width: `${percentage}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PublicDashboard() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [content, setContent] = useState<PublicContent[]>([]);
  const [contentFilter, setContentFilter] = useState<'all' | 'article' | 'meeting'>('all');
  const [showMediaAutomatically, setShowMediaAutomatically] = useState(
    localStorage.getItem('amani-show-media-automatically') === 'true',
  );
  const [loadedAssets, setLoadedAssets] = useState<Record<number, boolean>>({});
  const [loadingState, setLoadingState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    Promise.all([fetchPublicStats(), fetchPublicContent()])
      .then(([statsResult, contentResult]) => {
        setStats(statsResult);
        setContent(contentResult);
        setLoadingState('ready');
      })
      .catch(() => setLoadingState('error'));
  }, []);

  const topCategory = stats?.by_category[0]?.key;
  const topCategoryLabel = topCategory
    ? i18n.exists(`categories.${topCategory}`)
      ? t(`categories.${topCategory}`)
      : topCategory
    : t('public.empty');
  const maxWeeklyCount = Math.max(...(stats?.by_week.map((week) => week.count) ?? [0]), 1);
  const visibleContent = content.filter((item) => contentFilter === 'all' || item.content_type === contentFilter);

  function updateMediaPreference(nextValue: boolean) {
    setShowMediaAutomatically(nextValue);
    if (nextValue) {
      localStorage.setItem('amani-show-media-automatically', 'true');
    } else {
      localStorage.removeItem('amani-show-media-automatically');
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="public-title">
      <div className="space-y-2">
        <h1 id="public-title" className="text-2xl font-bold text-amani-ink">
          {t('public.title')}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-700">{t('public.intro')}</p>
      </div>

      {loadingState === 'loading' && (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-slate-700" role="status">
          {t('public.loading')}
        </p>
      )}

      {loadingState === 'error' && (
        <p className="rounded-md border border-rose-300 bg-rose-50 p-4 font-medium text-rose-900" role="alert">
          {t('public.error')}
        </p>
      )}

      {loadingState === 'ready' && stats && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{t('public.total')}</p>
              <p className="mt-2 text-4xl font-bold text-amani-ink">{stats.total_reports}</p>
            </article>
            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{t('public.topCategory')}</p>
              <p className="mt-2 text-2xl font-bold text-amani-ink">
                {topCategoryLabel}
              </p>
            </article>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-amani-ink">{t('public.roughRegions')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{t('public.regionPrivacyNote')}</p>
              <BucketList buckets={stats.by_region} total={stats.total_reports} />
            </article>
            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-amani-ink">{t('community.category')}</h2>
              <BucketList buckets={stats.by_category} labelKey="categories" total={stats.total_reports} />
            </article>
            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-amani-ink">{t('public.urgency')}</h2>
              <BucketList buckets={stats.by_urgency} labelKey="urgency" total={stats.total_reports} />
            </article>
            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-amani-ink">{t('public.status')}</h2>
              <BucketList buckets={stats.by_status} labelKey="reportStatus" total={stats.total_reports} />
            </article>
          </div>

          <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-amani-ink">{t('public.weeklyTrend')}</h2>
            {stats.by_week.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">{t('public.empty')}</p>
            ) : (
              <div className="mt-4 space-y-3" role="list">
                {stats.by_week.map((week) => {
                  const percentage = Math.round((week.count / maxWeeklyCount) * 100);

                  return (
                    <div key={week.week_start} role="listitem">
                      <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-700">
                        <span>{week.week_start}</span>
                        <span>{week.count}</span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                        <div className="h-full rounded-full bg-amani-forest" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="public-updates-title">
            <h2 id="public-updates-title" className="text-lg font-bold text-amani-ink">{t('content.publicTitle')}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{t('content.publicHelp')}</p>
            <div className="mt-4 flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-800">{t('content.lowDataOn')}</p>
              <label className="flex min-h-11 items-center gap-2 font-bold text-slate-900">
                <input
                  type="checkbox"
                  checked={showMediaAutomatically}
                  onChange={(event) => updateMediaPreference(event.target.checked)}
                  className="h-5 w-5 accent-amani-forest"
                />
                {t('content.showMediaAutomatically')}
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2" aria-label={t('content.filterLabel')}>
              {(['all', 'article', 'meeting'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setContentFilter(filter)}
                  aria-pressed={contentFilter === filter}
                  className={`min-h-11 rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-amani-sun ${
                    contentFilter === filter ? 'bg-amani-forest text-white' : 'border border-slate-300 text-slate-900'
                  }`}
                >
                  {filter === 'all' ? t('content.allUpdates') : t(`content.${filter}`)}
                </button>
              ))}
            </div>
            {visibleContent.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">{t('content.noPublicContent')}</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {visibleContent.map((item) => (
                  <section key={item.id} className="rounded-md border border-slate-200 p-3" aria-labelledby={`public-content-${item.id}`}>
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-600">
                      {t(`content.${item.content_type}`)}
                    </p>
                    <h3 id={`public-content-${item.id}`} className="mt-1 text-base font-bold text-amani-ink">
                      {item.title}
                    </h3>
                    {item.hero_message && <p className="mt-2 text-base font-bold leading-7 text-slate-900">{item.hero_message}</p>}
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.summary}</p>
                    {item.meeting_starts_at && <p className="mt-2 text-sm font-semibold text-slate-700">{item.meeting_starts_at}</p>}
                    {item.meeting_location && <p className="mt-1 text-sm text-slate-700">{item.meeting_location}</p>}
                    <RichTextRenderer
                      document={item.body_json}
                      fallbackText={item.body_text ?? item.body}
                      assets={item.assets}
                      showMediaAutomatically={showMediaAutomatically}
                      loadedAssets={loadedAssets}
                      onLoadAsset={(assetId) => setLoadedAssets((current) => ({ ...current, [assetId]: true }))}
                      loadMediaLabel={t('content.loadMedia')}
                    />
                    {item.assets.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {item.assets.map((asset) => {
                          const shouldLoad = showMediaAutomatically || loadedAssets[asset.id];
                          return (
                            <div key={asset.id} className="rounded-md border border-slate-200 p-2">
                              <p className="text-sm font-semibold text-slate-800">
                                {asset.original_filename} ({t(`content.assetType.${asset.asset_type}`)})
                              </p>
                              {asset.asset_type === 'image' && shouldLoad && asset.thumbnail_url && (
                                <img
                                  src={publicAssetUrl(asset.thumbnail_url)}
                                  alt=""
                                  loading="lazy"
                                  className="mt-2 max-h-64 rounded-md border border-slate-200 object-contain"
                                />
                              )}
                              {asset.asset_type === 'pdf' && shouldLoad && asset.url && (
                                <a className="mt-2 inline-block font-bold text-amani-forest underline" href={publicAssetUrl(asset.url)}>
                                  {t('content.downloadPdf')}
                                </a>
                              )}
                              {asset.asset_type === 'video' && shouldLoad && asset.url && (
                                <video controls preload="none" className="mt-2 max-h-72 w-full rounded-md border border-slate-200">
                                  <source src={publicAssetUrl(asset.url)} type={asset.mime_type} />
                                </video>
                              )}
                              {!shouldLoad && (
                                <button
                                  type="button"
                                  onClick={() => setLoadedAssets((current) => ({ ...current, [asset.id]: true }))}
                                  className="mt-2 min-h-11 rounded-md border border-amani-forest px-3 py-2 text-sm font-bold text-amani-forest focus:outline-none focus:ring-4 focus:ring-amani-sun"
                                >
                                  {t('content.loadMedia')}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
