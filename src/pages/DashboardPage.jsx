import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import reportLogo from "../image/app-logos/ieces-report.png";
import portalLogo from "../image/app-logos/ieces-portal.png";
import newsLogo from "../image/app-logos/ieces-media-manager.png";
import bmiLogo from "../image/app-logos/deped-bmi.png";

const Icon = ({ name, size = 20 }) => {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    pulse: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    refresh: (
      <>
        <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5M21 12H9" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    report: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </>
    ),
    portal: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 9h18M9 21V9" />
      </>
    ),
    news: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8M8 11h6" />
      </>
    ),
    bmi: (
      <>
        <path d="M12 21s-8-4.5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 6.5-8 11-8 11z" />
        <path d="M8 12h2l1-3 2 6 1-3h2" />
      </>
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
};

export const apps = [
  {
    key: "report",
    title: "IECES Report",
    category: "Operations",
    description:
      "Manage reports, approvals and analytics across the reporting workflow.",
    logo: reportLogo,
    tone: "blue",
  },
  {
    key: "portal",
    title: "IECES Portal",
    category: "Access",
    description:
      "Review portal access, assignments and resolve user account issues.",
    logo: portalLogo,
    tone: "violet",
  },
  {
    key: "news",
    title: "News Manager",
    category: "Publishing",
    description:
      "Monitor news publishing, content updates and editorial activity.",
    logo: newsLogo,
    tone: "amber",
  },
  {
    key: "bmi",
    title: "DepEd BMI App",
    category: "Health",
    description:
      "Track BMI app usage and support requests from the desktop app.",
    logo: bmiLogo,
    tone: "emerald",
  },
];
export { Icon };

function UserDirectory({ app, directory, addToast, onRefresh }) {
  const [resetting, setResetting] = useState("");
  const [deleting, setDeleting] = useState("");
  const onlineIds = new Set(
    directory.presence
      .filter((entry) => entry.status === "online")
      .flatMap((entry) =>
        [entry.user_id, entry.id, entry.email].filter(Boolean),
      ),
  );

  const sendPasswordReset = async (profile) => {
    if (!profile.email?.includes("@")) {
      addToast("This profile does not have a valid recovery email.", "warning");
      return;
    }
    setResetting(profile.id);
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email);
    setResetting("");
    if (error)
      addToast(error.message || "Could not send the reset email.", "error");
    else
      addToast(`Password recovery email sent to ${profile.email}.`, "success");
  };

  const deleteAccount = async (profile) => {
    const confirmed = window.confirm(
      `Permanently delete ${profile.full_name} (${profile.email})?\n\nThis removes the login account and cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(profile.id);
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { userId: profile.id },
    });
    setDeleting("");
    if (error || data?.error) {
      addToast(
        data?.error || error?.message || "Could not delete the account.",
        "error",
      );
      return;
    }
    addToast(
      `${profile.full_name}'s account was permanently deleted.`,
      "success",
    );
    await onRefresh();
  };

  return (
    <div className="card-user-directory">
      <div className="directory-heading">
        <div>
          <strong>Registered users</strong>
          <span>
            {directory.users.length} account
            {directory.users.length === 1 ? "" : "s"}
          </span>
        </div>
        <span className="online-summary">
          <i />
          {
            directory.presence.filter((entry) => entry.status === "online")
              .length
          }{" "}
          online
        </span>
      </div>
      {directory.users.length === 0 ? (
        <p className="directory-empty">
          No readable user profiles were found for this app.
        </p>
      ) : (
        <div className="user-list">
          {directory.users.map((profile) => {
            const isOnline =
              onlineIds.has(profile.id) || onlineIds.has(profile.email);
            return (
              <div className="user-row" key={`${app.key}-${profile.id}`}>
                <span
                  className={`presence-dot ${isOnline ? "online" : ""}`}
                  title={isOnline ? "Online" : "Offline"}
                />
                <div className="user-identity">
                  <strong>{profile.full_name}</strong>
                  <span>{profile.email}</span>
                </div>
                <span className="user-role">{profile.role}</span>
                <div className="user-actions">
                  <button
                    className="reset-link"
                    disabled={
                      resetting === profile.id || deleting === profile.id
                    }
                    onClick={() => sendPasswordReset(profile)}
                  >
                    {resetting === profile.id ? "Sending…" : "Reset password"}
                  </button>
                  <button
                    className="delete-link"
                    disabled={
                      deleting === profile.id || resetting === profile.id
                    }
                    onClick={() => deleteAccount(profile)}
                  >
                    {deleting === profile.id ? "Deleting…" : "Delete account"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage({
  user,
  directories,
  onRefresh,
  addToast,
}) {
  const [selectedApp, setSelectedApp] = useState(null);
  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Admin";
  const sharedDirectory = directories?.shared || { users: [], presence: [] };
  const bmiDirectory = directories?.bmi || { users: [], presence: [] };
  const userCount = sharedDirectory.users.length + bmiDirectory.users.length;
  const onlineCount =
    sharedDirectory.presence.filter((entry) => entry.status === "online")
      .length +
    bmiDirectory.presence.filter((entry) => entry.status === "online").length;
  return (
    <div className="dashboard-view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Welcome back, {firstName}</h1>
          <p className="view-subtitle">
            Here’s what’s happening across your IECES applications today.
          </p>
        </div>
        <button className="button button-secondary" onClick={onRefresh}>
          <Icon name="refresh" size={17} /> Refresh data
        </button>
      </header>
      <section className="stats-grid" aria-label="Dashboard summary">
        <article className="stat-card">
          <span className="stat-icon blue">
            <Icon name="grid" />
          </span>
          <div>
            <p>Managed apps</p>
            <strong>4</strong>
            <span>All systems available</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon emerald">
            <Icon name="pulse" />
          </span>
          <div>
            <p>Online now</p>
            <strong>{onlineCount}</strong>
            <span>Active user sessions</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon violet">
            <Icon name="users" />
          </span>
          <div>
            <p>Total users</p>
            <strong>{userCount}</strong>
            <span>Across all applications</span>
          </div>
        </article>
      </section>
      {!selectedApp ? (
        <section>
          <div className="section-heading">
            <div>
              <h2>Applications</h2>
              <p>Select an application to view and manage its users.</p>
            </div>
            <span className="section-count">4 applications</span>
          </div>
          <div className="app-cards">
            {apps.map((app) => (
              <article
                key={app.key}
                className="app-card clickable-card"
                role="button"
                tabIndex="0"
                onClick={() => setSelectedApp(app)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ")
                    setSelectedApp(app);
                }}
              >
                <div className="app-card-top">
                  <span className={`app-logo ${app.tone}`}>
                    <img src={app.logo} alt={`${app.title} logo`} />
                  </span>
                  <span className="status-pill">
                    <i /> Active
                  </span>
                </div>
                <div>
                  <span className="app-category">{app.category}</span>
                  <h3>{app.title}</h3>
                  <p>{app.description}</p>
                </div>
                <span className="app-link">
                  Manage users <Icon name="arrow" size={17} />
                </span>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="app-management-view">
          <div className="management-toolbar">
            <button
              className="back-button"
              onClick={() => setSelectedApp(null)}
              aria-label="Back to applications"
            >
              <span aria-hidden="true">←</span> Back to applications
            </button>
          </div>
          <div className="management-title">
            <span className={`app-logo ${selectedApp.tone}`}>
              <img src={selectedApp.logo} alt={`${selectedApp.title} logo`} />
            </span>
            <div>
              <span className="app-category">{selectedApp.category}</span>
              <h2>{selectedApp.title}</h2>
              <p>
                Registered accounts, current activity, password recovery, and
                account removal.
              </p>
            </div>
          </div>
          <UserDirectory
            app={selectedApp}
            directory={
              selectedApp.key === "bmi" ? bmiDirectory : sharedDirectory
            }
            addToast={addToast}
            onRefresh={onRefresh}
          />
        </section>
      )}
    </div>
  );
}
