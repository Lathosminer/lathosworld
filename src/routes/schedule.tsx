import { pageHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { WEEK } from "@/lib/schedule";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
  head: () =>
    pageHead({
      path: "/schedule",
      title: "Stream schedule · LathosWorld",
      description: "The LathosWorld week on Twitch and YouTube. I stream what I want when I can.",
    }),
});

function SchedulePage() {
  return (
    <main className="gate gate-wide">
      <Link className="brand" to="/">
        <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="section">
        <div className="wrap">
          <p className="kicker">Twitch and YouTube</p>
          <h1>Schedule</h1>
          <p className="serif-line">I stream what I want when I can. This is not a promise of a start time.</p>
          <table className="week">
            <thead>
              <tr>
                <th>Day</th>
                <th>Twitch</th>
                <th>YouTube</th>
              </tr>
            </thead>
            <tbody>
              {WEEK.map((row) => (
                <tr key={row.day}>
                  <th scope="row">{row.day}</th>
                  <td>{row.twitch}</td>
                  <td>{row.youtube}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note">
            <a href="https://www.twitch.tv/lathosworld" target="_blank" rel="noopener noreferrer">Twitch</a>
            {" · "}
            <a href="https://www.youtube.com/@lathos563" target="_blank" rel="noopener noreferrer">YouTube</a>
            {" · "}
            <a href="https://www.tiktok.com/@lathos.world" target="_blank" rel="noopener noreferrer">TikTok</a>
          </p>
        </div>
      </section>
    </main>
  );
}
