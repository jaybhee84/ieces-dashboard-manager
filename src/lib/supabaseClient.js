import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://joilvslvsioayrjshuxg.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_aozkBamT5C58KY03X9kUgA_iehy73ZU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storageKey: "ieces-admin-auth" },
});

// ── Dashboard-auth edge function ─────────────────────────────────────────────

async function callDashboardAuth(body) {
  const { data, error } = await supabase.functions.invoke("dashboard-auth", {
    body,
  });
  if (error) return { error: error.message || "Edge function error." };
  return data;
}

export function dashboardRegister({ email, password, display_name }) {
  return callDashboardAuth({ action: "register", email, password, display_name });
}

export function dashboardDeleteUser(user_id) {
  return callDashboardAuth({ action: "delete_user", user_id });
}

// ── Dashboard allowed emails ──────────────────────────────────────────────────

export async function addAllowedEmail(email, added_by) {
  const { error } = await supabase
    .from("dashboard_allowed_users")
    .insert({ email: email.trim().toLowerCase(), added_by });
  return error;
}

export async function removeAllowedEmail(id) {
  const { error } = await supabase
    .from("dashboard_allowed_users")
    .delete()
    .eq("id", id);
  return error;
}

export async function getAllowedEmails() {
  const { data, error } = await supabase
    .from("dashboard_allowed_users")
    .select("*")
    .order("created_at", { ascending: true });
  return { data: data ?? [], error };
}

// ── Per-app allowed emails ────────────────────────────────────────────────────
// appKey: "report" | "portal" | "news" | "bmi"
// Maps to table: report_allowed_users, portal_allowed_users, etc.

const appTable = (appKey) => `${appKey}_allowed_users`;

export async function getAppAllowedEmails(appKey) {
  const { data, error } = await supabase
    .from(appTable(appKey))
    .select("*")
    .order("created_at", { ascending: true });
  return { data: data ?? [], error };
}

export async function addAppAllowedEmail(appKey, email, added_by) {
  const { error } = await supabase
    .from(appTable(appKey))
    .insert({ email: email.trim().toLowerCase(), added_by });
  return error;
}

export async function removeAppAllowedEmail(appKey, id) {
  const { error } = await supabase
    .from(appTable(appKey))
    .delete()
    .eq("id", id);
  return error;
}