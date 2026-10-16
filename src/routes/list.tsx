import { pageHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LetterBox } from "@/components/LetterBox";

export const Route = createFileRoute("/list")({
  component: ListPage,
  head: () =>
    pageHead({
      path: "/list",
      title: "The Official Shit List · LathosWorld",
      description: "Join The Official Shit List from LathosWorld. It only points at the doors: Twitch, YouTube, X, Discord and more. A follow is the only ask.",
    }),
});

function ListPage() {
  return (
    <main className="gate">
      <Link className="brand" to="/">
        <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="gate-card">
        <p className="kicker">lathosworld.com</p>
        <h1>The Official Shit List</h1>
        <LetterBox showLink={false} />
      </section>
    </main>
  );
}
