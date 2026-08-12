import { useEffect, useState, useCallback } from "react";
import { supabase } from "./lib/supabaseClient";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OnlineUsersPage from "./pages/OnlineUsersPage";
import UserManagementPage from "./pages/UserManagementPage";
import ReportAppPage from "./pages/ReportAppPage";
import PortalAppPage from "./pages/PortalAppPage";
import NewsAppPage from "./pages/NewsAppPage";
import BmiAppPage from "./pages/BmiAppPage";

function Toast({ toasts, dismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button onClick={() => dismiss(toast.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [toasts, setToasts] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [users, setUsers] = useState([]);

  const addToast = (message, type = "info", duration = 4000) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((toast) => toast.id !== id)),
      duration,
    );
  };

  const dismissToast = (id) =>
    setToasts((prev) => prev.filter((toast) => toast.id !== id));

  const loadOnlineUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_presence")
        .select("id, user_id, email, last_seen, status")
        .eq("status", "online")
        .order("last_seen", { ascending: false });
      if (error) throw error;
      setOnlineUsers(data ?? []);
    } catch (error) {
      setOnlineUsers([]);
      addToast(
        "Could not load online users. Confirm user_presence table exists.",
        "warning",
      );
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("id, email, full_name, role, status")
        .order("email", { ascending: true });
      if (error) throw error;
      setUsers(data ?? []);
    } catch (error) {
      setUsers([]);
      addToast(
        "Could not load app users. Confirm app_users table exists.",
        "warning",
      );
    }
  }, []);

  const loadSessionData = useCallback(
    async (sessionData) => {
      const currentUser = sessionData?.user ?? null;
      if (!currentUser) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      setSession(sessionData);
      setPage("dashboard");
      setErrorMessage("");
      await Promise.all([loadOnlineUsers(), loadUsers()]);
      setLoading(false);
    },
    [loadOnlineUsers, loadUsers],
  );

  useEffect(() => {
    const init = async () => {
      if (
        !import.meta.env.VITE_SUPABASE_URL ||
        !import.meta.env.VITE_SUPABASE_ANON_KEY
      ) {
        // We provide sensible defaults in `src/lib/supabaseClient.js` so the app
        // can run without .env during development. Show a non-blocking warning
        // instead of preventing startup.
        console.warn(
          "VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set; using built-in defaults.",
        );
        // keep errorMessage empty so UI doesn't show the blocking alert
        setErrorMessage("");
      }
      const { data } = await supabase.auth.getSession();
      await loadSessionData(data.session);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, sessionData) => {
      await loadSessionData(sessionData);
    });

    return () => subscription.unsubscribe();
  }, [loadSessionData]);

  useEffect(() => {
    const presenceSubscription = supabase
      .channel("online-users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        async () => {
          await loadOnlineUsers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(presenceSubscription);
    };
  }, [loadOnlineUsers]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setPage("dashboard");
    addToast("Logged out successfully.", "success");
  };

  const handleLoginSuccess = async (sessionData) => {
    await loadSessionData(sessionData);
    addToast("Welcome back, admin.", "success");
  };

  const refreshData = async () => {
    await Promise.all([loadOnlineUsers(), loadUsers()]);
  };

  if (loading) {
    return (
      <div className="center-screen">
        <div className="card">Loading admin dashboard…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-screen">
        <LoginPage onSuccess={handleLoginSuccess} addToast={addToast} />
        {errorMessage && <div className="alert error">{errorMessage}</div>}
        <Toast toasts={toasts} dismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="layout-card">
        <DashboardPage
          user={user}
          page={page}
          onNavigate={setPage}
          onLogout={handleLogout}
          onRefresh={refreshData}
        />

        {page === "online-users" && (
          <OnlineUsersPage onlineUsers={onlineUsers} />
        )}
        {page === "manage-users" && (
          <UserManagementPage
            users={users}
            refreshUsers={refreshData}
            addToast={addToast}
          />
        )}
        {page === "report" && (
          <ReportAppPage onBack={() => setPage("dashboard")} />
        )}
        {page === "portal" && (
          <PortalAppPage onBack={() => setPage("dashboard")} />
        )}
        {page === "news" && <NewsAppPage onBack={() => setPage("dashboard")} />}
        {page === "bmi" && <BmiAppPage onBack={() => setPage("dashboard")} />}
      </div>
      <Toast toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

export default App;
