import { ar } from './locales/ar';
import { en } from './locales/en';
import { fr } from './locales/fr';
import { pt } from './locales/pt';
import { sw } from './locales/sw';

const requiredLocalizedKeys = [
  'appName',
  'quickExit',
  'skipToContent',
  'nav.community',
  'nav.followup',
  'nav.responder',
  'nav.public',
  'nav.account',
  'community.title',
  'community.category',
  'community.details',
  'community.location',
  'community.submit',
  'community.submittedTitle',
  'community.caseId',
  'community.followUpCode',
  'followup.title',
  'responder.title',
  'public.title',
  'public.intro',
  'public.total',
  'content.publicTitle',
  'content.article',
  'content.meeting',
  'content.loadMedia',
  'content.showMediaAutomatically',
  'content.noPublicContent',
  'account.title',
  'account.signup',
  'account.login',
  'account.logout',
  'categories.conflict_risk',
  'categories.resource_dispute',
  'categories.exclusion',
  'categories.corruption',
  'categories.abuse',
  'categories.other',
  'urgency.low',
  'urgency.medium',
  'urgency.high',
];

const locales = { ar, en, fr, pt, sw };

function valueAtPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
}

describe('i18n critical key coverage', () => {
  for (const [locale, resources] of Object.entries(locales)) {
    it(`${locale} provides critical product copy`, () => {
      const missing = requiredLocalizedKeys.filter((key) => typeof valueAtPath(resources, key) !== 'string');

      expect(missing).toEqual([]);
    });
  }
});
