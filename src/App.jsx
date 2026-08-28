import { useCallback, useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import LoginPage from "./pages/LoginPage";
import DashboardPage, { Icon } from "./pages/DashboardPage";
import AllowedEmailsPage from "./pages/AllowedEmailsPage";
import logo from "./image/idm.png";

function Toast({ toasts, dismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <span>{toast.message}</span>
            {typeof toast.progress === "number" ? (
              <div
                className="update-progress"
                role="progressbar"
                aria-label="Update download progress"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={toast.progress}
              >
                <span style={{ width: `${toast.progress}%` }} />
              </div>
            ) : null}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

const metadataContainers = (profile) => [
  profile,
  profile.user_metadata,
  profile.raw_user_meta_data,
  profile.metadata,
  profile.app_metadata,
].filter((value) => value && typeof value === "object");

const valueFromProfile = (profile, keys) => {
  const normalizedKeys = new Set(
    keys.map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, "")),
  );

  for (const container of metadataContainers(profile)) {
    for (const [key, value] of Object.entries(container)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalizedKeys.has(normalizedKey) && typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }
  return "";
};

const profileEmail = (profile) =>
  valueFromProfile(profile, [
    "email",
    "email_address",
    "emailAddress",
    "user_email",
    "userEmail",
    "recovery_email",
  ]);

const profileSource = (profile) =>
  valueFromProfile(profile, [
    "app_source",
    "appSource",
    "source_app",
    "sourceApp",
    "app_id",
    "appId",
    "application",
  ]).toLowerCase();

const sourceAliases = {
  report: new Set(["report", "ieces-report"]),
  portal: new Set(["portal", "ieces-portal"]),
  news: new Set(["news", "media", "news-manager", "ieces-media-manager"]),
  bmi: new Set(["bmi", "deped-bmi"]),
};

const matchesSource = (registeredSource, source) =>
  sourceAliases[source]?.has(registeredSource) ?? registeredSource === source;

const normalizeProfile = (profile, source) => ({
  id: profile.id,
  email: profileEmail(profile) || profile.username || "No email available",
  full_name:
    profile.full_name ||
    profile.fullname ||
    [
      profile.first_name || profile.firstname,
      profile.family_name || profile.lastname,
    ]
      .filter(Boolean)
      .join(" ") ||
    profile.username ||
    "Unnamed user",
  role:
    source === "bmi" && profile.role === "division"
      ? "SDO Based"
      : source === "bmi" && profile.role === "school"
        ? "School Based"
        : profile.role || "user",
  source,
});

// ── Pages ────────────────────────────────────────────────────────────────────
const PAGES = {
  dashboard: "dashboard",
  allowedEmails: "allowedEmails",
};

function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [checking, setChecking] = useState(false);
  const [activePage, setActivePage] = useState(PAGES.dashboard);
  const [dashboardNavigationKey, setDashboardNavigationKey] = useState(0);
  const [directories, setDirectories] = useState({
    report: { users: [], presence: [] },
    portal: { users: [], presence: [] },
    news: { users: [], presence: [] },
    bmi: { users: [], presence: [] },
  });

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((previous) => [...previous, { id, message, type }]);
    requestAnimationFrame(() => {
      window.focus();
      window.electron?.restoreFocus?.();
    });
    setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const loadDirectories = useCallback(async () => {
    const [sharedProfiles, portalProfiles, bmiProfiles, presence, reportAllowed, newsAllowed] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("portal_profile").select("*"),
      supabase.from("bmi_profiles").select("*"),
      supabase.from("user_presence").select("*"),
      supabase.from("report_allowed_users").select("email"),
      supabase.from("news_allowed_users").select("email"),
    ]);

    if (sharedProfiles.error)
      console.warn("Could not load IECES profiles:", sharedProfiles.error.message);
    if (portalProfiles.error)
      console.warn("Could not load Portal profiles:", portalProfiles.error.message);
    if (bmiProfiles.error)
      console.warn("Could not load BMI profiles:", bmiProfiles.error.message);

    const presenceRows = presence.error ? [] : (presence.data ?? []);
    const allowedSet = (result) => new Set(
      (result.data ?? []).map((row) => row.email?.trim().toLowerCase()),
    );
    const profilesFor = (profiles, allowed, source) =>
      (profiles.data ?? [])
        .filter((profile) => {
          const registeredSource = profileSource(profile);
          const registeredEmail = profileEmail(profile).toLowerCase();
          return (
            matchesSource(registeredSource, source) ||
            (!registeredSource && registeredEmail && allowed.has(registeredEmail))
          );
        })
        .map((profile) => normalizeProfile(profile, source));
    setDirectories({
      report: {
        users: profilesFor(sharedProfiles, allowedSet(reportAllowed), "report"),
        presence: presenceRows.filter((row) => row.app_id === "report"),
      },
      portal: {
        // portal_profile is app-specific, so every row represents a registered
        // Portal account. Registration does not imply the email is still in the
        // whitelist, and older rows may not contain app_source metadata.
        users: (portalProfiles.data ?? []).map((profile) =>
          normalizeProfile(profile, "portal"),
        ),
        presence: presenceRows.filter((row) => row.app_id === "portal"),
      },
      news: {
        users: profilesFor(sharedProfiles, allowedSet(newsAllowed), "news"),
        presence: presenceRows.filter((row) => row.app_id === "media"),
      },
      bmi: {
        users: (bmiProfiles.data ?? []).map((profile) =>
          normalizeProfile(profile, "bmi"),
        ),
        presence: presenceRows.filter((row) => row.app_id === "bmi"),
      },
    });
  }, []);

  const loadSession = useCallback(
    async (nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession) await loadDirectories();
      setLoading(false);
    },
    [loadDirectories],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => loadSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) =>
      loadSession(nextSession),
    );
    return () => subscription.unsubscribe();
  }, [loadSession]);

  useEffect(() => {
    if (!session) return undefined;
    const channel = supabase
      .channel("admin-user-presence")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        loadDirectories,
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, loadDirectories]);

  useEffect(() => {
    if (!session) return undefined;

    const refreshPresence = () => {
      if (document.visibilityState === "visible") loadDirectories();
    };
    const intervalId = window.setInterval(refreshPresence, 15000);
    window.addEventListener("focus", refreshPresence);
    document.addEventListener("visibilitychange", refreshPresence);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshPresence);
      document.removeEventListener("visibilitychange", refreshPresence);
    };
  }, [session, loadDirectories]);

  useEffect(() => {
    if (!window.electron?.onUpdateStatus) return undefined;
    return window.electron.onUpdateStatus(({ status, message, progress }) => {
      const type = status === "error" ? "error" : "info";
      const updateToast = {
        id: "app-update",
        message,
        type,
        progress: status === "downloading" ? (progress ?? 0) : null,
      };
      setToasts((previous) => [
        ...previous.filter((toast) => toast.id !== updateToast.id),
        updateToast,
      ]);

      if (
        status === "downloaded" ||
        status === "not-available" ||
        status === "development" ||
        status === "error"
      ) {
        setTimeout(() => {
          setToasts((previous) =>
            previous.filter((toast) => toast.id !== updateToast.id),
          );
        }, 6000);
      }
      setChecking(
        status === "checking" ||
          status === "available" ||
          status === "downloading",
      );
    });
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    addToast("Logged out successfully.", "success");
  };

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      if (!window.electron?.checkForUpdates) {
        throw new Error("Update checks are only available in the installed app.");
      }
      await window.electron.checkForUpdates();
    } catch (error) {
      addToast(error.message || "Failed to check for updates.", "error");
      setChecking(false);
    }
  };

  const dismissToast = (id) =>
    setToasts((previous) => previous.filter((toast) => toast.id !== id));

  if (loading)
    return (
      <div className="center-screen">
        <div className="card">Loading admin dashboard…</div>
      </div>
    );

  if (!session)
    return (
      <div className="auth-screen">
        <LoginPage onSuccess={loadSession} addToast={addToast} />
        <Toast toasts={toasts} dismiss={dismissToast} />
      </div>
    );

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logo} alt="IECES" />
          <div>
            <strong>IECES</strong>
            <span>Admin Console</span>
          </div>
        </div>
        <nav aria-label="Main navigation">
          <button
            className={activePage === PAGES.dashboard ? "active" : ""}
            onClick={() => {
              setActivePage(PAGES.dashboard);
              setDashboardNavigationKey((key) => key + 1);
            }}
          >
            <Icon name="grid" /> Dashboard
          </button>
          <p>Access Control</p>
          <button
            className={activePage === PAGES.allowedEmails ? "active" : ""}
            onClick={() => setActivePage(PAGES.allowedEmails)}
          >
            <Icon name="users" /> Allowed Emails
          </button>
          <p>Tools</p>
          <button
            className={`check-updates-btn ${checking ? "checking" : ""}`}
            onClick={checkForUpdates}
            disabled={checking}
          >
            <Icon name="download" /> Check Updates
          </button>
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{(user?.email || "A")[0].toUpperCase()}</div>
          <div>
            <strong>{user?.user_metadata?.full_name || "Administrator"}</strong>
            <span>{user?.email} · IECES</span>
          </div>
          <button onClick={logout} aria-label="Log out" title="Log out">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <main className="main-content">
        {activePage === PAGES.dashboard && (
          <DashboardPage
            key={dashboardNavigationKey}
            user={user}
            directories={directories}
            onRefresh={loadDirectories}
            addToast={addToast}
          />
        )}
        {activePage === PAGES.allowedEmails && (
          <AllowedEmailsPage
            currentUserEmail={user?.email}
            addToast={addToast}
          />
        )}
      </main>
      <Toast toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

export default App;
