import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, MapPin, Award, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import hospital1 from "@/assets/hospital-1.jpg";
import hospital2 from "@/assets/hospital-2.jpg";
import hospital3 from "@/assets/hospital-3.jpg";

const slides = [
  { image: hospital1, title: "World-Class Healthcare Facility", subtitle: "Providing excellence in patient care since 1985" },
  { image: hospital2, title: "Modern Nursing Stations", subtitle: "Equipped with the latest medical technology" },
  { image: hospital3, title: "Dedicated Nursing Team", subtitle: "Over 500 skilled nurses serving our community" },
];

const WelcomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary sticky top-0 z-50 shadow-healthcare">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Nurses Connect" className="h-10 w-10 rounded-lg" />
            <span className="text-xl font-bold text-primary-foreground">Nurses Connect</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#about" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">About</a>
            <a href="#location" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">Location</a>
            <a href="#awards" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">Awards</a>
            <a href="#board" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">Board Members</a>
            <div className="ml-4 flex gap-2">
              <Link to="/nurse-login"><Button variant="pink" size="sm">Nurse Portal</Button></Link>
              <Link to="/headnurse-login"><Button variant="secondary" size="sm" className="font-semibold">Head Nurse</Button></Link>
              <Link to="/admin-login"><Button variant="outline" size="sm" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-semibold">Admin</Button></Link>
            </div>
          </nav>

          {/* Mobile toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-primary-foreground md:hidden">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="border-t border-primary-foreground/10 px-4 pb-4 md:hidden">
            <nav className="flex flex-col gap-2 pt-2">
              <a href="#about" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80">About</a>
              <a href="#location" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80">Location</a>
              <a href="#awards" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80">Awards</a>
              <a href="#board" className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/80">Board Members</a>
              <div className="mt-2 flex flex-col gap-2">
                <Link to="/nurse-login"><Button variant="pink" size="sm" className="w-full">Nurse Portal</Button></Link>
                <Link to="/headnurse-login"><Button variant="secondary" size="sm" className="w-full">Head Nurse</Button></Link>
                <Link to="/admin-login"><Button variant="secondary" size="sm" className="w-full">Admin</Button></Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Carousel */}
      <section className="relative h-[500px] overflow-hidden md:h-[600px]">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? "opacity-100" : "opacity-0"}`}
          >
            <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
              <h2 className="text-3xl font-bold text-primary-foreground md:text-5xl animate-fade-in">{slide.title}</h2>
              <p className="mt-2 text-lg text-primary-foreground/80 md:text-xl">{slide.subtitle}</p>
              <Link to="/nurse-login">
                <Button variant="pink" size="lg" className="mt-6">
                  Get Started <ChevronRight size={18} />
                </Button>
              </Link>
            </div>
          </div>
        ))}
        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2.5 rounded-full transition-all ${i === currentSlide ? "w-8 bg-accent" : "w-2.5 bg-primary-foreground/50"}`}
            />
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">About <span className="text-primary">Our Hospital</span></h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Established in 1985, our hospital has been at the forefront of medical innovation, providing compassionate care with cutting-edge technology to over 100,000 patients annually.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: MapPin, title: "6 Departments", desc: "ICU, Emergency, Pediatrics, General Ward, Operation Theater, and specialized units" },
              { icon: Users, title: "500+ Nurses", desc: "Highly trained nursing staff across 4 divisions ensuring round-the-clock care" },
              { icon: Award, title: "15+ Awards", desc: "Recognized nationally for excellence in patient care and nursing standards" },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-card p-6 shadow-card transition-transform hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location */}
      <section id="location" className="bg-card py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">Our <span className="text-primary">Location</span></h2>
          <div className="mx-auto mt-8 max-w-xl rounded-xl bg-background p-8 shadow-card text-center">
            <MapPin className="mx-auto h-10 w-10 text-accent" />
            <h3 className="mt-4 text-xl font-bold text-foreground">City General Hospital</h3>
            <p className="mt-2 text-muted-foreground">123 Healthcare Boulevard, Medical District<br />Metro City, MC 45678</p>
            <p className="mt-4 text-sm text-muted-foreground">Open 24/7 • Emergency Services Available</p>
          </div>
        </div>
      </section>

      {/* Awards */}
      <section id="awards" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">Awards & <span className="text-accent">Recognition</span></h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { year: "2024", title: "Best Nursing Excellence" },
              { year: "2023", title: "Patient Safety Award" },
              { year: "2022", title: "Top Hospital — National" },
              { year: "2021", title: "Innovation in Healthcare" },
            ].map((award) => (
              <div key={award.year} className="rounded-xl border bg-card p-6 text-center shadow-card">
                <Award className="mx-auto h-8 w-8 text-accent" />
                <p className="mt-3 text-2xl font-bold text-primary">{award.year}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{award.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Board Members */}
      <section id="board" className="bg-card py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">Board <span className="text-primary">Members</span></h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { name: "Dr. Sarah Mitchell", role: "Chief Medical Officer", exp: "25+ years experience" },
              { name: "Dr. James Park", role: "Director of Nursing", exp: "20+ years experience" },
              { name: "Dr. Amelia Chen", role: "Hospital Administrator", exp: "18+ years experience" },
            ].map((member) => (
              <div key={member.name} className="rounded-xl bg-background p-6 text-center shadow-card">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">{member.name}</h3>
                <p className="text-sm font-medium text-primary">{member.role}</p>
                <p className="mt-1 text-xs text-muted-foreground">{member.exp}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="gradient-primary py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-primary-foreground/80">© 2026 Nurses Connect — City General Hospital. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;
