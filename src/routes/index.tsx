import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ChatWidget } from "@/components/site/ChatWidget";
import { JourneyOverlay } from "@/components/home/JourneyOverlay";
import { SurfaceSections } from "@/components/home/SurfaceSections";
import { Fallback2D } from "@/components/home/Fallback2D";
import { JourneyControls } from "@/components/home/JourneyControls";
import { journeyState, clamp01 } from "@/components/home/journey-state";

const Journey3D = lazy(() => import("@/components/home/Journey3D"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedVisual AI — MBBS Notes Into Living 3D Medical Visuals" },
      {
        name: "description",
        content:
          "Scroll through the human body and explore 12 AI-generated medical graphic types built from your own MBBS notes — anatomy, flowcharts, histology, quizzes and more.",
      },
      { property: "og:title", content: "MedVisual AI — MBBS Notes Into Living 3D Medical Visuals" },
      {
        property: "og:description",
        content:
          "An immersive 3D journey through skin, muscle, bone and brain — every lobe opens a different AI-generated study graphic.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Mode = "loading" | "3d" | "fallback";

function Home() {
  const [mode, setMode] = useState<Mode>("loading");
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webgl = false;
    }
    setMode(reduced || !webgl ? "fallback" : "3d");
  }, []);

  useEffect(() => {
    if (mode !== "3d") return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = sectionRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const p = clamp01((window.scrollY - el.offsetTop) / Math.max(1, total));
      journeyState.progress = p;
      setProgress(p);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onPointer = (e: PointerEvent) => {
      journeyState.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      journeyState.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [mode]);

  const inJourney = progress < 0.999;

  return (
    <div className="bg-background">
      <Navbar />

      {mode === "fallback" ? (
        <Fallback2D />
      ) : (
        <div ref={sectionRef} className="relative h-[620vh] bg-[#03101f]">
          <div className="sticky top-0 h-screen overflow-hidden">
            {mode === "3d" && (
              <Suspense fallback={null}>
                <Journey3D />
              </Suspense>
            )}
            {/* exit-to-light wash */}
            <div
              className="pointer-events-none absolute inset-0 bg-background"
              style={{ opacity: Math.max(0, (progress - 0.9) / 0.1) }}
            />
          </div>
          {inJourney && <JourneyOverlay progress={progress} />}
          <div className="pointer-events-none sticky bottom-0 z-30 h-0">
            <div className="pointer-events-none relative -top-[100vh] h-screen">
              <JourneyControls
                onReset={() => {
                  const el = sectionRef.current;
                  if (!el) return;
                  window.scrollTo({ top: el.offsetTop + 4, behavior: "smooth" });
                }}
              />
            </div>
          </div>
        </div>
      )}

      <SurfaceSections />
      <Footer />
      <ChatWidget />
    </div>
  );
}
