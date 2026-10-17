import { useEffect, useState } from "react";
import { hasCommunity, type CommunityPayload } from "@/lib/community";
import { previewPathPrefix } from "@/lib/preview-path-prefix";

function communityUrl(): string {
  if (typeof window === "undefined") return "/api/community";
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname);
  return `${prefix ?? ""}/api/community`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

const STATS = [
  { key: "twitch", label: "Twitch", noun: "followers" },
  { key: "youtube", label: "YouTube", noun: "subscribers" },
  { key: "x", label: "X", noun: "followers" },
] as const;

export function CommunityStats() {
  const [data, setData] = useState<CommunityPayload | null>(null);

  useEffect(() => {
    let dead = false;
    fetch(communityUrl())
      .then((res) => (res.ok ? res.json() : null))
      .then((body: CommunityPayload | null) => {
        if (!dead) setData(body);
      })
      .catch(() => {
        if (!dead) setData(null);
      });
    return () => {
      dead = true;
    };
  }, []);

  if (!hasCommunity(data) || !data) return null;

  const stats = STATS.flatMap((stat) => {
    const value = data[stat.key];
    return typeof value === "number" && Number.isFinite(value) ? [{ ...stat, value }] : [];
  });
  const recent = Array.isArray(data.recent)
    ? data.recent.filter((person) => person && typeof person.name === "string" && person.name.trim())
    : [];

  return (
    <section className="section community" id="community" aria-label="Community">
      <div className="wrap">
        <div className="banner">
          <p className="kicker">Community</p>
          <h2>Who is here</h2>
        </div>
        {stats.length ? (
          <dl className="community-stats">
            {stats.map((stat) => (
              <div key={stat.key} className="community-stat">
                <dt>{stat.label}</dt>
                <dd>{formatCount(stat.value)}</dd>
                <span>{stat.noun}</span>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {recent.length ? (
        <>
          <ul className="visually-hidden">
            {recent.map((person, index) => (
              <li key={`${person.name}-${person.followedAt}-${index}`}>{person.name} followed on Twitch</li>
            ))}
          </ul>
          <div className="ticker" aria-hidden="true">
            <div className="ticker-track">
              {[0, 1].map((copy) => (
                <div key={copy} className={copy === 1 ? "ticker-set ticker-copy" : "ticker-set"}>
                  {recent.map((person, index) => (
                    <span key={`${copy}-${person.name}-${person.followedAt}-${index}`}>
                      <b>{person.name}</b> followed
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
