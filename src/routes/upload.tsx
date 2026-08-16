import { createFileRoute, Link } from "@tanstack/react-router";
import { UploadCloud, FileText, Image, Sparkles } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ChatWidget } from "@/components/site/ChatWidget";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Your Notes — MedVisual AI" },
      {
        name: "description",
        content:
          "Drop MBBS notes as PDF, DOCX, text or photos and MedVisual AI turns them into medical graphics on your Study Board.",
      },
      { property: "og:title", content: "Upload Your Notes — MedVisual AI" },
      {
        property: "og:description",
        content: "Turn lecture notes into anatomy illustrations, flowcharts and diagrams.",
      },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  return (
    <div className="min-h-screen bg-deep text-deep-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32">
        <h1 className="text-4xl font-semibold tracking-tight">Upload your notes</h1>
        <p className="mt-3 text-deep-foreground/60">
          The AI pipeline reads your material and generates the right graphic type for each concept.
        </p>

        <div className="glass-panel mt-10 flex flex-col items-center rounded-3xl px-6 py-16 text-center">
          <UploadCloud className="size-12 text-primary-glow" />
          <p className="mt-4 text-lg font-medium">Drag your notes here</p>
          <p className="mt-1 text-sm text-deep-foreground/50">PDF, DOCX, TXT or a photo of a page</p>
          <button className="mt-6 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft">
            Choose files
          </button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: FileText, label: "Documents", text: "Lecture handouts and PDFs" },
            { icon: Image, label: "Photos", text: "Snaps of handwritten pages" },
            { icon: Sparkles, label: "Auto-typing", text: "AI picks the graphic type" },
          ].map((f) => (
            <div key={f.label} className="glass-panel rounded-2xl p-5">
              <f.icon className="size-5 text-primary-glow" />
              <p className="mt-3 font-medium">{f.label}</p>
              <p className="mt-1 text-sm text-deep-foreground/55">{f.text}</p>
            </div>
          ))}
        </div>

        <Link
          to="/study"
          className="mt-10 inline-block rounded-xl border border-primary-glow/30 px-5 py-2.5 text-sm font-medium hover:bg-primary/20"
        >
          Open Study Board →
        </Link>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
