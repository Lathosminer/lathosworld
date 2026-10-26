import { pageHead } from "@/lib/seo";
import { LexiGuest } from "@/components/LexiGuest";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/lexi")({
  component: LexiPage,
  head: () =>
    pageHead({
      path: "/lexi",
      title: "Lexi Storm · AI singer · LathosWorld",
      description:
        "Lexi Storm is a special guest on LathosWorld. She is an adult AI singer and character, a PS5 fangirl, and a cosplayer. Released singles, and albums coming soon.",
    }),
});

function LexiPage() {
  return (
    <main className="lexi-page">
      <div className="lexi-bar">
        <Link className="brand" to="/">
          <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
          <span>lathosworld.com</span>
        </Link>
        <p className="page-jump">
          <Link to="/">Home</Link>
          <Link to="/clips">Clips</Link>
          <Link to="/community" search={{}}>Community</Link>
        </p>
      </div>
      <LexiGuest variant="page" />
    </main>
  );
}
