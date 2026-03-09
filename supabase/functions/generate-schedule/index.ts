import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Nurse {
  id: string;
  name: string;
  division_id: string | null;
  current_department_id: string | null;
  previous_departments: string[] | null;
  experience_years: number | null;
  is_active: boolean;
}

interface Department {
  id: string;
  name: string;
}

type ShiftType = "morning" | "evening" | "night";

const SHIFT_TYPES: ShiftType[] = ["morning", "evening", "night"];
const MAX_SHIFTS_PER_WEEK = 5;
const LEAVE_DAYS_PER_WEEK = 2; // Each nurse gets 2 leave days per week

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData || !["head_nurse", "admin"].includes(roleData.role)) {
      throw new Error("Only head nurses and admins can generate schedules");
    }

    const { week_number, year } = await req.json();
    if (!week_number || !year) throw new Error("week_number and year are required");

    // Delete existing schedules and leaves for this week (regenerate)
    const monday = getDateOfISOWeek(week_number, year);
    const weekDays: string[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday);
      day.setDate(day.getDate() + d);
      weekDays.push(day.toISOString().split("T")[0]);
    }

    await supabase
      .from("schedules")
      .delete()
      .eq("week_number", week_number)
      .eq("year", year);

    // Clear auto-generated leaves for this week
    await supabase
      .from("nurse_leaves")
      .delete()
      .in("leave_date", weekDays);

    // Fetch active nurses and departments
    const { data: nurses, error: nursesErr } = await supabase
      .from("nurses")
      .select("id, name, division_id, current_department_id, previous_departments, experience_years, is_active")
      .eq("is_active", true);

    if (nursesErr) throw nursesErr;
    if (!nurses || nurses.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No active nurses found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: departments, error: deptErr } = await supabase
      .from("departments")
      .select("id, name");

    if (deptErr) throw deptErr;
    if (!departments || departments.length === 0) {
      throw new Error("No departments found");
    }

    // Fetch any manually pre-set leaves for this week
    const { data: existingLeaves } = await supabase
      .from("nurse_leaves")
      .select("nurse_id, leave_date")
      .in("leave_date", weekDays);

    // Build a set of pre-existing leaves: nurseId -> Set of dates
    const presetLeaves: Record<string, Set<string>> = {};
    for (const n of nurses) {
      presetLeaves[n.id] = new Set();
    }
    if (existingLeaves) {
      for (const l of existingLeaves) {
        if (presetLeaves[l.nurse_id]) {
          presetLeaves[l.nurse_id].add(l.leave_date);
        }
      }
    }

    // Assign leave days for each nurse (spread out across the week)
    // Each nurse gets LEAVE_DAYS_PER_WEEK days off, distributed so not all nurses are off on the same day
    const nurseLeaveDays: Record<string, Set<string>> = {};
    const dayLeaveCount: Record<string, number> = {};
    for (const d of weekDays) {
      dayLeaveCount[d] = 0;
    }

    for (const n of nurses) {
      nurseLeaveDays[n.id] = new Set(presetLeaves[n.id]);
      // Count preset leaves toward daily totals
      for (const d of presetLeaves[n.id]) {
        dayLeaveCount[d] = (dayLeaveCount[d] || 0) + 1;
      }
    }

    // Assign remaining leave days to nurses who don't have enough yet
    const newLeaveRecords: Array<{ nurse_id: string; leave_date: string; reason: string; approved_by: string }> = [];

    for (const nurse of nurses) {
      const currentLeaves = nurseLeaveDays[nurse.id].size;
      const needed = LEAVE_DAYS_PER_WEEK - currentLeaves;

      if (needed <= 0) continue;

      // Pick days with fewest nurses on leave (to spread leaves evenly)
      const availableDays = weekDays
        .filter((d) => !nurseLeaveDays[nurse.id].has(d))
        .sort((a, b) => dayLeaveCount[a] - dayLeaveCount[b]);

      for (let i = 0; i < needed && i < availableDays.length; i++) {
        const leaveDay = availableDays[i];
        nurseLeaveDays[nurse.id].add(leaveDay);
        dayLeaveCount[leaveDay]++;
        newLeaveRecords.push({
          nurse_id: nurse.id,
          leave_date: leaveDay,
          reason: "Scheduled leave (auto-generated)",
          approved_by: user.id,
        });
      }
    }

    // Insert auto-generated leaves
    if (newLeaveRecords.length > 0) {
      for (let i = 0; i < newLeaveRecords.length; i += 500) {
        const batch = newLeaveRecords.slice(i, i + 500);
        await supabase.from("nurse_leaves").insert(batch);
      }
    }

    // Now generate schedule — only assign nurses on days they are NOT on leave
    const nurseShiftCount: Record<string, number> = {};
    const nurseDailyAssigned: Record<string, Set<string>> = {};
    const nurseShiftTypeCount: Record<string, Record<ShiftType, number>> = {};

    for (const n of nurses) {
      nurseShiftCount[n.id] = 0;
      nurseDailyAssigned[n.id] = new Set();
      nurseShiftTypeCount[n.id] = { morning: 0, evening: 0, night: 0 };
    }

    const scheduleEntries: Array<{
      nurse_id: string;
      department_id: string;
      duty_date: string;
      shift_type: ShiftType;
      week_number: number;
      year: number;
      created_by: string;
    }> = [];

    const nursesPerShiftPerDept = Math.max(
      1,
      Math.floor(nurses.length / (departments.length * SHIFT_TYPES.length * 2))
    );

    for (const date of weekDays) {
      for (const dept of departments) {
        for (const shiftType of SHIFT_TYPES) {
          const eligible = nurses
            .filter((n) => {
              // Skip nurses on leave this day
              if (nurseLeaveDays[n.id].has(date)) return false;
              // Not already assigned today
              if (nurseDailyAssigned[n.id].has(date)) return false;
              // Not over max shifts
              if (nurseShiftCount[n.id] >= MAX_SHIFTS_PER_WEEK) return false;
              return true;
            })
            .sort((a, b) => {
              const shiftDiff = nurseShiftCount[a.id] - nurseShiftCount[b.id];
              if (shiftDiff !== 0) return shiftDiff;

              const typeDiff =
                nurseShiftTypeCount[a.id][shiftType] -
                nurseShiftTypeCount[b.id][shiftType];
              if (typeDiff !== 0) return typeDiff;

              const aWasHere = (a.previous_departments || []).includes(dept.id) ? 1 : 0;
              const bWasHere = (b.previous_departments || []).includes(dept.id) ? 1 : 0;
              if (aWasHere !== bWasHere) return aWasHere - bWasHere;

              if (shiftType === "night") {
                return (b.experience_years || 0) - (a.experience_years || 0);
              }

              return 0;
            });

          const toAssign = eligible.slice(0, nursesPerShiftPerDept);

          for (const nurse of toAssign) {
            scheduleEntries.push({
              nurse_id: nurse.id,
              department_id: dept.id,
              duty_date: date,
              shift_type: shiftType,
              week_number,
              year,
              created_by: user.id,
            });

            nurseShiftCount[nurse.id]++;
            nurseDailyAssigned[nurse.id].add(date);
            nurseShiftTypeCount[nurse.id][shiftType]++;
          }
        }
      }
    }

    if (scheduleEntries.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not generate any schedule entries" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Insert schedules in batches
    for (let i = 0; i < scheduleEntries.length; i += 500) {
      const batch = scheduleEntries.slice(i, i + 500);
      const { error: insertErr } = await supabase.from("schedules").insert(batch);
      if (insertErr) throw insertErr;
    }

    const stats = {
      total_entries: scheduleEntries.length,
      nurses_scheduled: new Set(scheduleEntries.map((e) => e.nurse_id)).size,
      days_covered: weekDays.length,
      departments_covered: departments.length,
      leave_days_assigned: newLeaveRecords.length,
      shifts_per_nurse: Object.fromEntries(
        Object.entries(nurseShiftCount).filter(([, v]) => v > 0)
      ),
    };

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "schedule_generated",
      entity_type: "schedule",
      description: `Generated schedule for week ${week_number} of ${year}: ${stats.total_entries} entries for ${stats.nurses_scheduled} nurses, ${stats.leave_days_assigned} leave days assigned`,
    });

    // Send notifications to all scheduled nurses
    const scheduledNurseIds = [...new Set(scheduleEntries.map((e) => e.nurse_id))];
    const { data: nurseUsers } = await supabase
      .from("nurses")
      .select("id, user_id")
      .in("id", scheduledNurseIds)
      .not("user_id", "is", null);

    if (nurseUsers && nurseUsers.length > 0) {
      const notifications = nurseUsers.map((n: any) => ({
        user_id: n.user_id,
        title: "New Schedule Published",
        message: `Your schedule for week ${week_number} of ${year} has been published. Check your dashboard for details.`,
        notification_type: "schedule_published",
      }));

      for (let i = 0; i < notifications.length; i += 500) {
        await supabase.from("notifications").insert(notifications.slice(i, i + 500));
      }
    }

    return new Response(
      JSON.stringify({ success: true, stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getDateOfISOWeek(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}
