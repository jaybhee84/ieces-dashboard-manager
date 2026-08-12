export default function DashboardPage({
  user,
  onNavigate,
  onLogout,
  onRefresh,
}) {
  const apps = [
    {
      key: "report",
      title: "IECES Report",
      description:
        "Manage reports, approvals and analytics for the report app.",
    },
    {
      key: "portal",
      title: "IECES Portal",
      description: "Review portal access, assignments, and portal user issues.",
    },
    {
      key: "news",
      title: "IECES News Manager",
      description:
        "Monitor news publishing and user updates for the news manager.",
    },
    {
      key: "bmi",
      title: "DepEd BMI App",
      description:
        "Track BMI app usage and support requests from the desktop app.",
    },
  ];

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <h1>IECES Admin Dashboard</h1>
          <p>
            Welcome, {user?.email || "Admin"}. Manage the four apps and support
            users.
          </p>
        </div>
        <div className="dashboard-actions">
          <button onClick={onRefresh}>Refresh</button>
          <button
            className="secondary"
            onClick={() => onNavigate("online-users")}
          >
            Online Users
          </button>
          <button
            className="secondary"
            onClick={() => onNavigate("manage-users")}
          >
            User Management
          </button>
          <button className="danger" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="app-cards">
        {apps.map((app) => (
          <article key={app.key} className="app-card">
            <h2>{app.title}</h2>
            <p>{app.description}</p>
            <div className="card-actions">
              <button onClick={() => onNavigate(app.key)}>
                Open {app.title}
              </button>
            </div>
          </article>
        ))}
      </section>

      <div className="dashboard-footer">
        <p>
          Use the buttons above to switch to user support and connection
          monitoring.
        </p>
      </div>
    </div>
  );
}
