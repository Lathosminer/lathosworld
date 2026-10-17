import { pageHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipBrowser } from "@/components/Clips";

export const Route = createFileRoute("/clips")({
  component: ClipsPage,
  head: () =>
    pageHead({
      path: "/clips",
      title: "Clips · LathosWorld",
      description: "Today's LathosWorld clips, the same set until midnight Central. Finished clips and videos are on YouTube.",
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
          <p className="page-jump">
            <Link to="/">Home</Link>
            <Link to="/clips">Clips</Link>
            <Link to="/community" search={{}}>Community</Link>
          </p>
          <p className="kicker">Twitch and YouTube</p>
          <h1>Clips</h1>
          <p className="serif-line">Today's clips. Everyone sees the same set until midnight Central. Comments sit under each one.</p>
          <ClipBrowser comments />
        </div>
      </section>
    </main>
  );
}
