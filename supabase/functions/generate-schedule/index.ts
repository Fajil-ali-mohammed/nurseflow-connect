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
const MIN_SHIFTS_PER_WEEK = 4;

/**
 * Auto-scheduling algorithm:
 *
 * 1. Fetch all active nurses and departments
 * 2. For each day of the target week (Mon–Sun):
 *    a. For each department, assign nurses to morning/evening/night shifts
 *    b. Prioritize nurses with the fewest shifts so far (workload balancing)
 *    c. Avoid assigning a nurse to a department in their previous_departments list (rotation)
 *    d. Avoid scheduling the same nurse for >1 shift per day
 *    e. Cap total shifts at MAX_SHIFTS_PER_WEEK per nurse
 * 3. Write all schedule entries atomically
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate caller via auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check role
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

    // Delete existing schedules for this week (regenerate)
    await supabase
      .from("schedules")
      .delete()
      .eq("week_number", week_number)
      .eq("year", year);

    // Fetch active nurses
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

    // Fetch departments
    const { data: departments, error: deptErr } = await supabase
      .from("departments")
      .select("id, name");

    if (deptErr) throw deptErr;
    if (!departments || departments.length === 0) {
      throw new Error("No departments found");
    }

    // Calculate the Monday of the given ISO week
    const monday = getDateOfISOWeek(week_number, year);
    const weekDays: string[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday);
      day.setDate(day.getDate() + d);
      weekDays.push(day.toISOString().split("T")[0]);
    }

    // Track shift counts per nurse for fairness
    const nurseShiftCount: Record<string, number> = {};
    const nurseDailyAssigned: Record<string, Set<string>> = {}; // nurseId -> Set of dates
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

    // How many nurses per shift per department
    // Scale based on available nurses: at least 1 per dept/shift
    const nursesPerShiftPerDept = Math.max(
      1,
      Math.floor(nurses.length / (departments.length * SHIFT_TYPES.length * 2))
    );

    // For each day, for each department, for each shift type
    for (const date of weekDays) {
      for (const dept of departments) {
        for (const shiftType of SHIFT_TYPES) {
          // Find eligible nurses sorted by fairness criteria
          const eligible = nurses
            .filter((n) => {
              // Not already assigned today
              if (nurseDailyAssigned[n.id].has(date)) return false;
              // Not over max shifts
              if (nurseShiftCount[n.id] >= MAX_SHIFTS_PER_WEEK) return false;
              return true;
            })
            .sort((a, b) => {
              // Primary: fewest total shifts first (workload balance)
              const shiftDiff = nurseShiftCount[a.id] - nurseShiftCount[b.id];
              if (shiftDiff !== 0) return shiftDiff;

              // Secondary: fewest of this shift type (variety)
              const typeDiff =
                nurseShiftTypeCount[a.id][shiftType] -
                nurseShiftTypeCount[b.id][shiftType];
              if (typeDiff !== 0) return typeDiff;

              // Tertiary: prefer nurses NOT previously in this department (rotation)
              const aWasHere = (a.previous_departments || []).includes(dept.id) ? 1 : 0;
              const bWasHere = (b.previous_departments || []).includes(dept.id) ? 1 : 0;
              if (aWasHere !== bWasHere) return aWasHere - bWasHere;

              // Quaternary: more experienced nurses get slight priority for night shifts
              if (shiftType === "night") {
                return (b.experience_years || 0) - (a.experience_years || 0);
              }

              return 0;
            });

          // Assign up to nursesPerShiftPerDept nurses
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

    // Insert in batches of 500 (Supabase limit)
    const batchSize = 500;
    for (let i = 0; i < scheduleEntries.length; i += batchSize) {
      const batch = scheduleEntries.slice(i, i + batchSize);
      const { error: insertErr } = await supabase.from("schedules").insert(batch);
      if (insertErr) throw insertErr;
    }

    // Build summary stats
    const stats = {
      total_entries: scheduleEntries.length,
      nurses_scheduled: new Set(scheduleEntries.map((e) => e.nurse_id)).size,
      days_covered: weekDays.length,
      departments_covered: departments.length,
      shifts_per_nurse: Object.fromEntries(
        Object.entries(nurseShiftCount).filter(([, v]) => v > 0)
      ),
    };

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "schedule_generated",
      entity_type: "schedule",
      description: `Generated schedule for week ${week_number} of ${year}: ${stats.total_entries} entries for ${stats.nurses_scheduled} nurses`,
    });

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

/**
 * Get the Monday date of a given ISO week number and year.
 */
function getDateOfISOWeek(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Mon=1 ... Sun=7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}
