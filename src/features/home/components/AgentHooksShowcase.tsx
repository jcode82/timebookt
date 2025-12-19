import { agentTouchpoints } from "@/features/home/utils/content";

export function AgentHooksShowcase() {
  return (
    <section className="rounded-3xl border border-indigo-200 bg-indigo-50/60 p-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-indigo-900">
          Agent hooks ship with clear IO contracts
        </h2>
        <p className="text-sm text-indigo-800">
          Each domain exposes hooks so orchestrators can perform deterministic
          actions without touching UI components.
        </p>
      </div>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {agentTouchpoints.map((touchpoint) => (
          <li
            key={touchpoint}
            className="rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-medium text-indigo-900"
          >
            {touchpoint}
          </li>
        ))}
      </ul>
    </section>
  );
}
