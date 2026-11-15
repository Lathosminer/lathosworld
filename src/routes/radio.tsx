import { pageHead } from "@/lib/seo";
import { RadioDeck } from "@/components/RadioPlayer";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/radio")({
  component: RadioPage,
  head: () =>
    pageHead({
      path: "/radio",
      title: "LathosWorld Radio",
      description: "LathosWorld Radio, live. LathosWorld and Lexi Storm.",
    }),
});

function RadioPage() {
  return (
    <main className="gate gate-wide radio-page">
      <Link className="brand" to="/">
        <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="section">
        <div className="wrap radio-page-wrap">
          <RadioDeck placement="page" />
        </div>
      </section>
    </main>
  );
}
