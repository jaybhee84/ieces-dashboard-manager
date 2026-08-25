import { useState, useEffect, useCallback } from "react";
import {
  supabase,
  dashboardDeleteUser,
  getAppAllowedEmails,
  addAppAllowedEmail,
  removeAppAllowedEmail,
} from "../lib/supabaseClient";
import reportLogo from "../image/app-logos/ieces-report.png";
import portalLogo from "../image/app-logos/ieces-portal.png";
import newsLogo from "../image/app-logos/ieces-media-manager.png";
import bmiLogo from "../image/app-logos/deped-bmi.png";
import bulletinLogo from "../image/idm.png";
import BulletinManager from "./BulletinManager";

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
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </>
    ),
    plus: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    trash: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4h6v2" />
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
  {
    key: "bulletin",
    title: "Bulletin Manager",
    category: "Public Website",
    description:
      "Create, publish and manage official announcements for the school Bulletin.",
    logo: bulletinLogo,
    tone: "school",
  },
];
export { Icon };

// ── Allowed Emails Tab ────────────────────────────────────────────────────────
function AppAllowedEmails({ app, currentUserEmail, addToast }) {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getAppAllowedEmails(app.key);
    if (error)
      addToast(`Failed to load allowed emails for ${app.title}.`, "error");
    else setEmails(data);
    setLoading(false);
  }, [app.key, app.title, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      addToast("Enter a valid email address.", "error");
      return;
    }
    if (emails.some((r) => r.email === email)) {
      addToast("That email is already in the list.", "warning");
      return;
    }
    setAdding(true);
    const error = await addAppAllowedEmail(app.key, email, currentUserEmail);
    setAdding(false);
    if (error) {
      addToast(error.message || "Failed to add email.", "error");
    } else {
      addToast(`${email} added to ${app.title} allowed list.`, "success");
      setNewEmail("");
      await load();
    }
  };

  const handleRemove = async (id, email) => {
    setRemovingId(id);
    const error = await removeAppAllowedEmail(app.key, id);
    setRemovingId(null);
    if (error) {
      addToast(error.message || "Failed to remove email.", "error");
    } else {
      addToast(`${email} removed from ${app.title} allowed list.`, "success");
      setEmails((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="card-user-directory">
      <div className="directory-heading">
        <div>
          <strong>Allowed Emails</strong>
          <span>
            Only these emails can register in {app.title}. {emails.length} email
            {emails.length !== 1 ? "s" : ""} whitelisted.
          </span>
        </div>
      </div>

      {/* Add form */}
      <form className="allowed-emails-form" onSubmit={handleAdd}>
        <input
          type="email"
          placeholder="email@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
        />
        <button type="submit" className="add-btn" disabled={adding}>
          {adding ? (
            "Adding…"
          ) : (
            <>
              <Icon name="plus" size={14} /> Add email
            </>
          )}
        </button>
      </form>

      {loading ? (
        <p className="directory-empty">Loading…</p>
      ) : emails.length === 0 ? (
        <p className="directory-empty">
          No emails whitelisted yet. Add one above to allow registration.
        </p>
      ) : (
        <div className="user-list">
          {emails.map((row) => (
            <div className="allowed-email-row" key={row.id}>
              <div className="user-identity">
                <strong>{row.email}</strong>
                <span>
                  Added by {row.added_by || "—"} ·{" "}
                  {new Date(row.created_at).toLocaleDateString()}
                </span>
              </div>
              <button
                className="icon-btn"
                disabled={removingId === row.id}
                onClick={() => handleRemove(row.id, row.email)}
                title="Remove from whitelist"
              >
                {removingId === row.id ? "…" : <Icon name="trash" size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── User Directory Tab ────────────────────────────────────────────────────────
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
    const result = await dashboardDeleteUser(profile.id);
    setDeleting("");
    if (result?.error) {
      addToast(result.error || "Could not delete the account.", "error");
      return;
    }
    addToast(
      result?.auth_deleted
        ? `${profile.full_name}'s account was permanently deleted.`
        : `${profile.full_name}'s profile removed (auth kept — used by another app).`,
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

// ── App Management View (tabbed) ──────────────────────────────────────────────
function AppManagementView({
  app,
  directory,
  addToast,
  onRefresh,
  currentUserEmail,
}) {
  const [tab, setTab] = useState("users");

  return (
    <section className="app-management-view">
      <div className="management-toolbar">
        {/* tabs */}
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            className={tab === "users" ? "tab-btn active" : "tab-btn"}
            onClick={() => setTab("users")}
          >
            <Icon name="users" size={15} /> Registered Users
          </button>
          <button
            className={tab === "allowed" ? "tab-btn active" : "tab-btn"}
            onClick={() => setTab("allowed")}
          >
            <Icon name="shield" size={15} /> Allowed Emails
          </button>
        </div>
      </div>

      <div className="management-title">
        <span className={`app-logo ${app.tone}`}>
          <img src={app.logo} alt={`${app.title} logo`} />
        </span>
        <div>
          <span className="app-category">{app.category}</span>
          <h2>{app.title}</h2>
          <p>
            {tab === "users"
              ? "Registered accounts, current activity, password recovery, and account removal."
              : "Control which emails are allowed to register in this application."}
          </p>
        </div>
      </div>

      {tab === "users" ? (
        <UserDirectory
          app={app}
          directory={directory}
          addToast={addToast}
          onRefresh={onRefresh}
        />
      ) : (
        <AppAllowedEmails
          app={app}
          currentUserEmail={currentUserEmail}
          addToast={addToast}
        />
      )}
    </section>
  );
}

// ── Main DashboardPage ────────────────────────────────────────────────────────
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
    sharedDirectory.presence.filter((e) => e.status === "online").length +
    bmiDirectory.presence.filter((e) => e.status === "online").length;

  return (
    <div className="dashboard-view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Welcome back, {firstName}</h1>
          <p className="view-subtitle">
            Here's what's happening across your IECES applications today.
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
            <strong>{apps.length}</strong>
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
              <p>
                Select an application or website tool to manage.
              </p>
            </div>
            <span className="section-count">{apps.length} applications</span>
          </div>
          <div className="app-cards">
            {apps.map((app) => (
              <article
                key={app.key}
                className="app-card clickable-card"
                role="button"
                tabIndex="0"
                onClick={() => setSelectedApp(app)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedApp(app);
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
                  Manage <Icon name="arrow" size={17} />
                </span>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <>
          <button
            className="back-button"
            onClick={() => setSelectedApp(null)}
            aria-label="Back to applications"
            style={{ marginBottom: "1rem" }}
          >
            <span aria-hidden="true">←</span> Back to applications
          </button>
          {selectedApp.key === "bulletin" ? (
            <BulletinManager
              addToast={addToast}
              currentUserEmail={user?.email}
            />
          ) : (
            <AppManagementView
              app={selectedApp}
              directory={
                selectedApp.key === "bmi" ? bmiDirectory : sharedDirectory
              }
              addToast={addToast}
              onRefresh={onRefresh}
              currentUserEmail={user?.email}
            />
          )}
        </>
      )}
    </div>
  );
}
