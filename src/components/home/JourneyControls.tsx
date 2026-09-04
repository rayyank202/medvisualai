import { useEffect, useState } from "react";
import { Crosshair, Layers, RotateCcw } from "lucide-react";
import { journeyState } from "./journey-state";

/** Floating controls for the 3D journey: reset camera + cross-section view. */
export function JourneyControls({ onReset }: { onReset: () => void }) {
  const [cross, setCross] = useState(false);
  const [slice, setSlice] = useState(0);

  useEffect(() => {
    journeyState.crossSection = cross;
  }, [cross]);

  useEffect(() => {
    journeyState.slice = slice;
  }, [slice]);

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-3">
      {cross && (
        <div className="pointer-events-auto flex w-[min(90vw,26rem)] flex-col gap-2 rounded-xl border border-white/15 bg-[#061426]/85 p-3 backdrop-blur">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-white/60">
            <span>Slice depth</span>
            <span>{Math.round(((slice + 1) / 2) * 100)}%</span>
          </div>
          <input
            aria-label="Cross-section slice depth"
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={slice}
            onChange={(e) => setSlice(parseFloat(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-[#0A4FFF]"
          />
          <ul className="grid grid-cols-3 gap-2 text-[11px] text-white/75">
            <li className="rounded-lg bg-white/5 px-2 py-1.5">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#e6ab8c]" />
              Skin ~2 mm
            </li>
            <li className="rounded-lg bg-white/5 px-2 py-1.5">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#c33a3c]" />
              Muscle ~28 mm
            </li>
            <li className="rounded-lg bg-white/5 px-2 py-1.5">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#e6f2ff]" />
              Bone core
            </li>
          </ul>
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-[#061426]/85 p-1.5 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            setCross(false);
            onReset();
          }}
          className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset camera
        </button>
        <span className="h-5 w-px bg-white/15" />
        <button
          type="button"
          onClick={() => setCross((c) => !c)}
          aria-pressed={cross}
          className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
            cross ? "bg-[#0A4FFF] text-white" : "text-white/85 hover:bg-white/10"
          }`}
        >
          {cross ? <Crosshair className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
          Cross-section
        </button>
      </div>
    </div>
  );
}
