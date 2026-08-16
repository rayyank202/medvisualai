export type BlockAction = "study" | "chat";

export interface GraphicBlock {
  id: string;
  index: number;
  name: string;
  description: string;
  /** hex color used by both the 3D lobe tether and the 2D fallback */
  color: string;
  action: BlockAction;
}

export const GRAPHIC_BLOCKS: GraphicBlock[] = [
  {
    id: "anatomical_illustration",
    index: 1,
    name: "Anatomy",
    description: "Heart, brain, lungs & organs",
    color: "#0A4FFF",
    action: "study",
  },
  {
    id: "flowchart",
    index: 2,
    name: "Flowchart",
    description: "Stepwise pathways & cascades",
    color: "#2C7BFF",
    action: "study",
  },
  {
    id: "cycle_diagram",
    index: 3,
    name: "Cycle Diagram",
    description: "Krebs, cardiac cycle",
    color: "#00A6FF",
    action: "study",
  },
  {
    id: "drug_chart",
    index: 4,
    name: "Drug Chart",
    description: "Pharmacology tables",
    color: "#00D5FF",
    action: "study",
  },
  {
    id: "histology_slide",
    index: 5,
    name: "Histology",
    description: "Microscope tissue views",
    color: "#28E0D2",
    action: "study",
  },
  {
    id: "physiology_graph",
    index: 6,
    name: "Graph",
    description: "PV loops, ECG traces",
    color: "#10C980",
    action: "study",
  },
  {
    id: "mind_map",
    index: 7,
    name: "Mind Map",
    description: "Whole-disease overviews",
    color: "#4BD489",
    action: "study",
  },
  {
    id: "comparative_table",
    index: 8,
    name: "Comparison Table",
    description: "Crohn's vs UC, side by side",
    color: "#6FA8FF",
    action: "study",
  },
  {
    id: "decision_tree",
    index: 9,
    name: "Decision Tree",
    description: "Clinical algorithms",
    color: "#3D8BFF",
    action: "study",
  },
  {
    id: "mnemonic_graphic",
    index: 10,
    name: "Mnemonic",
    description: "Memory aids that stick",
    color: "#8FD8FF",
    action: "study",
  },
  {
    id: "timeline",
    index: 11,
    name: "Timeline",
    description: "Disease progression",
    color: "#00C2E8",
    action: "study",
  },
  {
    id: "ai_assistant",
    index: 12,
    name: "AI Assistant",
    description: "Chat, quiz & flashcards",
    color: "#10C980",
    action: "chat",
  },
];

export const PRESELECT_KEY = "medvisual_preselect";

export function preselectGraphic(id: string) {
  try {
    sessionStorage.setItem(PRESELECT_KEY, id);
  } catch {
    /* storage unavailable */
  }
}
