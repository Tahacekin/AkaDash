import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { ConnectGmailCard } from '../components/ConnectGmailCard';
import { ConnectMoodleCard } from '../components/ConnectMoodleCard';
import {
  MailSection,
  UpcomingSection,
} from '../components/DashboardSections';
import { HeaderStrip } from '../components/dashboard/HeaderStrip';
import { StatCards } from '../components/dashboard/StatCards';
import { SourcePicker } from '../components/dashboard/SourcePicker';
import { WorkloadChart } from '../components/dashboard/WorkloadChart';
import { MailCategoryChart } from '../components/dashboard/MailCategoryChart';
import { useAuth } from '../context/useAuth';
import { api } from '../lib/api';

const POLL_INTERVAL_MS = 60_000;

function scrollToId(id) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [moodleStatus, setMoodleStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [source, setSource] = useState('all');

  const abortRef = useRef(null);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [dashboard, moodle] = await Promise.all([
        fetch('/api/dashboard', {
          credentials: 'include',
          signal: ctrl.signal,
        }).then((r) => {
          if (!r.ok) throw new Error(`Dashboard ${r.status}`);
          return r.json();
        }),
        fetch('/api/moodle/status', {
          credentials: 'include',
          signal: ctrl.signal,
        }).then((r) => (r.ok ? r.json() : null)),
      ]);
      setData(dashboard);
      setMoodleStatus(moodle);
      setError(null);
      setNow(Date.now());
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData]);

  useEffect(() => {
    const id = setInterval(() => fetchData({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const connections = data?.connections || { gmail: false, moodle: false };
  const mail = useMemo(
    () => data?.mail || { items: [], error: null },
    [data]
  );
  const moodleData = useMemo(
    () => data?.moodle || { assignments: [], deadlines: [], error: null },
    [data]
  );

  const showMoodle = source === 'all' || source === 'moodle';
  const showMail = source === 'all' || source === 'mail';
  const showBothCharts = source === 'all';

  return (
    <AppShell user={user} onLogout={logout}>
      <div className="dashboard">
        <HeaderStrip
          user={user}
          gmail={{
            connected: connections.gmail,
            error: !connections.gmail ? false : Boolean(mail.error),
            needsReconsent: Boolean(mail.needsReconsent),
          }}
          moodle={{
            connected: connections.moodle,
            error: connections.moodle ? Boolean(moodleData.error) : false,
            needsReconsent: false,
          }}
          fetchedAt={data?.fetchedAt}
          now={now}
          refreshing={refreshing}
          loading={loading}
          onRefresh={() => fetchData({ silent: true })}
        />

        {error ? (
          <div className="banner banner--error" role="alert">
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="loading-grid">
            <div className="skeleton skeleton--card" />
            <div className="skeleton skeleton--card" />
            <div className="skeleton skeleton--card" />
            <div className="skeleton skeleton--card" />
          </div>
        ) : (
          <>
            <StatCards
              moodle={moodleData}
              mail={mail}
              connections={connections}
              now={now}
            />

            <SourcePicker value={source} onChange={setSource} />

            {(!connections.gmail || !connections.moodle) ? (
              <div className="connect-row">
                {!connections.gmail ? (
                  <div id="connect-gmail">
                    <ConnectGmailCard
                      reason={
                        mail.needsReconsent
                          ? 'Your account is signed in but the Gmail scope was not granted. Reconnect to allow read-only mail access.'
                          : undefined
                      }
                    />
                  </div>
                ) : null}
                {!connections.moodle ? (
                  <div id="connect-moodle">
                    <ConnectMoodleCard
                      defaultBaseUrl={
                        moodleStatus?.defaultBaseUrl ||
                        'https://mylms.atlas.edu.tr'
                      }
                      onConnected={() => fetchData()}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              className={`charts-row${showBothCharts ? '' : ' charts-row--single'}`}
            >
              {showMoodle ? (
                <WorkloadChart
                  moodle={moodleData}
                  connected={connections.moodle}
                  now={now}
                  onConnect={() => scrollToId('connect-moodle')}
                />
              ) : null}
              {showMail ? (
                <MailCategoryChart
                  mail={mail}
                  connected={connections.gmail}
                  onConnect={() => scrollToId('connect-gmail')}
                />
              ) : null}
            </div>

            <div
              className={`dashboard-main${
                source === 'all' ? '' : ' dashboard-main--single'
              }`}
            >
              {showMoodle ? (
                <UpcomingSection
                  moodle={moodleData}
                  connected={connections.moodle}
                  now={now}
                />
              ) : null}
              {showMail ? (
                <MailSection mail={mail} connected={connections.gmail} />
              ) : null}
            </div>

            {connections.moodle || connections.gmail ? (
              <aside
                className="connect-row"
                style={{ marginTop: '1.25rem' }}
                aria-label="Connected services"
              >
                {connections.moodle ? (
                  <div className="status-card">
                    <h3 className="status-card__title">Moodle connected</h3>
                    <p className="status-card__body">
                      {moodleStatus?.siteName || 'Moodle'} ·{' '}
                      {moodleStatus?.fullName || user?.name}
                    </p>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={async () => {
                        try {
                          await api.post('/api/moodle/disconnect');
                          await fetchData();
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : null}
                {connections.gmail ? (
                  <div className="status-card">
                    <h3 className="status-card__title">Gmail connected</h3>
                    <p className="status-card__body">
                      Reading academic messages from the last 30 days.
                    </p>
                  </div>
                ) : null}
              </aside>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
