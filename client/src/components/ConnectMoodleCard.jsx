import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export function ConnectMoodleCard({ defaultBaseUrl, onConnected }) {
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showTokenFlow, setShowTokenFlow] = useState(false);
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState(null);
  const [tokenSubmitting, setTokenSubmitting] = useState(false);
  const [showTokenHint, setShowTokenHint] = useState(false);

  const usernameRef = useRef(null);

  useEffect(() => {
    if (defaultBaseUrl && !baseUrl) setBaseUrl(defaultBaseUrl);
  }, [defaultBaseUrl, baseUrl]);

  useEffect(() => {
    if (usernameRef.current) usernameRef.current.focus();
  }, []);

  async function handleCredentialsSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.post('/api/moodle/login', {
        baseUrl: baseUrl.trim() || undefined,
        username: username.trim(),
        password,
      });
      setPassword('');
      if (onConnected) onConnected(result);
    } catch (err) {
      setPassword('');
      setError(err.message || 'Failed to sign in to Moodle.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTokenSubmit(e) {
    e.preventDefault();
    setTokenError(null);
    if (!token.trim()) {
      setTokenError('Paste your Moodle Web Services token first.');
      return;
    }
    setTokenSubmitting(true);
    try {
      const result = await api.post('/api/moodle/connect', {
        token: token.trim(),
        baseUrl: baseUrl.trim() || undefined,
      });
      setToken('');
      if (onConnected) onConnected(result);
    } catch (err) {
      setTokenError(err.message || 'Failed to connect to Moodle.');
    } finally {
      setTokenSubmitting(false);
    }
  }

  return (
    <div className="connect-card">
      <div className="connect-card__head">
        <h3 className="connect-card__title">Connect Moodle</h3>
        <span className="badge badge--moodle">Moodle</span>
      </div>
      <p className="connect-card__body">
        Sign in with your Moodle credentials and AkaDash will fetch a personal
        access token for you. We never see your password after the request.
      </p>
      <form className="connect-form" onSubmit={handleCredentialsSubmit}>
        <label className="connect-form__field">
          <span className="connect-form__label">Moodle base URL</span>
          <input
            className="connect-form__input"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={defaultBaseUrl || 'https://mylms.atlas.edu.tr'}
            autoComplete="url"
          />
        </label>
        <label className="connect-form__field">
          <span className="connect-form__label">Username</span>
          <input
            ref={usernameRef}
            className="connect-form__input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            spellCheck={false}
            maxLength={256}
          />
        </label>
        <label className="connect-form__field">
          <span className="connect-form__label">Password</span>
          <input
            className="connect-form__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            maxLength={1024}
          />
        </label>
        {error ? (
          <div className="connect-form__error" role="alert">
            {error}
          </div>
        ) : null}
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            'Sign in to Moodle'
          )}
        </button>
        <p className="connect-card__hint">
          We sign in to Moodle on your behalf to get a personal access token.
          Your password is sent only to your AkaDash backend and is never
          stored — only the resulting token is kept.
        </p>
      </form>

      <button
        type="button"
        className="btn-link"
        onClick={() => setShowTokenFlow((v) => !v)}
      >
        {showTokenFlow
          ? 'Hide existing-token option'
          : 'Use an existing token instead'}
      </button>
      {showTokenFlow ? (
        <form className="connect-form" onSubmit={handleTokenSubmit}>
          <label className="connect-form__field">
            <span className="connect-form__label">Moodle token</span>
            <input
              className="connect-form__input"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. a1b2c3d4e5f6…"
              spellCheck={false}
            />
          </label>
          {tokenError ? (
            <div className="connect-form__error" role="alert">
              {tokenError}
            </div>
          ) : null}
          <button
            className="btn-primary"
            type="submit"
            disabled={tokenSubmitting}
          >
            {tokenSubmitting ? 'Connecting…' : 'Connect with token'}
          </button>
          <button
            type="button"
            className="btn-link"
            onClick={() => setShowTokenHint((v) => !v)}
          >
            {showTokenHint ? 'Hide instructions' : 'How do I get this token?'}
          </button>
          {showTokenHint ? (
            <ol className="connect-card__hint-list">
              <li>
                Sign in to your university Moodle (default:{' '}
                <code>{defaultBaseUrl || 'https://mylms.atlas.edu.tr'}</code>).
              </li>
              <li>
                Open{' '}
                <strong>
                  Profile → Preferences → User account → Security keys
                </strong>
                .
              </li>
              <li>
                Copy the token for the <em>Moodle mobile web service</em>. If
                none exists, ask IT to enable the mobile service for your
                account.
              </li>
              <li>
                Paste the token above. AkaDash stores it only on the server.
              </li>
            </ol>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
