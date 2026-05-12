import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchPublicStats, PublicBucket, PublicStats } from '../../api';

function BucketList({
  buckets,
  labelKey,
  total,
}: {
  buckets: PublicBucket[];
  labelKey?: string;
  total: number;
}) {
  const { t } = useTranslation();

  if (buckets.length === 0) {
    return <p className="mt-3 text-sm text-slate-600">{t('public.empty')}</p>;
  }

  return (
    <div className="mt-4 space-y-3" role="list">
      {buckets.map((bucket) => {
        const label = labelKey ? t(`${labelKey}.${bucket.key}`) : bucket.key;
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
  const { t } = useTranslation();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loadingState, setLoadingState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    fetchPublicStats()
      .then((result) => {
        setStats(result);
        setLoadingState('ready');
      })
      .catch(() => setLoadingState('error'));
  }, []);

  const topCategory = stats?.by_category[0]?.key;
  const maxWeeklyCount = Math.max(...(stats?.by_week.map((week) => week.count) ?? [0]), 1);

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
                {topCategory ? t(`categories.${topCategory}`) : t('public.empty')}
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
        </>
      )}
    </section>
  );
}
