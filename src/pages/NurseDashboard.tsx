import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, ArrowLeftRight, Bell, User, LogOut, Menu, X,
  Activity, Building2, ChevronRight
} from "lucide-react";
import logo from "@/assets/logo.png";

const weeklySchedule = [
  { day: "Monday", date: "Mar 10", shift: "Morning (6AM-2PM)", dept: "ICU", status: "upcoming" },
  { day: "Tuesday", date: "Mar 11", shift: "Morning (6AM-2PM)", dept: "ICU", status: "upcoming" },
  { day: "Wednesday", date: "Mar 12", shift: "Off", dept: "-", status: "off" },
  { day: "Thursday", date: "Mar 13", shift: "Night (10PM-6AM)", dept: "Emergency", status: "upcoming" },
  { day: "Friday", date: "Mar 14", shift: "Night (10PM-6AM)", dept: "Emergency", status: "upcoming" },
  { day: "Saturday", date: "Mar 15", shift: "Evening (2PM-10PM)", dept: "General Ward", status: "upcoming" },
  { day: "Sunday", date: "Mar 16", shift: "Off", dept: "-", status: "off" },
];

const notifications = [
  { id: 1, text: "Your shift starts in 12 hours — Morning shift at ICU", time: "6:00 PM", unread: true },
  { id: 2, text: "Swap request approved with Nurse Emily", time: "Yesterday", unread: false },
  { id: 3, text: "New schedule published for next week", time: "2 days ago", unread: false },
];

const NurseDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule" | "swap" | "notifications" | "profile">("schedule");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card shadow-card transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b p-4">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg" />
            <div>
              <p className="text-sm font-bold text-foreground">Nurses Connect</p>
              <p className="text-xs text-muted-foreground">Nurse Portal</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto md:hidden"><X size={20} /></button>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {[
              { key: "schedule" as const, icon: Calendar, label: "My Schedule" },
              { key: "swap" as const, icon: ArrowLeftRight, label: "Shift Swap" },
              { key: "notifications" as const, icon: Bell, label: "Notifications" },
              { key: "profile" as const, icon: User, label: "My Profile" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === item.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              >
                <item.icon size={18} />
                {item.label}
                {item.key === "notifications" && <Badge className="ml-auto bg-accent text-accent-foreground text-xs">1</Badge>}
              </button>
            ))}
          </nav>

          <div className="border-t p-3">
            <Link to="/">
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
                <LogOut size={18} /> Sign Out
              </button>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-6">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden"><Menu size={22} /></button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Welcome, <span className="text-primary">Sarah</span></h1>
            <p className="text-xs text-muted-foreground">Division II • ICU Department</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">SJ</div>
          </div>
        </header>

        <div className="p-4 md:p-6">
          {activeTab === "schedule" && <ScheduleView />}
          {activeTab === "swap" && <SwapView />}
          {activeTab === "notifications" && <NotificationsView />}
          {activeTab === "profile" && <ProfileView />}
        </div>
      </main>
    </div>
  );
};

const ScheduleView = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Workload Status */}
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Shifts This Week</p><p className="text-xl font-bold text-foreground">5</p></div>
        </div>
      </div>
      <div className="rounded-xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20"><Activity className="h-5 w-5 text-accent" /></div>
          <div><p className="text-xs text-muted-foreground">Workload</p><p className="text-xl font-bold text-foreground">Medium</p></div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 w-3/5 rounded-full bg-accent" /></div>
      </div>
      <div className="rounded-xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Current Dept</p><p className="text-xl font-bold text-foreground">ICU</p></div>
        </div>
      </div>
    </div>

    {/* Weekly Schedule */}
    <div className="rounded-xl bg-card shadow-card">
      <div className="border-b p-5"><h2 className="text-lg font-bold text-foreground">Weekly Schedule</h2></div>
      <div className="divide-y">
        {weeklySchedule.map((s) => (
          <div key={s.day} className={`flex items-center justify-between px-5 py-4 ${s.status === "off" ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-4">
              <div className="w-20">
                <p className="text-sm font-bold text-foreground">{s.day}</p>
                <p className="text-xs text-muted-foreground">{s.date}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{s.shift}</p>
                <p className="text-xs text-muted-foreground">{s.dept}</p>
              </div>
            </div>
            <Badge variant={s.status === "off" ? "secondary" : "default"} className={s.status === "off" ? "" : "bg-primary/10 text-primary border-0"}>
              {s.status === "off" ? "Day Off" : "Scheduled"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SwapView = () => {
  const available = [
    { name: "Emily Watson", division: "Division II", shift: "Evening (2PM-10PM)", dept: "General Ward", date: "Mar 10" },
    { name: "Michael Lee", division: "Division II", shift: "Evening (2PM-10PM)", dept: "Pediatrics", date: "Mar 10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-xl bg-card p-6 shadow-card">
        <h2 className="text-lg font-bold text-foreground">Request Shift Swap</h2>
        <p className="mt-1 text-sm text-muted-foreground">Select a shift you'd like to swap and choose from available nurses in your division.</p>

        <div className="mt-6 rounded-lg border bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">YOUR SHIFT</p>
          <p className="mt-1 text-sm font-bold text-foreground">Monday, Mar 10 — Morning (6AM-2PM) at ICU</p>
        </div>

        <h3 className="mt-6 text-sm font-bold text-foreground">Available Nurses for Swap</h3>
        <div className="mt-3 space-y-3">
          {available.map((nurse) => (
            <div key={nurse.name} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                  {nurse.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{nurse.name}</p>
                  <p className="text-xs text-muted-foreground">{nurse.division} • {nurse.shift}</p>
                </div>
              </div>
              <Button variant="pink" size="sm">Request Swap <ChevronRight size={14} /></Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-card p-6 shadow-card">
        <h2 className="text-lg font-bold text-foreground">Swap History</h2>
        <div className="mt-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Swapped with Emily Watson</p>
              <p className="text-xs text-muted-foreground">Mar 3 — Morning ↔ Evening</p>
            </div>
            <Badge className="bg-primary/10 text-primary border-0">Approved</Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationsView = () => (
  <div className="space-y-3 animate-fade-in">
    <h2 className="text-lg font-bold text-foreground">Notifications</h2>
    {notifications.map((n) => (
      <div key={n.id} className={`flex items-start gap-3 rounded-xl p-4 shadow-card ${n.unread ? "border-l-4 border-accent bg-accent/5" : "bg-card"}`}>
        <Bell className={`mt-0.5 h-5 w-5 flex-shrink-0 ${n.unread ? "text-accent" : "text-muted-foreground"}`} />
        <div>
          <p className="text-sm font-medium text-foreground">{n.text}</p>
          <p className="mt-1 text-xs text-muted-foreground">{n.time}</p>
        </div>
      </div>
    ))}
  </div>
);

const ProfileView = () => (
  <div className="animate-fade-in">
    <div className="rounded-xl bg-card p-6 shadow-card">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">SJ</div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Sarah Johnson</h2>
          <p className="text-sm text-muted-foreground">Registered Nurse</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          { label: "Phone", value: "+1 (555) 123-4567" },
          { label: "Age", value: "28" },
          { label: "Gender", value: "Female" },
          { label: "Division", value: "Division II" },
          { label: "Current Dept", value: "ICU" },
          { label: "Exam Score", value: "92%" },
          { label: "Previous Depts", value: "Emergency, General Ward" },
          { label: "Experience", value: "4 years" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm font-bold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default NurseDashboard;
