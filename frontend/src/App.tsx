import { NavLink, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Droplets, LayoutDashboard, ScrollText, SlidersHorizontal, Wifi, WifiOff } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Controls from "./pages/Controls";
import Events from "./pages/Events";
import ThemeToggle from "./components/ThemeToggle";
import { api } from "./api/client";

const navLinks = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/controls", label: "Controls", icon: SlidersHorizontal },
  { to: "/events", label: "Events", icon: ScrollText },
];

function ConnectionIndicator() {
  const statusQuery = useQuery({ queryKey: ["status"], queryFn: api.getStatus });
  const connected = statusQuery.data?.mqtt_connected ?? false;

  return (
    <span className={`conn-indicator ${connected ? "ok" : "warn"}`} title="Backend → MQTT broker connection">
      {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
      {connected ? "Connected" : "Offline"}
    </span>
  );
}

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <Droplets size={20} strokeWidth={2.25} />
          </span>
          <span className="brand-name">AquaGuard</span>
        </div>

        <nav>
          {navLinks.map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <ConnectionIndicator />
          <ThemeToggle />
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/events" element={<Events />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
