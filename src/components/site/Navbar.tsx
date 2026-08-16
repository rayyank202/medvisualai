import { Link } from "@tanstack/react-router";
import { Brain } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/upload", label: "Upload" },
  { to: "/study", label: "Study Board" },
  { to: "/quiz", label: "Quiz" },
] as const;

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav className="glass-panel mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-brand shadow-glow">
            <Brain className="size-5 text-primary-foreground" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-deep-foreground">
            MedVisual <span className="text-gradient-brand">AI</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="rounded-lg px-3 py-2 text-sm text-deep-foreground/70 transition-colors hover:bg-primary/20 hover:text-deep-foreground"
                activeOptions={{ exact: l.to === "/" }}
                activeProps={{ className: "text-deep-foreground bg-primary/25" }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          to="/upload"
          className="rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.03]"
        >
          Get Started
        </Link>
      </nav>
    </header>
  );
}
