import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Brain, ListChecks, Layers, Workflow, Microscope, Pill, HeartPulse, FlaskConical, Bug,
} from "lucide-react";
import { GRAPHIC_BLOCKS } from "@/lib/graphic-blocks";

const features = [
  { icon: Sparkles, title: "AI Anatomy Generator", text: "Illustrations built from your own notes.", to: "/upload" },
  { icon: ListChecks, title: "Quiz Generator", text: "Exam-style MCQs with explanations.", to: "/quiz" },
  { icon: Layers, title: "Flashcards", text: "Spaced repetition on weak topics.", to: "/quiz" },
  { icon: Brain, title: "Viva Mode", text: "Rapid-fire spoken-style practice.", to: "/quiz" },
  { icon: Workflow, title: "Pipeline", text: "Notes in, structured graphics out.", to: "/study" },
] as const;

const specialties = [
  { icon: HeartPulse, label: "Anatomy" },
  { icon: Brain, label: "Physiology" },
  { icon: Pill, label: "Pharmacology" },
  { icon: Microscope, label: "Pathology" },
  { icon: FlaskConical, label: "Biochemistry" },
  { icon: Bug, label: "Microbiology" },
] as const;

const stats = [
  { value: 120000, suffix: "+", label: "Graphics generated" },
  { value: 18500, suffix: "+", label: "Students learning" },
  { value: 99, suffix: "%", label: "Concept accuracy" },
] as const;

const testimonials = [
  { quote: "I stopped rewriting notes. The flowcharts my PDFs turn into are what I actually revise from.", name: "Aisha R.", year: "2nd year MBBS" },
  { quote: "Histology finally clicked when the slides showed up next to my lecture text.", name: "Vikram S.", year: "3rd year MBBS" },
  { quote: "Viva mode is brutal in the best way. Walked into my exam already used to the pressure.", name: "Nandini P.", year: "Final year" },
];

const pricing = [
  { name: "Free", price: "₹0", items: ["30 graphics / month", "Study Board", "Basic quiz"], cta: "Start free" },
  { name: "Pro", price: "₹399", items: ["Unlimited graphics", "Viva & flashcards", "Priority AI"], cta: "Go Pro", featured: true },
  { name: "Institution", price: "Custom", items: ["Batch accounts", "Shared boards", "Analytics"], cta: "Talk to us" },
];

/* ------------------------------------------------------------- demo strip */

interface Card {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

function DemoCanvas() {
  const [cards, setCards] = useState<Card[]>([
    { id: "a", name: "Cardiac Cycle", color: "#0A4FFF", x: 24, y: 28 },
    { id: "b", name: "Nephron Flowchart", color: "#00D5FF", x: 220, y: 96 },
    { id: "c", name: "Beta Blockers", color: "#10C980", x: 96, y: 176 },
  ]);
  const dragging = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragging.current;
      const area = areaRef.current;
      if (!d || !area) return;
      const r = area.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - r.left - d.dx, 0), r.width - 170);
      const y = Math.min(Math.max(e.clientY - r.top - d.dy, 0), r.height - 80);
      setCards((c) => c.map((card) => (card.id === d.id ? { ...card, x, y } : card)));
    };
    const up = () => (dragging.current = null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div
      ref={areaRef}
      className="relative h-72 overflow-hidden rounded-3xl border border-border bg-secondary"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--primary) 18%, transparent) 1px, transparent 0)",
        backgroundSize: "22px 22px",
      }}
    >
      {cards.map((c) => (
        <div
          key={c.id}
          onPointerDown={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            dragging.current = { id: c.id, dx: e.clientX - r.left, dy: e.clientY - r.top };
          }}
          className="absolute w-[170px] cursor-grab touch-none rounded-2xl bg-card p-3 shadow-soft active:cursor-grabbing"
          style={{ left: c.x, top: c.y, borderTop: `3px solid ${c.color}` }}
        >
          <p className="text-sm font-medium">{c.name}</p>
          <div className="mt-2 space-y-1.5">
            <div className="h-1.5 w-4/5 rounded-full bg-muted" />
            <div className="h-1.5 w-3/5 rounded-full bg-muted" />
          </div>
        </div>
      ))}
      <p className="absolute bottom-3 right-4 text-xs text-muted-foreground">Drag the cards — try it right here</p>
    </div>
  );
}

/* ---------------------------------------------------------------- counter */

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1400);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <p ref={ref} className="text-4xl font-semibold text-gradient-brand">
      {n.toLocaleString()}
      {suffix}
    </p>
  );
}

/* ---------------------------------------------------------------- section */

export function SurfaceSections() {
  const [active, setActive] = useState(0);

  return (
    <div className="relative z-10 bg-background">
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">A board that thinks like you revise</h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          The same canvas engine that powers your Study Board, running right here.
        </p>
        <div className="mt-8">
          <DemoCanvas />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Everything the AI builds for you</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-soft"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
                <f.icon className="size-5" />
              </span>
              <p className="mt-4 font-medium">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">All 12 graphic types</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GRAPHIC_BLOCKS.map((b) => (
            <Link
              key={b.id}
              to="/study"
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: b.color, display: "inline-block" }} />
              <p className="mt-2 text-sm font-medium">{b.name}</p>
              <p className="text-xs text-muted-foreground">{b.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-secondary py-16">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-3 px-6">
          {specialties.map((s) => (
            <span
              key={s.label}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm"
            >
              <s.icon className="size-4 text-primary" />
              {s.label}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-24 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <Counter value={s.value} suffix={s.suffix} />
            <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <blockquote className="text-2xl font-medium leading-snug">
          “{testimonials[active]!.quote}”
        </blockquote>
        <p className="mt-4 text-sm text-muted-foreground">
          {testimonials[active]!.name} · {testimonials[active]!.year}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {testimonials.map((t, i) => (
            <button
              key={t.name}
              aria-label={`Testimonial ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-2 rounded-full transition-all ${i === active ? "w-8 bg-primary" : "w-2 bg-border"}`}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Simple pricing</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {pricing.map((p) => (
            <div
              key={p.name}
              className={`rounded-3xl border p-7 ${
                p.featured ? "border-primary/50 bg-card shadow-soft" : "border-border bg-card"
              }`}
            >
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{p.name}</p>
              <p className="mt-3 text-4xl font-semibold">
                {p.price}
                {p.price.startsWith("₹") && p.price !== "₹0" && (
                  <span className="text-base font-normal text-muted-foreground">/mo</span>
                )}
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                {p.items.map((i) => (
                  <li key={i}>· {i}</li>
                ))}
              </ul>
              <Link
                to="/upload"
                className={`mt-7 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${
                  p.featured
                    ? "bg-gradient-brand text-primary-foreground"
                    : "border border-border hover:bg-secondary"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-brand px-8 py-16 text-center text-primary-foreground shadow-glow">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your notes are waiting to come alive.
          </h2>
          <Link
            to="/upload"
            className="mt-7 inline-block rounded-xl bg-card px-6 py-3 text-sm font-semibold text-primary"
          >
            Upload Your Notes
          </Link>
        </div>
      </section>
    </div>
  );
}
