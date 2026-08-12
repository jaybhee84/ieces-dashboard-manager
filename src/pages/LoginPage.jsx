import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import logo from "../image/idm.png";
import "./LoginPage.css";

export default function LoginPage({ onSuccess, addToast }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const loginEmail = username.includes("@")
        ? username
        : `${username}@ieces.ph`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        addToast(error.message || "Login failed", "error");
        return;
      }

      if (data?.session) {
        addToast("Login successful", "success");
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
        <div className="login-brand">
          <img src={logo} alt="IECES IDM Logo" className="login-logo" />
          <h2>IECES Admin Dashboard</h2>
          <p className="muted">Administrator sign in</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin (or admin@ieces.ph)"
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
              {loading ? "Logging in…" : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
