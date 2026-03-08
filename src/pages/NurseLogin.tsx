import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Phone, Lock, UserPlus } from "lucide-react";
import logo from "@/assets/logo.png";

const NurseLogin = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo: navigate to nurse dashboard
    navigate("/nurse-dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div className="rounded-2xl bg-card p-8 shadow-card">
          <div className="flex flex-col items-center">
            <img src={logo} alt="Nurses Connect" className="h-16 w-16 rounded-xl" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">{isRegister ? "Nurse Registration" : "Nurse Login"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{isRegister ? "Register with your hospital phone number" : "Access your duty schedule"}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="pl-10" required />
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full" size="lg">
              {isRegister ? "Register" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-primary hover:underline">
              {isRegister ? (
                <span>Already have an account? <strong>Sign In</strong></span>
              ) : (
                <span className="flex items-center justify-center gap-1"><UserPlus size={14} /> Create an account</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseLogin;
