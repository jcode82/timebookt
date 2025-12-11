import { highlightCards } from "@/features/home/utils/content";

export function HighlightsGrid() {
  return (
    <section className="grid gap-6 md:grid-cols-3">
      {highlightCards.map((card) => (
        <article
          key={card.title}
          className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{card.description}</p>
        </article>
      ))}
    </section>
  );
}
