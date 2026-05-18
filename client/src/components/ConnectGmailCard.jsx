export function ConnectGmailCard({ reason }) {
  return (
    <div className="connect-card">
      <div className="connect-card__head">
        <h3 className="connect-card__title">Connect Gmail</h3>
        <span className="badge badge--gmail">Gmail</span>
      </div>
      <p className="connect-card__body">
        {reason ||
          'Grant read-only access to your school inbox so AkaDash can surface assignments and deadlines from your mail.'}
      </p>
      <a className="btn-primary" href="/api/auth/google">
        Connect with Google
      </a>
      <p className="connect-card__hint">
        You will be asked to grant the <code>gmail.readonly</code> scope in
        addition to your basic profile. AkaDash only reads message metadata.
      </p>
    </div>
  );
}
