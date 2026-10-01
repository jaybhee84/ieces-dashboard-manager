import { useEffect, useState, useCallback } from "react";
import { getAllowedEmails, addAllowedEmail, removeAllowedEmail } from "../lib/supabaseClient";

export default function AllowedEmailsPage({ currentUserEmail, addToast }) {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getAllowedEmails();
    if (error) addToast("Failed to load allowed emails.", "error");
    else setEmails(data);
    setLoading(false);
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

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
    const error = await addAllowedEmail(email, currentUserEmail);
    setAdding(false);
    if (error) {
      addToast(error.message || "Failed to add email.", "error");
    } else {
      addToast(`${email} added to allowed list.`, "success");
      setNewEmail("");
      await load();
    }
  };

  const handleRemove = async (id, email) => {
    setRemovingId(id);
    const error = await removeAllowedEmail(id);
    setRemovingId(null);
    if (error) {
      addToast(error.message || "Failed to remove email.", "error");
    } else {
      addToast(`${email} removed from allowed list.`, "success");
      setEmails((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <section className="manage-view">
      <header className="manage-title">
        <div>
          <p className="eyebrow">Access Control · Owner only</p>
          <h2>Allowed Emails</h2>
          <p>
            Emails listed here can register as an administrator of this
            dashboard. Other administrators cannot see or change this list.
          </p>
        </div>
      </header>

      <div className="manage-col">
        <div className="manage-col-head">
          <div>
            <h3>
              Dashboard administrators{" "}
              <span className="manage-count">{emails.length}</span>
            </h3>
          </div>
          <form className="manage-form-row" onSubmit={handleAdd}>
            <input
              type="email"
              aria-label="Email address to allow"
              placeholder="name@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <button type="submit" className="manage-btn" disabled={adding}>
              {adding ? "Adding…" : "Add email"}
            </button>
          </form>
        </div>

        {loading ? (
          <p className="manage-empty">Loading…</p>
        ) : emails.length === 0 ? (
          <p className="manage-empty">No emails in the list yet. Add one above.</p>
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
      </div>
    </section>
  );
}
