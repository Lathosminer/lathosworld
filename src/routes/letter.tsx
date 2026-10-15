import { createFileRoute, Link } from "@tanstack/react-router";
import { LetterBox } from "@/components/LetterBox";

export const Route = createFileRoute("/letter")({
  component: LetterPage,
  head: () => ({
    meta: [{ title: "The letter · lathosworld.com" }],
  }),
});

function LetterPage() {
  return (
    <main className="gate">
      <Link className="brand" to="/">
        <img src="/mark.jpg?v=v10" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="gate-card">
        <p className="kicker">lathosworld.com</p>
        <h1>The letter</h1>
        <LetterBox showLink={false} />
      </section>
    </main>
  );
}
