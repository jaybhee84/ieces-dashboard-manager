export default function PortalAppPage({ onBack }) {
  return (
    <section className="panel-card">
      <header>
        <h2>IECES Portal Admin</h2>
        <button onClick={onBack}>Back to Dashboard</button>
      </header>
      <p>
        This module supports the IECES Portal app. Monitor portal user access,
        audit sign-in problems, and provide direct support.
      </p>
      <div className="panel-actions">
        <button disabled>Open Portal App</button>
      </div>
    </section>
  );
}
