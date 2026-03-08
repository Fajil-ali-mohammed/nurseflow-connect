import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Users, Calendar, ArrowLeftRight, Activity, LogOut,
  Menu, X
} from "lucide-react";
import logo from "@/assets/logo.png";

type Tab = "overview" | "nurses" | "schedules" | "swaps" | "logs";

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const tabs = [
    { key: "overview" as const, icon: LayoutDashboard, label: "Overview" },
    { key: "nurses" as const, icon: Users, label: "All Nurses" },
    { key: "schedules" as const, icon: Calendar, label: "Schedules" },
    { key: "swaps" as const, icon: ArrowLeftRight, label: "Swap Requests" },
    { key: "logs" as const, icon: Activity, label: "Activity Logs" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card shadow-card transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b p-4">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg" />
            <div><p className="text-sm font-bold text-foreground">Nurses Connect</p><p className="text-xs text-muted-foreground">Admin Panel</p></div>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto md:hidden"><X size={20} /></button>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setSidebarOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === t.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              >
                <t.icon size={18} />{t.label}
              </button>
            ))}
          </nav>
          <div className="border-t p-3">
            <Link to="/"><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"><LogOut size={18} /> Sign Out</button></Link>
          </div>
        </div>
      </aside>

      <main className="flex-1">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-6">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden"><Menu size={22} /></button>
          <h1 className="text-lg font-bold text-foreground">Admin <span className="text-primary">Dashboard</span></h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">AD</div>
        </header>

        <div className="p-4 md:p-6">
          {activeTab === "overview" && <AdminOverview />}
          {activeTab === "nurses" && <AdminNurses />}
          {activeTab === "schedules" && <AdminSchedules />}
          {activeTab === "swaps" && <AdminSwaps />}
          {activeTab === "logs" && <AdminLogs />}
        </div>
      </main>
    </div>
  );
};

const AdminOverview = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="grid gap-4 md:grid-cols-4">
      {[
        { label: "Total Nurses", value: "524", color: "bg-primary/10 text-primary" },
        { label: "Active Shifts", value: "186", color: "bg-accent/20 text-accent" },
        { label: "Pending Swaps", value: "12", color: "bg-destructive/10 text-destructive" },
        { label: "Departments", value: "6", color: "bg-primary/10 text-primary" },
      ].map((s) => (
        <div key={s.label} className="rounded-xl bg-card p-5 shadow-card">
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{s.value}</p>
        </div>
      ))}
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl bg-card p-5 shadow-card">
        <h3 className="text-sm font-bold text-foreground">Division Distribution</h3>
        <div className="mt-4 space-y-3">
          {["Division I", "Division II", "Division III", "Division IV"].map((d, i) => {
            const pct = [30, 28, 22, 20][i];
            return (
              <div key={d}>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">{d}</span><span className="font-bold text-foreground">{pct}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-xl bg-card p-5 shadow-card">
        <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
        <div className="mt-4 space-y-3">
          {[
            { text: "New nurse registered: Anna Martinez", time: "2h ago" },
            { text: "Swap approved: Sarah ↔ Emily", time: "5h ago" },
            { text: "Schedule generated for Week 11", time: "1d ago" },
            { text: "Nurse removed: Tom Wilson (Resigned)", time: "2d ago" },
          ].map((a, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-background p-3">
              <p className="text-xs text-foreground">{a.text}</p>
              <span className="text-xs text-muted-foreground">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const AdminNurses = () => (
  <div className="animate-fade-in">
    <h2 className="text-lg font-bold text-foreground mb-4">All Nurses</h2>
    <div className="overflow-x-auto rounded-xl bg-card shadow-card">
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/50">
          <th className="px-4 py-3 text-left font-semibold">Name</th>
          <th className="px-4 py-3 text-left font-semibold">Division</th>
          <th className="px-4 py-3 text-left font-semibold">Department</th>
          <th className="px-4 py-3 text-left font-semibold">Status</th>
        </tr></thead>
        <tbody className="divide-y">
          {["Sarah Johnson", "Emily Watson", "Michael Lee", "Jessica Brown", "David Kim"].map((name, i) => (
            <tr key={name} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium text-foreground">{name}</td>
              <td className="px-4 py-3 text-muted-foreground">Division {["II", "II", "II", "I", "III"][i]}</td>
              <td className="px-4 py-3 text-muted-foreground">{["ICU", "General Ward", "Pediatrics", "Emergency", "OT"][i]}</td>
              <td className="px-4 py-3"><Badge className="bg-primary/10 text-primary border-0">Active</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AdminSchedules = () => (
  <div className="animate-fade-in">
    <h2 className="text-lg font-bold text-foreground mb-4">All Schedules</h2>
    <p className="text-sm text-muted-foreground">Full schedule management view — same as Head Nurse schedule with full edit access.</p>
    <div className="mt-4 rounded-xl bg-card p-8 text-center shadow-card">
      <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
      <p className="mt-4 text-sm text-muted-foreground">Schedule management mirrors Head Nurse view with admin-level access.</p>
    </div>
  </div>
);

const AdminSwaps = () => (
  <div className="animate-fade-in">
    <h2 className="text-lg font-bold text-foreground mb-4">All Swap Requests</h2>
    <div className="space-y-3">
      {[
        { from: "Sarah Johnson", to: "Emily Watson", status: "Approved" },
        { from: "Michael Lee", to: "David Kim", status: "Pending" },
        { from: "Jessica Brown", to: "Sarah Johnson", status: "Rejected" },
      ].map((s, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl bg-card p-4 shadow-card">
          <p className="text-sm font-medium text-foreground">{s.from} ↔ {s.to}</p>
          <Badge className={s.status === "Approved" ? "bg-primary/10 text-primary border-0" : s.status === "Pending" ? "bg-accent/20 text-accent border-0" : "bg-destructive/10 text-destructive border-0"}>
            {s.status}
          </Badge>
        </div>
      ))}
    </div>
  </div>
);

const AdminLogs = () => (
  <div className="animate-fade-in">
    <h2 className="text-lg font-bold text-foreground mb-4">Activity Logs</h2>
    <div className="space-y-2">
      {[
        { action: "Schedule modified by Head Nurse", user: "HN-Admin", time: "Mar 8, 2:30 PM" },
        { action: "Swap request approved", user: "HN-Admin", time: "Mar 8, 10:15 AM" },
        { action: "New nurse added: Anna Martinez", user: "HN-Admin", time: "Mar 7, 4:00 PM" },
        { action: "Nurse removed: Tom Wilson", user: "Admin", time: "Mar 6, 9:00 AM" },
        { action: "Weekly schedule auto-generated", user: "System", time: "Mar 5, 12:00 AM" },
      ].map((log, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg bg-card p-4 shadow-card">
          <div>
            <p className="text-sm font-medium text-foreground">{log.action}</p>
            <p className="text-xs text-muted-foreground">By: {log.user}</p>
          </div>
          <span className="text-xs text-muted-foreground">{log.time}</span>
        </div>
      ))}
    </div>
  </div>
);

export default AdminDashboard;
