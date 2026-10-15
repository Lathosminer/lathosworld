import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpDesk } from "@/components/HelpDesk";

export const Route = createFileRoute("/help")({
  component: HelpPage,
  head: () => ({
    meta: [{ title: "lathosworld.comhelpdesk" }],
  }),
});

function HelpPage() {
  return (
    <main className="gate">
      <Link className="brand" to="/">
        <img src="/mark.jpg?v=v10" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="gate-card">
        <p className="kicker desk-label">lathosworld.comhelpdesk</p>
        <h1>Help desk</h1>
        <HelpDesk showLink={false} />
      </section>
    </main>
  );
}
