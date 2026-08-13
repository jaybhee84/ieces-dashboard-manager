import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import logo from "../image/idm.png";
import "./LoginPage.css";

export default function LoginPage({ onSuccess, addToast }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
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

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
          console.error("Supabase sign-up error:", error);
          addToast(error.message || "Registration failed", "error");
          return;
        }

        addToast(
          "Registration successful. Check your email to confirm your account.",
          "success",
        );
        setMode("login");
        setIdentifier("");
        setPassword("");
        return;
      }

      const loginEmail = identifier.includes("@")
        ? identifier
        : `${identifier}@ieces.ph`;

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
    } catch (error) {
      addToast("Unexpected login error", "error");
    } finally {
      setLoading(false);
    }
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
                ? "Create a new administrator account"
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
                  mode === "register" ? "Enter email" : "username here"
                }
              />
            </div>

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
                  onClick={() => {
                    setMode("register");
                    setIdentifier("");
                    setPassword("");
                  }}
                >
                  Create account
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="auth-toggle"
                onClick={() => {
                  setMode("login");
                  setIdentifier("");
                  setPassword("");
                }}
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
