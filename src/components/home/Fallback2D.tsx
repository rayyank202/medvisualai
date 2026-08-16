import { Link } from "@tanstack/react-router";
import { GRAPHIC_BLOCKS, preselectGraphic } from "@/lib/graphic-blocks";
import { openChatWidget } from "@/components/site/ChatWidget";
import { useNavigate } from "@tanstack/react-router";

const acts = [
  { title: "Through the layers", text: "Skin, muscle, skeleton — every layer of the body, understood visually." },
  { title: "Into the brain", text: "12 kinds of medical graphics, generated from YOUR notes." },
  { title: "Through the bloodstream", text: "Upload notes → AI reads them → graphics land on your Study Board." },
];

/** Scroll-faded 2D telling of the same story, for reduced-motion or no-WebGL. */
export function Fallback2D() {
  const navigate = useNavigate();

  return (
    <div className="bg-deep text-deep-foreground">
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-glow">
          AI powered medical visual learning
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-7xl">
          MedVisual <span className="text-gradient-brand">AI</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-deep-foreground/70">
          The future of medical learning — turn your MBBS notes into living visuals.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/upload"
            className="rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Upload Your Notes
          </Link>
          <Link to="/study" className="rounded-xl border border-primary-glow/40 px-6 py-3 text-sm font-semibold">
            Open Study Board
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-16 px-6 py-20">
        {acts.map((a) => (
          <div key={a.title} className="glass-panel rounded-3xl p-8">
            <h2 className="text-2xl font-semibold">{a.title}</h2>
            <p className="mt-2 text-deep-foreground/65">{a.text}</p>
          </div>
        ))}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GRAPHIC_BLOCKS.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                if (b.action === "chat") {
                  openChatWidget();
                  return;
                }
                preselectGraphic(b.id);
                void navigate({ to: "/study" });
              }}
              className="glass-panel rounded-2xl p-5 text-left transition-transform hover:-translate-y-1"
            >
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: b.color, boxShadow: `0 0 12px ${b.color}` }}
              />
              <p className="mt-2 font-medium">{b.name}</p>
              <p className="text-sm text-deep-foreground/55">{b.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
