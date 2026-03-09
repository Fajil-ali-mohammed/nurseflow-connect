import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Shift start times (24h format)
const SHIFT_START_HOURS: Record<string, number> = {
  morning: 7,   // 7:00 AM
  evening: 15,  // 3:00 PM
  night: 23,    // 11:00 PM
};

// Reminder windows in hours before shift
const REMINDER_WINDOWS = [
  { type: "12h", hoursBefore: 12 },
  { type: "6h", hoursBefore: 6 },
  { type: "3h", hoursBefore: 3 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    let remindersSent = 0;

    // Check each reminder window
    for (const reminder of REMINDER_WINDOWS) {
      // Calculate the target shift start time range
      // We want shifts starting in approximately `hoursBefore` hours
      // With a 30-min cron, use a 30-min window around the target
      const targetTime = new Date(now.getTime() + reminder.hoursBefore * 60 * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 15 * 60 * 1000); // -15 min
      const windowEnd = new Date(targetTime.getTime() + 15 * 60 * 1000);   // +15 min

      // Find schedules whose shift starts within this window
      // We need to check duty_date + shift start hour
      const today = now.toISOString().split("T")[0];
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Fetch schedules for today and tomorrow (to cover overnight windows)
      const { data: schedules, error: schedErr } = await supabase
        .from("schedules")
        .select("id, nurse_id, duty_date, shift_type, department:departments(name)")
        .in("duty_date", [today, tomorrow]);

      if (schedErr) {
        console.error("Error fetching schedules:", schedErr);
        continue;
      }

      if (!schedules || schedules.length === 0) continue;

      for (const schedule of schedules) {
        const shiftStartHour = SHIFT_START_HOURS[schedule.shift_type];
        if (shiftStartHour === undefined) continue;

        // Build the actual shift start datetime
        const shiftStart = new Date(`${schedule.duty_date}T${String(shiftStartHour).padStart(2, "0")}:00:00`);

        // Check if this shift's start time falls within our reminder window
        if (shiftStart < windowStart || shiftStart > windowEnd) continue;

        // Check if reminder already sent
        const { data: existing } = await supabase
          .from("duty_reminders")
          .select("id")
          .eq("schedule_id", schedule.id)
          .eq("reminder_type", reminder.type)
          .maybeSingle();

        if (existing) continue; // Already sent

        // Get nurse's user_id
        const { data: nurse } = await supabase
          .from("nurses")
          .select("user_id, name")
          .eq("id", schedule.nurse_id)
          .maybeSingle();

        if (!nurse?.user_id) continue;

        // Build notification message
        const deptName = (schedule.department as any)?.name || "your department";
        const shiftLabel = schedule.shift_type.charAt(0).toUpperCase() + schedule.shift_type.slice(1);
        const timeLabel = `${reminder.hoursBefore} hours`;

        const title = `⏰ Duty Reminder - ${timeLabel} left`;
        const message = `Hi ${nurse.name}, your ${shiftLabel} shift at ${deptName} on ${schedule.duty_date} starts in ${timeLabel}. Please prepare accordingly.`;

        // Insert in-app notification
        const { error: notifErr } = await supabase.from("notifications").insert({
          user_id: nurse.user_id,
          title,
          message,
          notification_type: "duty_reminder",
        });

        if (notifErr) {
          console.error(`Failed to send reminder for schedule ${schedule.id}:`, notifErr);
          continue;
        }

        // Send web push notifications to all subscribed devices
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", nurse.user_id);

        if (subscriptions && subscriptions.length > 0) {
          for (const sub of subscriptions) {
            try {
              await sendWebPush(sub, { title, body: message, icon: "/favicon.ico", tag: `duty-${reminder.type}-${schedule.id}` });
            } catch (pushErr) {
              console.error(`Push failed for endpoint ${sub.endpoint}:`, pushErr);
            }
          }
        }

        // Send WhatsApp reminder
        const { data: nursePhone } = await supabase
          .from("nurses")
          .select("phone")
          .eq("id", schedule.nurse_id)
          .maybeSingle();

        if (nursePhone?.phone) {
          try {
            await sendWhatsAppMessage(nursePhone.phone, message);
            console.log(`WhatsApp reminder sent to ${nurse.name} at ${nursePhone.phone}`);
          } catch (waErr) {
            console.error(`WhatsApp failed for ${nurse.name}:`, waErr);
          }
        }

        // Record that we sent this reminder
        await supabase.from("duty_reminders").insert({
          schedule_id: schedule.id,
          reminder_type: reminder.type,
        });

        remindersSent++;
        console.log(`Sent ${reminder.type} reminder to ${nurse.name} for ${schedule.shift_type} shift on ${schedule.duty_date}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: remindersSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Duty reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Send a web push notification using the Web Push protocol.
 */
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; tag?: string }
): Promise<void> {
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", TTL: "86400" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Push send failed [${response.status}]: ${text}`);
  } else {
    await response.text();
  }
}

/**
 * Send a WhatsApp message via WhatsApp Business API.
 */
async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp credentials not configured");
  }

  // Format phone: remove leading 0, ensure country code
  let formattedPhone = phone.replace(/\s+/g, "").replace(/^0+/, "");
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = `+251${formattedPhone}`; // Default to Ethiopia country code
  }
  formattedPhone = formattedPhone.replace("+", "");

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: { body: message },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WhatsApp send failed [${response.status}]: ${text}`);
  } else {
    await response.text();
  }
}
