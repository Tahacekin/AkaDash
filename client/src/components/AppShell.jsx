import { Link } from 'react-router-dom';

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {{ email?: string, name?: string } | null} props.user
 * @param {() => void} props.onLogout
 */
export function AppShell({ children, user, onLogout }) {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__brand">
          <Link to="/" className="top-bar__logo">
            AkaDash
          </Link>
          <span className="top-bar__tagline">Your week, in one place.</span>
        </div>
        <div className="top-bar__user">
          {user ? (
            <>
              <span className="top-bar__name" title={user.email}>
                {user.name || user.email}
              </span>
              <button type="button" className="btn-ghost" onClick={onLogout}>
                Sign out
              </button>
            </>
          ) : null}
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}
