import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const emptyForm = {
  title: "",
  summary: "",
  body: "",
  priority: "normal",
  expires_at: "",
  is_published: false,
};

const toLocalInput = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";

export default function BulletinManager({ addToast, currentUserEmail }) {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from("bulletin_announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) addToast(error.message || "Could not load bulletin announcements.", "error");
    else setAnnouncements(data ?? []);
    setLoading(false);
  }, [addToast]);

  useEffect(() => {
    void loadAnnouncements();
    const channel = supabase
      .channel("dashboard-bulletin-manager")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bulletin_announcements" },
        loadAnnouncements,
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAnnouncements]);

  const updateField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveAnnouncement = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      addToast("Announcement title is required.", "warning");
      return;
    }

    setSaving(true);
    const existing = announcements.find((item) => item.id === editingId);
    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim() || null,
      body: form.body.trim() || null,
      priority: form.priority,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_published: form.is_published,
      published_at: form.is_published ? existing?.published_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from("bulletin_announcements").update(payload).eq("id", editingId)
      : await supabase.from("bulletin_announcements").insert({ ...payload, created_by: currentUserEmail });

    setSaving(false);
    if (error) {
      addToast(error.message || "Could not save the announcement.", "error");
      return;
    }

    addToast(editingId ? "Announcement updated." : "Announcement created.", "success");
    resetForm();
    await loadAnnouncements();
  };

  const editAnnouncement = (announcement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title || "",
      summary: announcement.summary || "",
      body: announcement.body || "",
      priority: announcement.priority || "normal",
      expires_at: toLocalInput(announcement.expires_at),
      is_published: Boolean(announcement.is_published),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const togglePublished = async (announcement) => {
    const isPublished = !announcement.is_published;
    const { error } = await supabase
      .from("bulletin_announcements")
      .update({
        is_published: isPublished,
        published_at: isPublished ? announcement.published_at || new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", announcement.id);

    if (error) addToast(error.message || "Could not change publication status.", "error");
    else addToast(isPublished ? "Announcement published." : "Announcement returned to draft.", "success");
    await loadAnnouncements();
  };

  const deleteAnnouncement = async (announcement) => {
    if (!window.confirm(`Delete “${announcement.title}”? This cannot be undone.`)) return;
    const { error } = await supabase.from("bulletin_announcements").delete().eq("id", announcement.id);
    if (error) addToast(error.message || "Could not delete the announcement.", "error");
    else {
      addToast("Announcement deleted.", "success");
      if (editingId === announcement.id) resetForm();
      await loadAnnouncements();
    }
  };

  return (
    <section className="bulletin-manager">
      <header className="bulletin-manager-header">
        <div className="bulletin-manager-mark" aria-hidden="true">📣</div>
        <div>
          <span>Public website content</span>
          <h2>School Bulletin</h2>
          <p>Create notices for the public Bulletin page using the IECES theme.</p>
        </div>
      </header>

      <form className="bulletin-form" onSubmit={saveAnnouncement}>
        <div className="bulletin-form-heading">
          <div>
            <strong>{editingId ? "Edit announcement" : "New announcement"}</strong>
            <span>Only published, non-expired notices appear on the public site.</span>
          </div>
          {editingId && <button type="button" className="bulletin-button ghost" onClick={resetForm}>Cancel editing</button>}
        </div>

        <label className="bulletin-field bulletin-field-wide">
          <span>Title</span>
          <input value={form.title} maxLength={180} onChange={(event) => updateField("title", event.target.value)} placeholder="Important school announcement" required />
        </label>
        <label className="bulletin-field bulletin-field-wide">
          <span>Short summary</span>
          <textarea rows="2" maxLength={500} value={form.summary} onChange={(event) => updateField("summary", event.target.value)} placeholder="A concise summary shown below the title" />
        </label>
        <label className="bulletin-field bulletin-field-wide">
          <span>Full notice</span>
          <textarea rows="5" value={form.body} onChange={(event) => updateField("body", event.target.value)} placeholder="Complete announcement details, instructions, or reminders" />
        </label>
        <label className="bulletin-field">
          <span>Priority</span>
          <select value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <label className="bulletin-field">
          <span>Expires on (optional)</span>
          <input type="datetime-local" value={form.expires_at} onChange={(event) => updateField("expires_at", event.target.value)} />
        </label>
        <label className="bulletin-publish-toggle">
          <input type="checkbox" checked={form.is_published} onChange={(event) => updateField("is_published", event.target.checked)} />
          <span>
            <strong>Publish immediately</strong>
            <small>Make this notice visible on the public website after saving.</small>
          </span>
        </label>
        <div className="bulletin-form-actions">
          <button className="bulletin-button primary" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create announcement"}</button>
        </div>
      </form>

      <div className="bulletin-list-heading">
        <div>
          <strong>Announcements</strong>
          <span>{announcements.length} total</span>
        </div>
        <button type="button" className="bulletin-button ghost" onClick={loadAnnouncements}>Refresh</button>
      </div>

      {loading ? (
        <p className="bulletin-empty">Loading announcements…</p>
      ) : announcements.length === 0 ? (
        <div className="bulletin-empty"><b>📌</b><strong>No announcements yet</strong><span>Create the first bulletin notice using the form above.</span></div>
      ) : (
        <div className="bulletin-list">
          {announcements.map((announcement) => (
            <article className="bulletin-row" key={announcement.id}>
              <div className="bulletin-row-main">
                <div className="bulletin-row-badges">
                  <span className={`bulletin-priority ${announcement.priority}`}>{announcement.priority}</span>
                  <span className={announcement.is_published ? "bulletin-status published" : "bulletin-status draft"}>{announcement.is_published ? "Published" : "Draft"}</span>
                </div>
                <h3>{announcement.title}</h3>
                {announcement.summary && <p>{announcement.summary}</p>}
                <small>Created {new Date(announcement.created_at).toLocaleString()} {announcement.expires_at ? `· Expires ${new Date(announcement.expires_at).toLocaleString()}` : ""}</small>
              </div>
              <div className="bulletin-row-actions">
                <button type="button" onClick={() => editAnnouncement(announcement)}>Edit</button>
                <button type="button" onClick={() => togglePublished(announcement)}>{announcement.is_published ? "Unpublish" : "Publish"}</button>
                <button type="button" className="danger" onClick={() => deleteAnnouncement(announcement)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
