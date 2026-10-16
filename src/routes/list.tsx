import { createFileRoute, Link } from "@tanstack/react-router";
import { LetterBox } from "@/components/LetterBox";

export const Route = createFileRoute("/list")({
  component: ListPage,
  head: () => ({
    meta: [{ title: "The list · lathosworld.com" }],
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
        <h1>The list</h1>
        <LetterBox showLink={false} />
      </section>
    </main>
  );
}
