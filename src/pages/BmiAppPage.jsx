export default function BmiAppPage({ onBack }) {
  return (
    <section className="panel-card">
      <header>
        <h2>DepEd BMI App Admin</h2>
        <button onClick={onBack}>Back to Dashboard</button>
      </header>
      <p>
        The BMI app uses a separate backend. Use this page to track support
        requests and login problems for BMI users.
      </p>
      <div className="panel-actions">
        <button disabled>Open BMI App</button>
      </div>
    </section>
  );
}
