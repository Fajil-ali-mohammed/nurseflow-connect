import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { email, password, role, name, username, department_id } = await req.json();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role },
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // Assign role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });
    if (roleError) throw roleError;

    // If head_nurse, create head_nurses record
    if (role === "head_nurse" && username) {
      const { error } = await supabase
        .from("head_nurses")
        .insert({ user_id: userId, name, username, department_id });
      if (error) throw error;
    }

    // If admin, create admins record
    if (role === "admin" && username) {
      const { error } = await supabase
        .from("admins")
        .insert({ user_id: userId, name, username });
      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
