import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ChatWidget, openChatWidget } from "@/components/site/ChatWidget";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz & Flashcards — MedVisual AI" },
      {
        name: "description",
        content:
          "Generate MCQs, viva questions and flashcards straight from your own MBBS notes with MedVisual AI.",
      },
      { property: "og:title", content: "Quiz & Flashcards — MedVisual AI" },
      {
        property: "og:description",
        content: "Practice MCQs, viva mode and spaced-repetition flashcards from your notes.",
      },
    ],
  }),
  component: QuizPage,
});

const modes = [
  { title: "MCQ Quiz", text: "Exam-style questions with instant explanations." },
  { title: "Viva Mode", text: "Rapid-fire spoken-style prompts, like the real thing." },
  { title: "Flashcards", text: "Spaced repetition on the concepts you keep missing." },
];

function QuizPage() {
  return (
    <div className="min-h-screen bg-deep text-deep-foreground">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        <h1 className="text-4xl font-semibold tracking-tight">Quiz & flashcards</h1>
        <p className="mt-3 text-deep-foreground/60">Built from the notes you already uploaded.</p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {modes.map((m) => (
            <div key={m.title} className="glass-panel rounded-2xl p-6">
              <h2 className="text-lg font-medium">{m.title}</h2>
              <p className="mt-2 text-sm text-deep-foreground/55">{m.text}</p>
              <button
                onClick={openChatWidget}
                className="mt-5 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Start
              </button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
