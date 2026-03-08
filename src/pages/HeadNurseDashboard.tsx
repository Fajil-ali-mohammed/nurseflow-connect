import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Calendar, Users, ArrowLeftRight, ClipboardCheck, UserPlus, LogOut,
  Menu, X, Check, XCircle, Search, Download, Star, Trash2
} from "lucide-react";
import logo from "@/assets/logo.png";

type Tab = "schedule" | "swaps" | "performance" | "manage";

const allNurses = [
  { id: 1, name: "Sarah Johnson", division: "Division II", dept: "ICU", phone: "+1-555-1234", shifts: 5 },
  { id: 2, name: "Emily Watson", division: "Division II", dept: "General Ward", phone: "+1-555-5678", shifts: 4 },
  { id: 3, name: "Michael Lee", division: "Division II", dept: "Pediatrics", phone: "+1-555-9012", shifts: 5 },
  { id: 4, name: "Jessica Brown", division: "Division I", dept: "Emergency", phone: "+1-555-3456", shifts: 6 },
  { id: 5, name: "David Kim", division: "Division III", dept: "Operation Theater", phone: "+1-555-7890", shifts: 4 },
];

const scheduleData = [
  { nurse: "Sarah Johnson", dept: "ICU", shift: "Morning (6AM-2PM)", date: "Mar 10", division: "Div II" },
  { nurse: "Emily Watson", dept: "General Ward", shift: "Evening (2PM-10PM)", date: "Mar 10", division: "Div II" },
  { nurse: "Michael Lee", dept: "Pediatrics", shift: "Night (10PM-6AM)", date: "Mar 10", division: "Div II" },
  { nurse: "Jessica Brown", dept: "Emergency", shift: "Morning (6AM-2PM)", date: "Mar 11", division: "Div I" },
  { nurse: "David Kim", dept: "Operation Theater", shift: "Evening (2PM-10PM)", date: "Mar 11", division: "Div III" },
  { nurse: "Sarah Johnson", dept: "ICU", shift: "Morning (6AM-2PM)", date: "Mar 11", division: "Div II" },
];

const swapRequests = [
  { id: 1, from: "Sarah Johnson", to: "Emily Watson", fromShift: "Morning — ICU", toShift: "Evening — General Ward", date: "Mar 10", status: "pending" },
  { id: 2, from: "Michael Lee", to: "David Kim", fromShift: "Night — Pediatrics", toShift: "Evening — OT", date: "Mar 12", status: "pending" },
];

const HeadNurseDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("schedule");

  const tabs = [
    { key: "schedule" as const, icon: Calendar, label: "Weekly Schedule" },
    { key: "swaps" as const, icon: ArrowLeftRight, label: "Swap Requests" },
    { key: "performance" as const, icon: ClipboardCheck, label: "Performance" },
    { key: "manage" as const, icon: UserPlus, label: "Manage Nurses" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card shadow-card transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b p-4">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-lg" />
            <div><p className="text-sm font-bold text-foreground">Nurses Connect</p><p className="text-xs text-muted-foreground">Head Nurse</p></div>
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
                {t.key === "swaps" && <Badge className="ml-auto bg-accent text-accent-foreground text-xs">2</Badge>}
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
          <div><h1 className="text-lg font-bold text-foreground">Head Nurse <span className="text-primary">Dashboard</span></h1></div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">HN</div>
        </header>

        <div className="p-4 md:p-6">
          {activeTab === "schedule" && <HNScheduleView />}
          {activeTab === "swaps" && <HNSwapView />}
          {activeTab === "performance" && <HNPerformanceView />}
          {activeTab === "manage" && <HNManageView />}
        </div>
      </main>
    </div>
  );
};

const HNScheduleView = () => {
  const [search, setSearch] = useState("");
  const filtered = scheduleData.filter((s) => s.nurse.toLowerCase().includes(search.toLowerCase()) || s.dept.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">Weekly Schedule</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search nurse or dept..." className="pl-10 w-60" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm"><Download size={16} className="mr-1" /> Export PDF</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-semibold text-foreground">Nurse</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Division</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Department</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Shift</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
          </tr></thead>
          <tbody className="divide-y">
            {filtered.map((s, i) => (
              <tr key={i} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{s.nurse}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.division}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.dept}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.shift}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const HNSwapView = () => (
  <div className="space-y-4 animate-fade-in">
    <h2 className="text-lg font-bold text-foreground">Pending Swap Requests</h2>
    {swapRequests.map((r) => (
      <div key={r.id} className="rounded-xl bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-bold text-foreground">{r.from} ↔ {r.to}</p>
            <p className="text-xs text-muted-foreground">{r.fromShift} ⟷ {r.toShift}</p>
            <p className="text-xs text-muted-foreground">Date: {r.date}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="hero" size="sm"><Check size={14} className="mr-1" /> Approve</Button>
            <Button variant="outline" size="sm"><XCircle size={14} className="mr-1" /> Reject</Button>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const HNPerformanceView = () => (
  <div className="space-y-4 animate-fade-in">
    <h2 className="text-lg font-bold text-foreground">Nurse Performance</h2>
    <div className="grid gap-4 md:grid-cols-2">
      {allNurses.map((n) => {
        const score = Math.floor(Math.random() * 30) + 70;
        return (
          <div key={n.id} className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {n.name.split(" ").map((w) => w[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{n.name}</p>
                  <p className="text-xs text-muted-foreground">{n.division} • {n.dept}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-accent" fill="currentColor" />
                <span className="text-sm font-bold text-foreground">{score}%</span>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${score}%` }} />
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>Shifts: {n.shifts}/wk</span>
              <span>Attendance: {score > 85 ? "Excellent" : "Good"}</span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const HNManageView = () => {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Manage Nurses</h2>
        <Button variant="pink" size="sm" onClick={() => setShowAdd(!showAdd)}><UserPlus size={16} className="mr-1" /> Add Nurse</Button>
      </div>

      {showAdd && (
        <div className="rounded-xl bg-card p-6 shadow-card">
          <h3 className="text-sm font-bold text-foreground mb-4">Add New Nurse</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Full Name</Label><Input placeholder="Enter name" /></div>
            <div className="space-y-2"><Label>Phone Number</Label><Input placeholder="Enter phone" /></div>
            <div className="space-y-2"><Label>Age</Label><Input type="number" placeholder="Age" /></div>
            <div className="space-y-2"><Label>Gender</Label><Input placeholder="Gender" /></div>
            <div className="space-y-2"><Label>Division</Label><Input placeholder="Division I-IV" /></div>
            <div className="space-y-2"><Label>Department</Label><Input placeholder="Department" /></div>
          </div>
          <Button variant="hero" className="mt-4">Save Nurse</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Division</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Department</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Phone</th>
            <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
          </tr></thead>
          <tbody className="divide-y">
            {allNurses.map((n) => (
              <tr key={n.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{n.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{n.division}</td>
                <td className="px-4 py-3 text-muted-foreground">{n.dept}</td>
                <td className="px-4 py-3 text-muted-foreground">{n.phone}</td>
                <td className="px-4 py-3"><Button variant="ghost" size="sm" className="text-destructive"><Trash2 size={14} /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HeadNurseDashboard;
