import { pageHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listSurvivors } from "@/lib/newsletter.functions";

export const Route = createFileRoute("/survivors")({
  loader: () => listSurvivors(),
  component: SurvivorsPage,
  head: () =>
    pageHead({
      path: "/survivors",
      title: "Survivors · LathosWorld",
      description: "First names and nicknames of people on The Official Shit List who asked to be on the wall. No emails.",
    }),
});

function SurvivorsPage() {
  const names = Route.useLoaderData();
  return (
    <main className="gate gate-wide">
      <Link className="brand" to="/">
        <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="section">
        <div className="wrap">
          <p className="kicker">The Official Shit List</p>
          <h1>Survivors</h1>
          <p className="serif-line">Names only. Emails stay off this page.</p>
          {names.length ? (
            <ul className="wall">
              {names.map((name, index) => (
                <li key={`${name}-${index}`}>{name}</li>
              ))}
            </ul>
          ) : (
            <p className="note">No names on the wall yet. Opt in when you join the list.</p>
          )}
          <p className="note"><Link to="/list">Join The Official Shit List</Link></p>
        </div>
      </section>
    </main>
  );
}
