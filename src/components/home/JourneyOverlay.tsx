import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { GRAPHIC_BLOCKS, preselectGraphic } from "@/lib/graphic-blocks";
import { openChatWidget } from "@/components/site/ChatWidget";
import { useNavigate } from "@tanstack/react-router";

interface Props {
  progress: number;
}

function op(progress: number, a: number, b: number, fade = 0.05) {
  if (progress <= a - fade || progress >= b + fade) return 0;
  if (progress < a) return (progress - (a - fade)) / fade;
  if (progress > b) return 1 - (progress - b) / fade;
  return 1;
}

export function JourneyOverlay({ progress }: Props) {
  const navigate = useNavigate();

  return (
    <div className="pointer-events-none fixed inset-0 z-20 text-deep-foreground">
      {/* ACT 0 — hero */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center transition-opacity duration-300"
        style={{ opacity: op(progress, 0, 0.07, 0.04) }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-glow">
          AI powered medical visual learning
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight sm:text-7xl">
          MedVisual <span className="text-gradient-brand">AI</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-deep-foreground/70">
          The future of medical learning — turn your MBBS notes into living 3D visuals.
        </p>
        <div className="pointer-events-auto mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/upload"
            className="rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            Upload Your Notes
          </Link>
          <Link
            to="/study"
            className="rounded-xl border border-primary-glow/40 px-6 py-3 text-sm font-semibold backdrop-blur transition-colors hover:bg-primary/20"
          >
            Open Study Board
          </Link>
        </div>
        <div className="mt-14 flex flex-col items-center gap-1 text-xs text-deep-foreground/50">
          <span>Scroll to enter the body</span>
          <ChevronDown className="size-5 animate-pulse-chevron text-primary-glow" />
        </div>
      </div>

      {/* ACT 1 — descent (bands are disjoint so notes never overlap) */}
      <SideNote
        opacity={op(progress, 0.12, 0.18, 0.02)}
        title="Skin & fascia"
        text="Every layer of the body, understood visually."
      />
      <SideNote
        opacity={op(progress, 0.2, 0.25, 0.02)}
        title="Muscle"
        text="Fibers, origins, insertions — in motion."
        right
      />
      <SideNote
        opacity={op(progress, 0.27, 0.32, 0.02)}
        title="Skeleton"
        text="X-ray clarity, no dissection required."
      />


      {/* ACT 2 — brain */}
      <div
        className="absolute inset-x-0 top-24 px-6 text-center"
        style={{ opacity: op(progress, 0.34, 0.62) }}
      >
        <h2 className="text-2xl font-semibold sm:text-3xl">
          12 kinds of medical graphics.{" "}
          <span className="text-gradient-brand">Generated from YOUR notes.</span>
        </h2>
        <p className="mt-2 text-sm text-deep-foreground/60">
          Hover a lobe block to preview it — click to open it on your Study Board.
        </p>
      </div>

      {/* ACT 3 — pipeline stations */}
      <SideNote opacity={op(progress, 0.62, 0.68)} title="1 — You upload notes" text="PDF, DOCX, TXT or a photo." />
      <SideNote
        opacity={op(progress, 0.67, 0.73)}
        title="2 — AI reads & understands"
        text="Powered by Llama-3.3 on Groq."
        right
      />
      <SideNote
        opacity={op(progress, 0.72, 0.79)}
        title="3 — Graphics appear"
        text="Straight onto your Study Board."
      />

      {/* accessible equivalents for the 3D blocks */}
      <ul className="sr-only">
        {GRAPHIC_BLOCKS.map((b) => (
          <li key={b.id}>
            <button
              onClick={() => {
                if (b.action === "chat") {
                  openChatWidget();
                  return;
                }
                preselectGraphic(b.id);
                void navigate({ to: "/study" });
              }}
            >
              {b.name} — {b.description}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SideNote({
  opacity,
  title,
  text,
  right,
}: {
  opacity: number;
  title: string;
  text: string;
  right?: boolean;
}) {
  return (
    <div
      className={`absolute top-1/2 max-w-xs -translate-y-1/2 px-6 ${right ? "right-0 text-right" : "left-0"}`}
      style={{ opacity }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary-glow">{title}</p>
      <p className="mt-2 text-lg font-medium leading-snug">{text}</p>
    </div>
  );
}
