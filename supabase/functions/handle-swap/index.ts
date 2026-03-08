import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!roleData || !["head_nurse", "admin"].includes(roleData.role)) {
      throw new Error("Only head nurses and admins can manage swap requests");
    }

    const { swap_id, action, review_notes } = await req.json();
    if (!swap_id || !action || !["approved", "rejected"].includes(action)) {
      throw new Error("swap_id and action (approved/rejected) are required");
    }

    // Get swap request details
    const { data: swap, error: swapErr } = await supabase
      .from("shift_swap_requests")
      .select(`
        id, requester_nurse_id, target_nurse_id,
        requester_schedule:schedules!shift_swap_requests_requester_schedule_id_fkey(duty_date, shift_type, department:departments(name)),
        target_schedule:schedules!shift_swap_requests_target_schedule_id_fkey(duty_date, shift_type, department:departments(name))
      `)
      .eq("id", swap_id)
      .maybeSingle();

    if (swapErr || !swap) throw new Error("Swap request not found");

    // Update swap status
    const { error: updateErr } = await supabase
      .from("shift_swap_requests")
      .update({ status: action, reviewed_by: user.id, review_notes: review_notes || null })
      .eq("id", swap_id);
    if (updateErr) throw updateErr;

    // Get user_ids for both nurses
    const { data: nurseUsers } = await supabase
      .from("nurses")
      .select("id, user_id, name")
      .in("id", [swap.requester_nurse_id, swap.target_nurse_id])
      .not("user_id", "is", null);

    if (nurseUsers && nurseUsers.length > 0) {
      const requester = nurseUsers.find((n: any) => n.id === swap.requester_nurse_id);
      const target = nurseUsers.find((n: any) => n.id === swap.target_nurse_id);
      const statusLabel = action === "approved" ? "approved ✅" : "rejected ❌";

      const notifications: any[] = [];

      if (requester?.user_id) {
        notifications.push({
          user_id: requester.user_id,
          title: `Swap Request ${action === "approved" ? "Approved" : "Rejected"}`,
          message: `Your shift swap request with ${target?.name || "another nurse"} has been ${statusLabel}.`,
          notification_type: "swap_" + action,
          related_id: swap_id,
        });
      }

      if (target?.user_id) {
        notifications.push({
          user_id: target.user_id,
          title: `Swap Request ${action === "approved" ? "Approved" : "Rejected"}`,
          message: `The shift swap request from ${requester?.name || "another nurse"} has been ${statusLabel}.`,
          notification_type: "swap_" + action,
          related_id: swap_id,
        });
      }

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "swap_" + action,
      entity_type: "shift_swap_request",
      entity_id: swap_id,
      description: `Swap request ${action} between nurses`,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
