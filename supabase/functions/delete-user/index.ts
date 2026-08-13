import { createClient } from "@supabase/supabase-js";

// Minimal declaration for editors that use the built-in TypeScript service.
// Supabase provides the actual Deno global when this function is deployed.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json(401, { error: "Authentication required." });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json(500, { error: "The function is not configured correctly." });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) return json(401, { error: "Invalid session." });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: admin } = await serviceClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!admin) return json(403, { error: "Administrator access is required." });

    const { userId } = await request.json() as { userId?: unknown };
    if (!userId || typeof userId !== "string") {
      return json(400, { error: "A valid user ID is required." });
    }
    if (userId === userData.user.id) {
      return json(400, { error: "You cannot delete your own active account." });
    }

    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteError) return json(400, { error: deleteError.message });

    // Project-specific cleanup fallbacks. Shared IECES uses `profiles`; the
    // separately deployed BMI function uses `bmi_profiles`. Missing-table
    // errors are harmless because the Auth user has already been deleted.
    await serviceClient.from("profiles").delete().eq("id", userId);
    await serviceClient.from("bmi_profiles").delete().eq("id", userId);
    // `user_presence` cascades automatically when present.

    return json(200, { success: true });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : "Unexpected error." });
  }
});
