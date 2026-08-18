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
    <section className="panel-card">
      <header>
        <div>
          <p className="eyebrow">Access Control</p>
          <h2>Allowed Emails</h2>
          <p>
            Only emails in this list can register a Dashboard Manager account.
            Emails already used by other apps (BMI, Portal, etc.) can still be
            added here — they will share the same auth login but get a separate
            dashboard profile.
          </p>
        </div>
      </header>

      {/* ── Add form ── */}
      <form
        style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}
        onSubmit={handleAdd}
      >
        <input
          type="email"
          placeholder="new.email@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          style={{ flex: "1 1 260px", minWidth: 0 }}
          required
        />
        <button type="submit" className="primary-btn" disabled={adding}>
          {adding ? "Adding…" : "Add email"}
        </button>
      </form>

      {/* ── List ── */}
      {loading ? (
        <p>Loading…</p>
      ) : emails.length === 0 ? (
        <p className="directory-empty">No emails in the whitelist yet. Add one above.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Added by</th>
                <th>Date added</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((row) => (
                <tr key={row.id}>
                  <td>{row.email}</td>
                  <td>{row.added_by || "—"}</td>
                  <td>{new Date(row.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="delete-link"
                      disabled={removingId === row.id}
                      onClick={() => handleRemove(row.id, row.email)}
                    >
                      {removingId === row.id ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
