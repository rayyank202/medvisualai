import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="bg-deep px-6 py-14 text-deep-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-xl font-semibold">
            MedVisual <span className="text-gradient-brand">AI</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-deep-foreground/60">
            Turn MBBS notes into living medical visuals — anatomy, flowcharts, histology and more,
            generated from what you actually study.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-deep-foreground/60">
            <li>
              <Link to="/upload" className="hover:text-deep-foreground">
                Upload notes
              </Link>
            </li>
            <li>
              <Link to="/study" className="hover:text-deep-foreground">
                Study Board
              </Link>
            </li>
            <li>
              <Link to="/quiz" className="hover:text-deep-foreground">
                Quiz & flashcards
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Subjects</p>
          <ul className="mt-3 space-y-2 text-sm text-deep-foreground/60">
            <li>Anatomy & Physiology</li>
            <li>Pharmacology</li>
            <li>Pathology</li>
            <li>Microbiology</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl border-t border-primary-glow/15 pt-6 text-xs text-deep-foreground/40">
        © {new Date().getFullYear()} MedVisual AI. Built for medical students.
      </div>
    </footer>
  );
}
