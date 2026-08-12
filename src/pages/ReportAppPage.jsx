export default function ReportAppPage({ onBack }) {
  return (
    <section className="panel-card">
      <header>
        <h2>IECES Report Admin</h2>
        <button onClick={onBack}>Back to Dashboard</button>
      </header>
      <p>
        This page is the admin launchpad for the IECES Report app. Use it to
        review reports, troubleshoot login issues, or open the report app
        workspace.
      </p>
      <div className="panel-actions">
        <button disabled>Open Report App</button>
      </div>
    </section>
  );
}
