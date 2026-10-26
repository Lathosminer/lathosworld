import { useEffect, useState } from "react";
import { hasCommunity, type CommunityPayload } from "@/lib/community";
import { previewPathPrefix } from "@/lib/preview-path-prefix";
import { SOCIALS } from "@/lib/socials";

function communityUrl(): string {
  if (typeof window === "undefined") return "/api/community";
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname);
  return `${prefix ?? ""}/api/community`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function socialHref(name: (typeof SOCIALS)[number]["name"]): string {
  const row = SOCIALS.find((item) => item.name === name);
  return row ? row.href : "https://lathosworld.com";
}

const STATS = [
  { key: "twitch", label: "Twitch", noun: "followers", href: socialHref("Twitch") },
  { key: "youtube", label: "YouTube", noun: "subscribers", href: socialHref("YouTube") },
  { key: "x", label: "X", noun: "followers", href: socialHref("X") },
  { key: "tiktok", label: "TikTok", noun: "followers", href: socialHref("TikTok") },
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
          <div className="community-stats">
            {stats.map((stat) => (
              <a
                key={stat.key}
                className="community-stat"
                href={stat.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                <span className="community-label">{stat.label}</span>
                <span className="community-count">{formatCount(stat.value)}</span>
                <span className="community-noun">{stat.noun}</span>
              </a>
            ))}
          </div>
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
