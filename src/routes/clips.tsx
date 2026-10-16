import { pageHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipBrowser } from "@/components/Clips";

export const Route = createFileRoute("/clips")({
  component: ClipsPage,
  head: () =>
    pageHead({
      path: "/clips",
      title: "Clips · LathosWorld",
      description: "LathosWorld clips from Twitch and YouTube. Filter by game. the_demon_hunter3 clips stay first.",
    }),
});

function ClipsPage() {
  return (
    <main className="gate gate-wide">
      <Link className="brand" to="/">
        <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="section">
        <div className="wrap">
          <p className="kicker">Twitch and YouTube</p>
          <h1>Clips</h1>
          <p className="serif-line">Filter by game. The featured clips stay first.</p>
          <ClipBrowser filters />
        </div>
      </section>
    </main>
  );
}
