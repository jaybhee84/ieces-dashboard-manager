import { useState } from "react";
import { supabase, dashboardLoginEmail, dashboardRegister } from "../lib/supabaseClient";
import logo from "../image/idm.png";
import "./LoginPage.css";

// ── Default admin shortcut ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginPage({ onSuccess, addToast }) {
  const [identifier, setIdentifier]   = useState("");
  const [password, setPassword]       = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername]       = useState("");
  const [mode, setMode]               = useState("login");
  const [loading, setLoading]         = useState(false);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      // ── Register ────────────────────────────────────────────────────────────
      if (mode === "register") {
        const email = identifier.trim().toLowerCase();

        if (!isValidEmail(email)) {
          addToast("Enter a valid email address.", "error");
          return;
        }
        if (password.length < 6) {
          addToast("Password must be at least 6 characters.", "error");
          return;
        }
        if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username.trim())) {
          addToast("Choose a valid username with 3-32 characters.", "error");
          return;
        }

        const result = await dashboardRegister({
          email,
          password,
          username: username.trim().toLowerCase(),
          display_name: displayName.trim() || email,
        });

        if (result.error) {
          addToast(result.error, "error");
          return;
        }

        addToast("Registration successful! You can now log in.", "success");
        setMode("login");
        setIdentifier("");
        setPassword("");
        setDisplayName("");
        setUsername("");
        return;
      }

      // ── Login ───────────────────────────────────────────────────────────────
      const trimmedId = identifier.trim().toLowerCase();
      let loginEmail = trimmedId;
      if (!trimmedId.includes("@")) {
        const resolved = await dashboardLoginEmail(trimmedId);
        if (resolved.error || !resolved.email) {
          addToast("Username was not found.", "error");
          return;
        }
        loginEmail = resolved.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        addToast(error.message || "Login failed.", "error");
        return;
      }

      if (data?.session) {
        addToast("Logged in to IECES.", "success");
        onSuccess(data.session);
      }
    } catch {
      addToast("Unexpected error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const switchTo = (next) => {
    setMode(next);
    setIdentifier("");
    setPassword("");
    setDisplayName("");
    setUsername("");
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        {/* ── Brand panel ── */}
        <div className="login-brand">
          <img src={logo} alt="IECES IDM Logo" className="login-logo" />
          <p className="brand-school"></p>
          <p className="brand-tagline">Integrated Data Management</p>
        </div>

        {/* ── Form panel ── */}
        <div className="login-section">
          <div className="login-heading">
            <h1 className="login-title">
              {mode === "register" ? "Create Account" : "Welcome back"}
            </h1>
            <p className="login-subtitle">
              {mode === "register"
                ? "Your email must be pre-approved by the administrator"
                : "Your IECES or BMI account will be detected automatically"}
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="identifier">
                {mode === "register" ? "Email" : "Username or email"}
              </label>
              <input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  mode === "register" ? "Enter your email" : "username here"
                }
              />
            </div>

            {mode === "register" && (
              <div className="input-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a login username"
                  autoCapitalize="none"
                />
              </div>
            )}

            {mode === "register" && (
              <div className="input-group">
                <label htmlFor="display_name">Display name</label>
                <input
                  id="display_name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name (optional)"
                />
              </div>
            )}

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading
                  ? mode === "register"
                    ? "Registering…"
                    : "Logging in…"
                  : mode === "register"
                  ? "Register"
                  : "Login"}
              </button>
            </div>
          </form>

          <div className="auth-switch">
            {mode === "login" ? (
              <span className="auth-switch-text">
                Need an account?{" "}
                <button
                  type="button"
                  className="auth-toggle"
                  onClick={() => switchTo("register")}
                >
                  Create account
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="auth-toggle"
                onClick={() => switchTo("login")}
              >
                ← Back to login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
