import { pageHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpDesk } from "@/components/HelpDesk";
import { DESK_LABEL } from "@/lib/helpdesk";

export const Route = createFileRoute("/help")({
  component: HelpPage,
  head: () =>
    pageHead({
      path: "/help",
      title: "LathosWorld Help Desk",
      description: "Questions about LathosWorld or $LWRLD? Ask the LathosWorld Help Desk or write help@lathosworld.com. Never share a seed phrase.",
    }),
});

function HelpPage() {
  return (
    <main className="gate">
      <Link className="brand" to="/">
        <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="gate-card">
        <p className="kicker desk-label">{DESK_LABEL}</p>
        <h1>Help desk</h1>
        <HelpDesk showLink={false} />
      </section>
    </main>
  );
}
