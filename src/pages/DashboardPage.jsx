import { useState, useEffect, useCallback } from "react";
import {
  supabase,
  dashboardDeleteUser,
  dashboardAccountAction,
  getAppAllowedEmails,
  addAppAllowedEmail,
  removeAppAllowedEmail,
} from "../lib/supabaseClient";
import reportLogo from "../image/app-logos/ieces-report.png";
import portalLogo from "../image/app-logos/ieces-portal.png";
import newsLogo from "../image/app-logos/ieces-media-manager.png";

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
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
];
export { Icon };

const isOnlinePresence = (entry) =>
  entry.status === "online" &&
  (!entry.last_seen || Date.now() - new Date(entry.last_seen).getTime() < 120000);

const presenceKeys = (entry) =>
  [entry.user_id, entry.id, entry.email]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

// ── Allow access column ───────────────────────────────────────────────────────
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
    <section className="manage-col" aria-labelledby="manage-allow-title">
      <header className="manage-col-head">
        <div>
          <h3 id="manage-allow-title">
            Allowed emails <span className="manage-count">{emails.length}</span>
          </h3>
          <p>Only these emails can register in {app.title}.</p>
        </div>
      </header>

      <form className="manage-form" onSubmit={handleAdd}>
        <div className="manage-form-row">
          <input
            id="manage-allow-email"
            type="email"
            aria-label="Email address to allow"
            placeholder="name@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <button type="submit" className="manage-btn" disabled={adding}>
            {adding ? (
              "Adding…"
            ) : (
              <>
                <Icon name="plus" size={14} /> Allow
              </>
            )}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="manage-empty">Loading…</p>
      ) : emails.length === 0 ? (
        <p className="manage-empty">
          No emails allowed yet. Add one above to open registration.
        </p>
      ) : (
        <ul className="manage-list">
          {emails.map((row) => (
            <li className="manage-row" key={row.id}>
              <div className="manage-row-main">
                <strong>{row.email}</strong>
                <span>
                  Added by {row.added_by || "—"} ·{" "}
                  {new Date(row.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="manage-row-actions">
                <button
                  className="manage-link danger"
                  disabled={removingId === row.id}
                  onClick={() => handleRemove(row.id, row.email)}
                >
                  {removingId === row.id ? "Removing…" : "Remove"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Account help panel ────────────────────────────────────────────────────────
const formatWhen = (value) =>
  value ? new Date(value).toLocaleString() : "Never";

const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const picks = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(picks, (n) => chars[n % chars.length]).join("");
};

function AccountHelp({ profile, addToast, resetting, onSendReset }) {
  const [account, setAccount] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [working, setWorking] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    dashboardAccountAction("account_status", profile).then((result) => {
      if (cancelled) return;
      if (result?.error) setLoadError(result.error);
      else setAccount(result.account);
    });
    return () => {
      cancelled = true;
    };
  }, [profile.id, profile.email]);

  const run = async (action, extra, successMessage) => {
    setWorking(action);
    const result = await dashboardAccountAction(action, profile, extra);
    setWorking("");
    if (result?.error) {
      addToast(result.error, "error");
      return;
    }
    setAccount(result.account);
    addToast(successMessage, "success");
  };

  const setPassword = (event) => {
    event.preventDefault();
    if (tempPassword.length < 8) {
      addToast("The temporary password needs at least 8 characters.", "error");
      return;
    }
    run(
      "set_password",
      { password: tempPassword },
      `Temporary password set for ${profile.email}. Share it with the user.`,
    );
  };

  if (loadError)
    return (
      <div className="manage-help">
        <p className="manage-help-error">
          Could not load this account: {loadError} You can still send a reset
          email.
        </p>
        <div className="manage-help-actions">
          <button
            className="manage-link"
            disabled={resetting}
            onClick={onSendReset}
          >
            {resetting ? "Sending…" : "Send reset email"}
          </button>
        </div>
      </div>
    );
  if (!account)
    return (
      <div className="manage-help">
        <p className="manage-help-note">Loading account details…</p>
      </div>
    );

  const busy = Boolean(working) || resetting;
  return (
    <div className="manage-help">
      <dl className="manage-facts">
        <div>
          <dt>Last sign-in</dt>
          <dd>{formatWhen(account.last_sign_in_at)}</dd>
        </div>
        <div>
          <dt>Registered</dt>
          <dd>{formatWhen(account.created_at)}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd className={account.email_confirmed ? "" : "warn"}>
            {account.email_confirmed ? "Confirmed" : "Not confirmed"}
          </dd>
        </div>
        <div>
          <dt>Sign-in</dt>
          <dd className={account.disabled ? "warn" : ""}>
            {account.disabled ? "Disabled" : "Enabled"}
          </dd>
        </div>
      </dl>

      <form className="manage-help-password" onSubmit={setPassword}>
        <input
          type="text"
          aria-label="Temporary password"
          placeholder="Temporary password (8+ characters)"
          autoComplete="off"
          spellCheck="false"
          value={tempPassword}
          onChange={(e) => setTempPassword(e.target.value)}
        />
        <button
          type="button"
          className="manage-link"
          disabled={busy}
          onClick={() => setTempPassword(generatePassword())}
        >
          Generate
        </button>
        <button type="submit" className="manage-btn" disabled={busy}>
          {working === "set_password" ? "Saving…" : "Set password"}
        </button>
      </form>

      <div className="manage-help-actions">
        <button className="manage-link" disabled={busy} onClick={onSendReset}>
          {resetting ? "Sending…" : "Send reset email"}
        </button>
        {!account.email_confirmed && (
          <button
            className="manage-link"
            disabled={busy}
            onClick={() =>
              run("confirm_email", {}, `${profile.email} is now confirmed.`)
            }
          >
            {working === "confirm_email" ? "Confirming…" : "Confirm email"}
          </button>
        )}
        <button
          className={`manage-link ${account.disabled ? "" : "danger"}`}
          disabled={busy}
          onClick={() =>
            run(
              "set_disabled",
              { disabled: !account.disabled },
              account.disabled
                ? `${profile.full_name} can sign in again.`
                : `${profile.full_name} can no longer sign in.`,
            )
          }
        >
          {working === "set_disabled"
            ? "Saving…"
            : account.disabled
              ? "Enable sign-in"
              : "Disable sign-in"}
        </button>
      </div>
    </div>
  );
}

// ── Registered users column ───────────────────────────────────────────────────
function UserDirectory({ app, directory, addToast, onRefresh }) {
  const [resetting, setResetting] = useState("");
  const [deleting, setDeleting] = useState("");
  const [confirming, setConfirming] = useState("");
  const [helping, setHelping] = useState("");
  const onlineIds = new Set(
    directory.presence
      .filter(isOnlinePresence)
      .flatMap(presenceKeys),
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
    setConfirming("");
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
    <section className="manage-col" aria-labelledby="manage-users-title">
      <header className="manage-col-head">
        <div>
          <h3 id="manage-users-title">
            Registered users{" "}
            <span className="manage-count">{directory.users.length}</span>
          </h3>
          <p>Accounts that have signed up for {app.title}.</p>
        </div>
        <span className="manage-online">
          <i className="manage-dot online" />
          {directory.presence.filter(isOnlinePresence).length} online
        </span>
      </header>

      {directory.users.length === 0 ? (
        <p className="manage-empty">
          No readable user profiles were found for this app.
        </p>
      ) : (
        <ul className="manage-list">
          {directory.users.map((profile) => {
            const isOnline = presenceKeys(profile).some((key) =>
              onlineIds.has(key),
            );
            const isSystemOwner =
              profile.email?.trim().toLowerCase() === "jaybhee84@gmail.com";
            const busy = resetting === profile.id || deleting === profile.id;
            const isConfirming = confirming === profile.id;
            const isHelping = helping === profile.id;
            return (
              <li
                className={`manage-row ${isConfirming ? "confirming" : ""} ${isHelping ? "open" : ""}`}
                key={`${app.key}-${profile.id}`}
              >
                <div className="manage-row-main">
                  <strong>
                    <i
                      className={`manage-dot ${isOnline ? "online" : ""}`}
                      title={isOnline ? "Online" : "Offline"}
                    />
                    {profile.full_name}
                  </strong>
                  <span>{profile.email}</span>
                </div>
                <span className="manage-tag">
                  {isSystemOwner ? "System owner" : profile.role}
                </span>
                {isSystemOwner ? null : isConfirming ? (
                  <div className="manage-row-actions">
                    <span className="manage-confirm-text">Delete permanently?</span>
                    <button
                      className="manage-btn danger"
                      onClick={() => deleteAccount(profile)}
                    >
                      Delete
                    </button>
                    <button
                      className="manage-link"
                      onClick={() => setConfirming("")}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="manage-row-actions">
                    <button
                      className="manage-link"
                      aria-expanded={isHelping}
                      onClick={() => setHelping(isHelping ? "" : profile.id)}
                    >
                      {isHelping ? "Close" : "Account help"}
                    </button>
                    <button
                      className="manage-link danger"
                      disabled={busy}
                      onClick={() => setConfirming(profile.id)}
                    >
                      {deleting === profile.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                )}
                {isHelping && !isSystemOwner && (
                  <AccountHelp
                    profile={profile}
                    addToast={addToast}
                    resetting={resetting === profile.id}
                    onSendReset={() => sendPasswordReset(profile)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── App Management View ───────────────────────────────────────────────────────
function AppManagementView({
  app,
  directory,
  addToast,
  onRefresh,
  onBack,
  currentUserEmail,
}) {
  return (
    <section className="manage-view">
      <header className="manage-title">
        <button className="manage-back" onClick={onBack}>
          ← Applications
        </button>
        <span className={`app-logo ${app.tone}`}>
          <img src={app.logo} alt="" />
        </span>
        <div>
          <h2>{app.title}</h2>
          <p>Manage who can register and remove existing accounts.</p>
        </div>
        <button className="button button-secondary" onClick={onRefresh}>
          <Icon name="refresh" size={16} /> Refresh
        </button>
      </header>

      <div className="manage-grid">
        <AppAllowedEmails
          app={app}
          currentUserEmail={currentUserEmail}
          addToast={addToast}
        />
        <UserDirectory
          app={app}
          directory={directory}
          addToast={addToast}
          onRefresh={onRefresh}
        />
      </div>
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
  const reportDirectory = directories?.report || { users: [], presence: [] };
  const portalDirectory = directories?.portal || { users: [], presence: [] };
  const newsDirectory = directories?.news || { users: [], presence: [] };
  const directoryByApp = {
    report: reportDirectory,
    portal: portalDirectory,
    news: newsDirectory,
  };
  const appDirectories = [reportDirectory, portalDirectory, newsDirectory];
  const userCount = appDirectories.reduce((total, item) => total + item.users.length, 0);
  const onlineCount = appDirectories.reduce(
    (total, item) => total + item.presence.filter(isOnlinePresence).length,
    0,
  );

  return (
    <div className="dashboard-view">
      {!selectedApp && (
        <>
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
        </>
      )}

      {!selectedApp ? (
        <section>
          <div className="section-heading">
            <div>
              <h2>Applications</h2>
              <p>
                Select an application to manage access, users, and activity.
              </p>
            </div>
            <span className="section-count">{apps.length} applications</span>
          </div>
          <div className="app-cards">
            {apps.map((app) => {
              const appDirectory = directoryByApp[app.key];
              const registeredCount = appDirectory.users.length;
              const appOnlineCount = appDirectory.presence.filter(
                isOnlinePresence,
              ).length;
              return (
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
                <div className="app-card-stats" aria-label={`${app.title} statistics`}>
                  <div className="app-card-stat">
                    <span className="app-card-stat-icon users">
                      <Icon name="users" size={16} />
                    </span>
                    <span>
                      <strong>{registeredCount}</strong>
                      <small>Registered</small>
                    </span>
                  </div>
                  <div className="app-card-stat">
                    <span className="app-card-stat-icon online">
                      <Icon name="pulse" size={16} />
                    </span>
                    <span>
                      <strong>{appOnlineCount}</strong>
                      <small>Online now</small>
                    </span>
                  </div>
                </div>
                <span className="app-link">
                  Manage <Icon name="arrow" size={17} />
                </span>
              </article>
              );
            })}
          </div>
        </section>
      ) : (
        <AppManagementView
          app={selectedApp}
          directory={directories?.[selectedApp.key] || { users: [], presence: [] }}
          addToast={addToast}
          onRefresh={onRefresh}
          onBack={() => setSelectedApp(null)}
          currentUserEmail={user?.email}
        />
      )}
    </div>
  );
}
