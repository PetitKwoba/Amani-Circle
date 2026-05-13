import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchResponderSession, loginResponder, logoutResponder, ResponderSessionResponse, signupAccount } from '../../api';
import { ResponderDashboard } from '../responder/ResponderDashboard';

type Mode = 'login' | 'signup';

export function Account() {
  const { t } = useTranslation();
  const [session, setSession] = useState<ResponderSessionResponse>({ authenticated: false });
  const [mode, setMode] = useState<Mode>('login');
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');

  useEffect(() => {
    fetchResponderSession()
      .then((result) => {
        setSession(result);
        setStatus('ready');
      })
      .catch(() => setStatus('ready'));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    try {
      const result =
        mode === 'signup'
          ? await signupAccount({ contact_type: contactType, contact, username, password })
          : await loginResponder(username, password);
      setSession(result);
      setPassword('');
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  async function handleLogout() {
    setStatus('saving');
    const result = await logoutResponder().catch(() => ({ authenticated: false }));
    setSession(result);
    setStatus('ready');
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="account-title">
        <h1 id="account-title" className="text-2xl font-bold text-amani-ink">
          {t('account.title')}
        </h1>
        <p className="mt-4 rounded-md border border-slate-200 bg-white p-4 text-slate-700" role="status">
          {t('account.loading')}
        </p>
      </section>
    );
  }

  if (session.authenticated) {
    const canRespond = session.role === 'responder' || session.role === 'admin';
    return (
      <section className="space-y-5" aria-labelledby="account-title">
        <div className="rounded-md border border-slate-300 bg-white p-4">
          <h1 id="account-title" className="text-2xl font-bold text-amani-ink">
            {t('account.title')}
          </h1>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-bold text-slate-700">{t('account.username')}</dt>
              <dd className="text-base text-slate-900">{session.username}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-slate-700">{t('account.role')}</dt>
              <dd className="text-base text-slate-900">{session.role ? t(`account.roles.${session.role}`) : t('community.missing')}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-slate-700">{t('account.contact')}</dt>
              <dd className="text-base text-slate-900">{session.contact ?? t('community.missing')}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-slate-700">{t('account.anonymousStillAvailable')}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 min-h-12 rounded-md border border-slate-400 px-4 py-3 text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amani-sun"
          >
            {t('account.logout')}
          </button>
        </div>
        {canRespond ? (
          <ResponderDashboard />
        ) : (
          <div className="rounded-md border border-slate-200 bg-white p-4 text-slate-700">
            {t('account.reporterOnly')}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="account-title">
      <div className="space-y-2">
        <h1 id="account-title" className="text-2xl font-bold text-amani-ink">
          {t('account.title')}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-700">{t('account.intro')}</p>
      </div>
      <div className="flex gap-2" role="tablist" aria-label={t('account.modeLabel')}>
        {(['login', 'signup'] as const).map((nextMode) => (
          <button
            key={nextMode}
            type="button"
            onClick={() => setMode(nextMode)}
            aria-pressed={mode === nextMode}
            className={`min-h-12 rounded-md px-4 py-3 text-base font-bold focus:outline-none focus:ring-4 focus:ring-amani-sun ${
              mode === nextMode ? 'bg-amani-forest text-white' : 'border border-slate-300 bg-white text-slate-900'
            }`}
          >
            {t(`account.${nextMode}`)}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-md border border-slate-300 bg-white p-4">
        {mode === 'signup' && (
          <>
            <fieldset className="space-y-2">
              <legend className="text-base font-bold text-amani-ink">{t('account.contactType')}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['email', 'phone'] as const).map((type) => (
                  <label key={type} className="flex min-h-12 items-center rounded-md border border-slate-300 px-3 py-2 font-semibold focus-within:ring-4 focus-within:ring-amani-sun">
                    <input
                      type="radio"
                      name="contactType"
                      checked={contactType === type}
                      onChange={() => setContactType(type)}
                      className="mr-2 h-5 w-5 accent-amani-forest"
                    />
                    {t(`account.contactTypes.${type}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block space-y-2" htmlFor="account-contact">
              <span className="text-base font-bold text-amani-ink">{t('account.contact')}</span>
              <input
                id="account-contact"
                type={contactType === 'email' ? 'email' : 'tel'}
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                className="min-h-12 w-full rounded-md border border-slate-400 px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-amani-sun"
              />
            </label>
          </>
        )}
        <label className="block space-y-2" htmlFor="account-username">
          <span className="text-base font-bold text-amani-ink">{t('account.username')}</span>
          <input
            id="account-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="min-h-12 w-full rounded-md border border-slate-400 px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-amani-sun"
          />
        </label>
        <label className="block space-y-2" htmlFor="account-password">
          <span className="text-base font-bold text-amani-ink">{t('account.password')}</span>
          <input
            id="account-password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 w-full rounded-md border border-slate-400 px-4 py-3 text-base focus:outline-none focus:ring-4 focus:ring-amani-sun"
          />
        </label>
        <p className="text-sm leading-6 text-slate-700">{t('account.privacyNote')}</p>
        {status === 'error' && (
          <p className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-900" role="alert">
            {t('account.error')}
          </p>
        )}
        <button
          type="submit"
          disabled={status === 'saving'}
          className="min-h-12 rounded-md bg-amani-forest px-4 py-3 text-base font-bold text-white focus:outline-none focus:ring-4 focus:ring-amani-sun"
        >
          {status === 'saving' ? t('account.saving') : t(`account.${mode}`)}
        </button>
      </form>
    </section>
  );
}
