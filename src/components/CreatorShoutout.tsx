import { useState } from "react";
import { CREATORS, type Creator } from "@/lib/creators";

function Avatar({ creator }: { creator: Creator }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="creator-initial" aria-hidden="true">
        {creator.name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      className="creator-avatar"
      src={creator.avatar}
      alt=""
      width={72}
      height={72}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function CreatorShoutout() {
  return (
    <section className="creator-shoutout" aria-labelledby="creator-shoutout-title">
      <h3 id="creator-shoutout-title">Awesome creators you should be following in LathosWorld</h3>
      <div className="creator-grid">
        {CREATORS.map((creator) => (
          <article className="creator-card" key={creator.twitchLogin}>
            <Avatar creator={creator} />
            <div>
              <h4>{creator.name}</h4>
              <p>{creator.line}</p>
              <div className="creator-links">
                {creator.socials.map((social) => (
                  <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer">
                    {social.name}
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
