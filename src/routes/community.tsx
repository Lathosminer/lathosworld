import { pageHead } from "@/lib/seo";
import { isUuid } from "@/lib/discussion";
import { CommunityBoard } from "@/components/Talk";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/community")({
  validateSearch: (search: Record<string, unknown>): { thread?: string } => {
    const thread = typeof search.thread === "string" ? search.thread.trim() : "";
    return isUuid(thread) ? { thread } : {};
  },
  component: CommunityPage,
  head: () =>
    pageHead({
      path: "/community",
      title: "Community · LathosWorld",
      description: "Talk with other LathosWorld fans. Threads, replies, and a place to hang out. Sign in to post.",
    }),
});

function CommunityPage() {
  const { thread } = Route.useSearch();
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
          <p className="kicker">Fans</p>
          <h1>Community</h1>
          <p className="serif-line">Threads and replies. Anyone can read. Sign in to post.</p>
          <CommunityBoard threadId={thread} />
        </div>
      </section>
    </main>
  );
}
