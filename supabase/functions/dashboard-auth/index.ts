import { createClient } from "@supabase/supabase-js";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { action, email, password, username, display_name, user_id } =
    (await request.json()) as {
      action?: string;
      email?: string;
      password?: string;
      username?: string;
      display_name?: string;
      user_id?: string;
    };

  // ── REGISTER ───────────────────────────────────────────────────────────────
  if (action === "register") {
    if (!email || !password || !username) {
      return json(400, { error: "Email, username, and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();
    const creatorEmail = "jaybhee84@gmail.com";

    if (!/^[a-z0-9._-]{3,32}$/.test(normalizedUsername)) {
      return json(400, { error: "Username format is invalid." });
    }
    if (normalizedUsername === "admin" && normalizedEmail !== creatorEmail) {
      return json(403, { error: "The admin username is reserved for the creator." });
    }

    // 1. Whitelist check
    const { data: allowed } = await supabaseAdmin
      .from("dashboard_allowed_users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!allowed) {
      return json(403, {
        error: "This email is not approved for registration. Contact your administrator.",
      });
    }

    // 2. Prevent duplicate dashboard_profile
    const { data: existingProfile } = await supabaseAdmin
      .from("dashboard_profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      return json(409, {
        error: "This email already has a Dashboard Manager account. Please log in.",
      });
    }

    const { data: existingUsername } = await supabaseAdmin
      .from("dashboard_profiles")
      .select("id")
      .eq("username", normalizedUsername)
      .maybeSingle();
    if (existingUsername) {
      return json(409, { error: "That username is already registered." });
    }

    // 3. Check if email already exists in auth.users (used by another app)
    const { data: listData, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    if (listErr) {
      return json(500, { error: "Could not verify user registry." });
    }

    const existingAuthUser = listData.users.find(
      (u: { email?: string }) => u.email === normalizedEmail,
    );

    let authUserId: string;

    if (existingAuthUser) {
      // Email already in Auth (registered in BMI, Portal, etc.)
      // Reuse the same auth.users record — no "email exists" error.
      authUserId = existingAuthUser.id as string;
    } else {
      // Brand-new email — create the auth user.
      const { data: newUser, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
        });

      if (createErr) {
        return json(400, { error: createErr.message });
      }
      authUserId = newUser.user!.id;
    }

    // 4. Insert the per-app dashboard_profile
    const { error: profileErr } = await supabaseAdmin
      .from("dashboard_profiles")
      .insert({
        user_id: authUserId,
        email: normalizedEmail,
        username: normalizedUsername,
        display_name: display_name?.trim() || normalizedEmail,
        role: normalizedEmail === creatorEmail ? "owner" : "manager",
      });

    if (profileErr) {
      return json(500, { error: profileErr.message });
    }

    return json(200, { success: true });
  }

  // ── DELETE ACCOUNT ─────────────────────────────────────────────────────────
  if (action === "delete_user") {
    if (!user_id) {
      return json(400, { error: "user_id is required." });
    }

    // Check all known per-app profile tables.
    // Add more tables here as new PROJECT RISING apps get profiles.
    const [sharedProfile, bmiProfile] = await Promise.all([
      supabaseAdmin.from("profiles").select("id").eq("user_id", user_id).maybeSingle(),
      supabaseAdmin.from("bmi_profiles").select("id").eq("user_id", user_id).maybeSingle(),
    ]);

    const usedElsewhere =
      sharedProfile.data !== null || bmiProfile.data !== null;

    // Always remove the dashboard profile.
    await supabaseAdmin.from("dashboard_profiles").delete().eq("user_id", user_id);

    if (!usedElsewhere) {
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (delErr) {
        return json(500, { error: delErr.message });
      }
    }

    return json(200, {
      success: true,
      auth_deleted: !usedElsewhere,
      message: usedElsewhere
        ? "Dashboard profile removed. Auth account kept (used by another app)."
        : "Dashboard profile and auth account permanently deleted.",
    });
  }

  return json(400, { error: "Unknown action." });
});
