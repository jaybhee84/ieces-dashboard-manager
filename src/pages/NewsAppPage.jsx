export default function NewsAppPage({ onBack }) {
  return (
    <section className="panel-card">
      <header>
        <h2>IECES News Manager Admin</h2>
        <button onClick={onBack}>Back to Dashboard</button>
      </header>
      <p>
        Use this section to oversee the IECES News Manager app, manage articles,
        and resolve user login issues.
      </p>
      <div className="panel-actions">
        <button disabled>Open News Manager App</button>
      </div>
    </section>
  );
}
