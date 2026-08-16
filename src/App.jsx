import { useCallback, useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import LoginPage from "./pages/LoginPage";
import DashboardPage, { Icon } from "./pages/DashboardPage";
import logo from "./image/idm.png";

function Toast({ toasts, dismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
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

const normalizeProfile = (profile, source) => ({
  id: profile.id,
  email: profile.email || profile.username || "No email available",
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
  role: profile.role || "user",
  source,
});

function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [checking, setChecking] = useState(false);
  const [directories, setDirectories] = useState({
    shared: { users: [], presence: [] },
    bmi: { users: [], presence: [] },
  });

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((previous) => [...previous, { id, message, type }]);
    setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const loadDirectories = useCallback(async () => {
    const [sharedProfiles, bmiProfiles, presence] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("bmi_profiles").select("*"),
      supabase.from("user_presence").select("*"),
    ]);

    if (sharedProfiles.error)
      console.warn(
        "Could not load IECES profiles:",
        sharedProfiles.error.message,
      );
    if (bmiProfiles.error)
      console.warn("Could not load BMI profiles:", bmiProfiles.error.message);

    const presenceRows = presence.error ? [] : (presence.data ?? []);
    setDirectories({
      shared: {
        users: (sharedProfiles.data ?? []).map((profile) =>
          normalizeProfile(profile, "shared"),
        ),
        presence: presenceRows.filter((row) => row.app_id !== "bmi"),
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
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, loadDirectories]);

  useEffect(() => {
    if (!window.electron?.onUpdateStatus) return undefined;
    return window.electron.onUpdateStatus(({ status, message }) => {
      const type = status === "error" ? "error" : "info";
      addToast(message, type);
      setChecking(
        status === "checking" ||
          status === "available" ||
          status === "downloading",
      );
    });
  }, [addToast]);

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
        <Toast
          toasts={toasts}
          dismiss={(id) =>
            setToasts((previous) => previous.filter((toast) => toast.id !== id))
          }
        />
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
          <button className="active">
            <Icon name="grid" /> Dashboard
          </button>
          <p>Management</p>
          <span className="nav-hint">
            <Icon name="users" /> Users are managed inside each application
          </span>
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
        <DashboardPage
          user={user}
          directories={directories}
          onRefresh={loadDirectories}
          addToast={addToast}
        />
      </main>
      <Toast
        toasts={toasts}
        dismiss={(id) =>
          setToasts((previous) => previous.filter((toast) => toast.id !== id))
        }
      />
    </div>
  );
}

export default App;
