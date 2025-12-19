import LandingPage from "@/components/LandingPage";
import { HeroSection } from "@/features/home/components/HeroSection";
import { HighlightsGrid } from "@/features/home/components/HighlightsGrid";
import { AgentHooksShowcase } from "@/features/home/components/AgentHooksShowcase";
import { RegionReplicator } from "@/features/home/components/RegionReplicator";
import { getHeroMetrics } from "@/features/home/api/getHeroMetrics";

export default async function HomePage() {
  const mode = process.env.NEXT_PUBLIC_TIMEBOOKT_MODE ?? "landing";

  if (mode !== "app") {
    return <LandingPage />;
  }

  const metrics = await getHeroMetrics();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12">
      <HeroSection metrics={metrics} />
      <HighlightsGrid />
      <AgentHooksShowcase />
      <RegionReplicator />
    </div>
  );
}
