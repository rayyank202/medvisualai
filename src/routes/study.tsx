import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ChatWidget } from "@/components/site/ChatWidget";
import { GRAPHIC_BLOCKS, PRESELECT_KEY } from "@/lib/graphic-blocks";

export const Route = createFileRoute("/study")({
  head: () => ({
    meta: [
      { title: "Study Board — MedVisual AI" },
      {
        name: "description",
        content:
          "An interactive canvas of AI-generated medical graphics: anatomy, flowcharts, histology, timelines and more.",
      },
      { property: "og:title", content: "Study Board — MedVisual AI" },
      {
        property: "og:description",
        content: "Arrange your generated medical graphics on one interactive board.",
      },
    ],
  }),
  component: StudyPage,
});

function StudyPage() {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSelected(sessionStorage.getItem(PRESELECT_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="min-h-screen bg-deep text-deep-foreground">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        <h1 className="text-4xl font-semibold tracking-tight">Study Board</h1>
        <p className="mt-3 text-deep-foreground/60">
          Every graphic type generated from your notes, ready to arrange and revise.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GRAPHIC_BLOCKS.map((b) => (
            <article
              key={b.id}
              className={`glass-panel rounded-2xl p-5 transition-transform hover:-translate-y-1 ${
                selected === b.id ? "ring-2 ring-ring" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: b.color, boxShadow: `0 0 14px ${b.color}` }}
                />
                <h2 className="font-medium">{b.name}</h2>
              </div>
              <p className="mt-2 text-sm text-deep-foreground/55">{b.description}</p>
              {selected === b.id && (
                <p className="mt-3 text-xs font-medium text-primary-glow">Selected from the brain map</p>
              )}
            </article>
          ))}
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
