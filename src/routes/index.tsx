import { twitchLive } from "@/lib/twitch-live.functions";
import { pageHead } from "@/lib/seo";
import { youtubeLive } from "@/lib/youtube-live.functions";
import { Clips } from "@/components/Clips";
import EmblemArc from "@/components/EmblemArc";
import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TrustConnect } from "@/components/TrustConnect";
import { AccountBadge } from "@/components/AccountBadge";
import { MiniSword } from "@/components/MiniSword";
import { HeroLoop } from "@/components/HeroLoop";
import { SurvivorEgg } from "@/components/SurvivorEgg";
import { CommunityStats } from "@/components/CommunityStats";
import { PollWidget } from "@/components/Poll";
import { DESK_LABEL } from "@/lib/helpdesk";

const MARK_SM = "/mark-sm.webp";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => {
    const h = pageHead({
      path: "/",
      title: "LathosWorld · Gamer, streamer and $LWRLD",
      description: "Lathos streams Once Human and more on Twitch and YouTube. Clips, the $LWRLD token on Flap, The Official Shit List and the help desk.",
    });
    return { ...h, links: [...h.links, { rel: "preload", as: "image", href: "/hero-poster.jpg", fetchPriority: "high" }] };
  },
});

const CA = "0x3899ebf76c768c156df3073031a4518c5f947777";
const FLAP = `https://flap.sh/bnb/${CA}`;
const SCAN = `https://bscscan.com/token/${CA}`;
const PAPER = "https://github.com/Lathosminer/LWRLD";

const FACTS = [
  { label: "Ticker", value: "$LWRLD" },
  { label: "Name", value: "LathosWorld" },
  { label: "Chain", value: "BNB Smart Chain" },
  { label: "Launch", value: "Flap.sh tax token" },
  { label: "Supply", value: "1,000,000,000" },
  { label: "Buy tax", value: "4%" },
  { label: "Sell tax", value: "4%" },
  { label: "Tax split", value: "85% liquidity · 10% fund · 5% burn" },
] as const;

const SOCIALS = [
  { name: "Twitch", handle: "lathosworld", href: "https://www.twitch.tv/lathosworld", hint: "Live", icon: "twitch" },
  { name: "YouTube", handle: "@lathos563", href: "https://www.youtube.com/@lathos563", hint: "Watch", icon: "youtube" },
  { name: "TikTok", handle: "@lathos.world", href: "https://www.tiktok.com/@lathos.world", hint: "Clips", icon: "tiktok" },
  { name: "X", handle: "@lathos563", href: "https://x.com/lathos563", hint: "Talk", icon: "x" },
  { name: "Discord", handle: "The lobby", href: "https://discord.gg/749tHdsFU6", hint: "Join", icon: "discord" },
  { name: "Instagram", handle: "@lathosworld", href: "https://www.instagram.com/lathosworld", hint: "Photos", icon: "instagram" },
  { name: "Telegram", handle: "Official updates", href: "https://t.me/LathosWorldOfficial", hint: "Updates", icon: "telegram" },
] as const;

const OFFERS = [
  {
    name: "Cash App",
    handle: "Get $5 when you send $5+.",
    hint: "Code W98XF7L",
    href: "https://cash.app/refer/W98XF7L",
  },
] as const;

const SHOP = "https://lathosworld-shop.fourthwall.com/collections/all";

const SITE_LINKS = [
  { name: "Clips", handle: "Twitch and YouTube", hint: "Watch", to: "/clips" },
  { name: "Schedule", handle: "The week", hint: "Week", to: "/schedule" },
  { name: "Survivors", handle: "Names on the wall", hint: "Names", to: "/survivors" },
  { name: "The Official Shit List", handle: "A follow is the only ask", hint: "Join", to: "/list" },
  { name: "Help desk", handle: "Never a seed phrase", hint: "Ask", to: "/help" },
] as const;

const CRYPTO_LINKS = [
  { name: "Flap", handle: "Get $LWRLD", hint: "Buy", href: FLAP },
  { name: "BscScan", handle: "Contract ends in 7777", hint: "Verify", href: SCAN },
  { name: OFFERS[0].name, handle: OFFERS[0].handle, hint: OFFERS[0].hint, href: OFFERS[0].href },
  { name: "LWRLD paper", handle: "Whitepaper", hint: "Read", href: PAPER },
] as const;

function TwitchEmbed() {
  const [parent, setParent] = useState("");
  const [on, setOn] = useState(false);
  const [live, setLive] = useState<{ live: boolean; title: string; preview: string | null }>({ live: false, title: "", preview: null });
  useEffect(() => {
    setParent(window.location.hostname);
    twitchLive().then(setLive).catch(() => {});
  }, []);
  // Bust the CDN cache on the live preview so the cover is current.
  const poster = live.preview ? `${live.preview}?t=${Math.floor(Date.now() / 60000)}` : "/stream/blade-1080.webp";
  return (
    <div className="twitch">
      {on && parent ? (
        <iframe
          className="twitch-frame"
          src={`https://player.twitch.tv/?channel=lathosworld&parent=${encodeURIComponent(parent)}&autoplay=true&muted=false`}
          title="lathosworld on Twitch"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      ) : (
        <button type="button" className="twitch-frame stream-facade" onClick={() => setOn(true)} aria-label={live.live ? `Watch lathosworld live on Twitch: ${live.title}` : "Play lathosworld on Twitch"}>
          <img src={poster} alt="" width={640} height={360} decoding="async" fetchPriority="low" />
          {live.live ? <span className="live-badge">● Live</span> : null}
          <span className="clip-play" aria-hidden="true">▶</span>
          <span className="stream-facade-label">{live.live ? live.title || "Live on Twitch" : "Twitch · lathosworld"}</span>
        </button>
      )}
    </div>
  );
}

function YouTubeEmbed() {
  const [on, setOn] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () => youtubeLive().then((r) => alive && setLiveId(r.id)).catch(() => {});
    check();
    const t = window.setInterval(check, 90_000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);
  if (liveId && !on) {
    return (
      <div className="youtube">
        <p className="yt-live-badge"><span aria-hidden="true">●</span> Live on YouTube now</p>
        <button type="button" className="youtube-frame clip-facade" onClick={() => setOn(true)} aria-label="Watch LathosWorld live on YouTube">
          <img src={`https://i.ytimg.com/vi/${liveId}/hqdefault_live.jpg`} alt="LathosWorld live on YouTube" loading="lazy" decoding="async" width={480} height={360} />
          <span className="live-badge">● Live</span>
          <span className="clip-play" aria-hidden="true">▶</span>
        </button>
      </div>
    );
  }
  if (liveId) {
    return (
      <div className="youtube">
        <p className="yt-live-badge"><span aria-hidden="true">●</span> Live on YouTube now</p>
        <iframe
          className="youtube-frame"
          src={`https://www.youtube-nocookie.com/embed/${liveId}?autoplay=1`}
          title="LathosWorld live on YouTube"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div className="youtube">
      {on ? (
        <iframe
          className="youtube-frame"
          src="https://www.youtube-nocookie.com/embed/videoseries?list=UUcV1q2gBovKyWlU8SnCI3ww&autoplay=1"
          title="LathosWorld on YouTube"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button type="button" className="youtube-frame clip-facade" onClick={() => setOn(true)} aria-label="Play the latest LathosWorld videos on YouTube">
          <img src="https://i.ytimg.com/vi/uVXvTdaZFpo/hqdefault.jpg" alt="LathosWorld on YouTube" loading="lazy" decoding="async" width={480} height={360} />
          <span className="clip-play" aria-hidden="true">▶</span>
        </button>
      )}
    </div>
  );
}

function SwordRule() {
  return (
    <div className="sword-rule" aria-hidden="true">
      <span />
      <img src="/sword-mini-still.png" alt="" />
      <span />
    </div>
  );
}

function Home() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copyCa = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(CA);
      } else {
        const ta = document.createElement("textarea");
        ta.value = CA;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the address stays visible on the page to copy by hand */
    }
  };
  return (
    <>
      <a className="skip" href="#token">Skip to token</a>
      <header className="nav">
        <a className="brand" href="#top">
          <img src={MARK_SM} width={40} height={40} alt="" decoding="async" />
          <span>lathosworld.com</span>
        </a>
        <nav className="nav-links" aria-label="Sections">
          <a href="#streams">Streams</a>
          <Link to="/clips">Clips</Link>
          <Link to="/community" search={{}}>Community</Link>
          <a href={SHOP} target="_blank" rel="noopener">MERCH / Shop</a>
          <a className="btn btn-cyan nav-buy" href={FLAP} target="_blank" rel="noopener noreferrer"><MiniSword />Get $LWRLD</a>
        </nav>
        <AccountBadge inNav />
      </header>
      <main id="top">
        <HeroLoop />
        <section className="blade" aria-label="The blade">
          <img src="/blade-1920.webp" srcSet="/blade-960.webp 960w, /blade-1920.webp 1920w, /blade-3840.webp 3840w" sizes="100vw" width={3840} height={2160} alt="The LathosWorld blade" loading="lazy" decoding="async" />
          <a href="/blade-4k.png" download="lathosworld-blade-4k.png">Save the 4K blade</a>
          <nav className="blade-links" aria-label="Stream plates">
            <a href="/stream/blade-1080.png" download="lathosworld-blade-1080.png">1080 blade</a>
            <a href="/stream/starting-soon-4k.png" download="starting-soon-4k.png">Starting soon</a>
            <a href="/stream/be-right-back-4k.png" download="be-right-back-4k.png">Be right back</a>
            <a href="/stream/ending-4k.png" download="ending-4k.png">Ending</a>
            <a href="/stream/offline-4k.png" download="offline-4k.png">Offline</a>
            <a href="/stream/starting-soon-1080.png" download="starting-soon-1080.png">1080 starting</a>
            <a href="/stream/be-right-back-1080.png" download="be-right-back-1080.png">1080 brb</a>
            <a href="/stream/ending-1080.png" download="ending-1080.png">1080 ending</a>
            <a href="/stream/offline-1080.png" download="offline-1080.png">1080 offline</a>
          </nav>
        </section>
        <h1 className="visually-hidden">LathosWorld</h1>
        <section className="hero" aria-label="Story">
          <div className="hero-copy">
            <p className="sell-line">I am a gamer and a streamer.</p>
            <p className="lede">I love technology, and $LWRLD is a passion project I am building for my own good time. Anyone can join by buying $LWRLD. This is not about raising money. This is a community that I am personally building one person at a time.</p>
            <p className="lede">I will never ask you for anything but a follow.</p>
          </div>
        </section>
        <SwordRule />
        <section className="section" id="streams">
          <TwitchEmbed />
          <div className="wrap">
            <div className="banner">
              <h2>Streams</h2>
            </div>
            <p className="serif-line">I stream what I want when I can. My streams are chill. This is not a promise of a start time.</p>
            <p className="note"><Link to="/schedule">The week</Link></p>
            <p className="team-line">I love Grok Bot and Grok ⚡</p>
            <blockquote className="motto">
              <p>“A LathosWorld inhabitant is neither late, nor is he early. He arrives precisely when he means to.”</p>
            </blockquote>
            <YouTubeEmbed />
          </div>
        </section>
        <CommunityStats />
        <PollWidget />
        <SwordRule />
        <Clips />
        <SwordRule />
        <section className="section emblem" aria-label="Lathos' World emblem">
          <div className="gif-lightning emblem-frame">
            <video
              className="emblem-video"
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              poster="/lathosworld-emblem-v9-poster.jpg"
              width={600}
              height={600}
              aria-label="Lathos' World"
            >
              <source src="/lathosworld-emblem-v9.webm" type="video/webm" />
              <source src="/lathosworld-emblem-v9.mp4" type="video/mp4" />
              <img src="/lathosworld-emblem-v9.gif" alt="Lathos' World" loading="lazy" width={600} height={600} />
            </video>
            <EmblemArc />
          </div>
        </section>
        <section className="section" id="buy" aria-labelledby="lwrld-title">
          <div className="wrap">
            <div className="banner">
              <p className="kicker">BNB Smart Chain</p>
              <h2 id="lwrld-title">$LWRLD</h2>
            </div>
            <p className="serif-line">LathosWorld. A Flap tax token.</p>
            <div className="banner">
              <p className="kicker">Three steps</p>
              <h3 className="h2-like">How to get it</h3>
            </div>
            <ol className="steps">
              <li><strong>1 · BNB</strong><span>Put BNB in a wallet that can reach BNB Smart Chain.</span></li>
              <li><strong>2 · Flap</strong><span>Open the official Flap page. The address ends in 7777.</span></li>
              <li><strong>3 · Trade</strong><span>Swap there. The 4% tax is part of the token, not a hidden fee.</span></li>
            </ol>
            <div className="cta-row">
              <a className="btn btn-cyan btn-buy" href={FLAP} target="_blank" rel="noopener noreferrer"><MiniSword />Open Flap and get $LWRLD</a>
            </div>
          </div>
        </section>
        <SwordRule />
        <section className="section" id="token">
          <div className="wrap">
            <div className="banner">
              <p className="kicker">$LWRLD</p>
              <h2>Contract</h2>
            </div>
            <div className="panel">
              <dl className="facts">
                {FACTS.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="ca-row">
                <code>{CA}</code>
                <button className="btn btn-ghost" type="button" onClick={copyCa}>{copied ? "Copied" : "Copy contract"}</button>
                <a className="btn btn-ghost" href={SCAN} target="_blank" rel="noopener noreferrer">BscScan</a>
              </div>
              <p className="note">
                Contract ends in 7777. A different address is not this token. Intended for certain audiences only. Not financial advice. Not a promise of price. Never risk more than you can afford to lose. Crypto is volatile.
              </p>
              <TrustConnect />
              <div className="cta-row">
                <a className="btn btn-cyan btn-buy" href={FLAP} target="_blank" rel="noopener noreferrer"><MiniSword />Get $LWRLD on Flap</a>
                <a className="btn btn-ghost" href={PAPER} target="_blank" rel="noopener noreferrer">Read the paper</a>
              </div>
            </div>
          </div>
        </section>
        <SwordRule />
        <section className="section" id="offers" aria-label="Crypto offers">
          <div className="wrap">
            <div className="banner">
              <p className="kicker">Offers</p>
              <h2>Crypto offers</h2>
            </div>
            <div className="socials offers">
              {OFFERS.map((offer) => (
                <a key={offer.name} className="social" href={offer.href} target="_blank" rel="noopener noreferrer">
                  <span>
                    <strong>{offer.name}</strong>
                    <em>{offer.handle}</em>
                  </span>
                  <b>{offer.hint}</b>
                </a>
              ))}
            </div>
          </div>
        </section>
        <SwordRule />
        <section className="section" id="roadmap">
          <div className="wrap">
            <div className="banner">
              <p className="kicker">Later</p>
              <h2>Roadmap</h2>
            </div>
            <p className="serif-line">Goals. Not live.</p>
            <div className="panel">
              <p className="note">
                $LWRLD on Flap is the token now. Using its proceeds to launch a later token is a roadmap goal. That token does not exist yet. Buying $LWRLD does not send the later token. The only contract is the one that ends in 7777.
              </p>
              <p className="note">
                A share, not a payment. The goal is that every holder of the contract that ends in 7777 gets a share of the later token. The percent is not set. No contract pays it yet.
              </p>
              <p className="note">
                Bitcoin. That later token is meant to be backed by BTC. No Bitcoin is held for it yet. $LWRLD is not redeemable for BTC.
              </p>
              <p className="note">
                The tax fund and future merch sales go back into the coin. 100 percent of that. None of that is taken out. The merch shop is coming soon.
              </p>
              <p className="note">
                Never risk more than you can afford to lose. Crypto is volatile. Not financial advice. Not a promise of price.
              </p>
            </div>
          </div>
        </section>
        <SwordRule />
        <section className="section" id="socials">
          <div className="wrap">
            <div className="banner">
              <p className="kicker">Links</p>
              <h2>Where it lives</h2>
            </div>
            <p className="serif-line">The links are optional. Follow if you want.</p>
            <div className="socials">
              {SOCIALS.map((door) => (
                <a key={door.name} className="social" href={door.href} target="_blank" rel="noopener noreferrer">
                  <span className="social-lead"><Mark name={door.icon} /></span>
                  <span>
                    <strong>{door.name}</strong>
                    <em>{door.handle}</em>
                  </span>
                  <b>{door.hint}</b>
                </a>
              ))}
              {SITE_LINKS.map((page) => (
                <Link key={page.name} className="social" to={page.to}>
                  <span className="social-lead" aria-hidden="true" />
                  <span>
                    <strong>{page.name}</strong>
                    <em>{page.handle}</em>
                  </span>
                  <b>{page.hint}</b>
                </Link>
              ))}
              <a className="social card-wide" href={SHOP} target="_blank" rel="noopener">
                <span className="social-lead"><Mark name="merch" /></span>
                <span>
                  <strong>MERCH / Shop</strong>
                  <em>LathosWorld Shop</em>
                </span>
                <b>Shop</b>
              </a>
              {CRYPTO_LINKS.map((door) => (
                <a key={door.name} className="social" href={door.href} target="_blank" rel="noopener noreferrer">
                  <span className="social-lead" aria-hidden="true" />
                  <span>
                    <strong>{door.name}</strong>
                    <em>{door.handle}</em>
                  </span>
                  <b>{door.hint}</b>
                </a>
              ))}
            </div>
          </div>
        </section>
        <SwordRule />
        <section className="clip" id="clip" aria-label="LathosWorld">
          <video controls playsInline loop preload="metadata" poster="/mark-1280.webp" width={1280} height={720}>
            <source src="/lathosworld.mp4" type="video/mp4" />
            <img className="gif-lightning-img" src="/lathosworld.gif" alt="LathosWorld" loading="lazy" />
          </video>
          <a href="/lathosworld.mp4" download="lathosworld.mp4">Save the video</a>
        </section>
        <SwordRule />
        <section className="section" id="list">
          <div className="wrap">
            <div className="banner">
              <p className="kicker">lathosworld.com</p>
              <h2>The Official Shit List</h2>
            </div>
            <p className="serif-line">The Official Shit List only points at the doors. I will never ask you for anything but a follow.</p>
            <div className="cta-row">
              <Link className="btn btn-ghost" to="/list">Join the list</Link>
            </div>
          </div>
        </section>
        <SwordRule />
        <section className="section" id="help">
          <div className="wrap">
            <div className="banner">
              <p className="kicker desk-label">{DESK_LABEL}</p>
              <h2>Help desk</h2>
            </div>
            <p className="serif-line">Ask here. The desk never asks for a seed phrase.</p>
            <div className="cta-row">
              <Link className="btn btn-ghost" to="/help">Open the help desk</Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap">
          <p className="way">Not financial advice.</p>
          <p className="thanks">I would like to thank Bubahmon, Demon Hunter, and Cyclops for their awesome support. Thanks for reading my story. I hope to see you all soon. God bless and goodnight.</p>
          <p className="copy">$LWRLD on Flap. BNB Smart Chain.</p>
          <p className="copy"><Link to="/schedule">Schedule</Link> · <Link to="/clips">Clips</Link> · <Link to="/community" search={{}}>Community</Link> · <Link to="/survivors">Survivors</Link> · <Link to="/list">The Official Shit List</Link> · <Link to="/help">{DESK_LABEL}</Link></p>
          <p className="copy">© 2026 lathosworld.com</p>
        </div>
      </footer>
      <div className="buy-bar">
        <p>$LWRLD · contract ends in 7777</p>
        <a className="btn btn-cyan" href={FLAP} target="_blank" rel="noopener noreferrer"><MiniSword />Get $LWRLD</a>
      </div>
      <SurvivorEgg />
    </>
  );
}

function Mark({ name }: { name: string }) {
  if (name === "telegram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.5 4.4 2.7 11.2c-1.2.5-1.2 1.1-.2 1.4l4.8 1.5 11.2-7.1c.5-.3 1-.1.6.3l-9.1 8.2-.3 4.7c.5 0 .7-.2 1-.5l2.3-2.2 4.9 3.6c.9.5 1.5.2 1.7-.8l3.2-15.1c.4-1.3-.5-1.9-1.3-1.4z" />
      </svg>
    );
  }
  if (name === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    );
  }
  if (name === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23 12.2s0-3.1-.4-4.5c-.2-.9-.9-1.6-1.8-1.8C19.2 5.5 12 5.5 12 5.5s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9.1 1 12.2 1 12.2s0 3.1.4 4.5c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.5.4-4.5zM9.8 15.5V8.9l6.1 3.3-6.1 3.3z" />
      </svg>
    );
  }
  if (name === "x") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.7 10.4 22.2 2h-1.8l-6.5 7.3L8.2 2H2l8 11.3L2 22h1.8l7-7.9L15.6 22H22l-7.3-11.6zm-2.5 2.8-.8-1.1L4.6 3.5h2.8l5.2 7.3.8 1.1 6.8 9.5h-2.8l-5.2-7.2z" />
      </svg>
    );
  }
  if (name === "twitch") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 3h16v11l-4 4h-4l-2 2H8v-2H3V6l2-3zm2 2v11h3v2h2l2-2h4l2-2V5H7zm8 2h2v5h-2V7zm-4 0h2v5h-2V7z" />
      </svg>
    );
  }
  if (name === "merch") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 7h12l-1 13H7L6 7zm2.1 2 .7 9h6.4l.7-9H8.1zM9 7l.6-2h4.8L15 7H9z" />
      </svg>
    );
  }
  if (name === "discord") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.3 5.3A17 17 0 0 0 15 4l-.3.6a15 15 0 0 0-5.4 0L9 4a17 17 0 0 0-4.3 1.3C2.4 9 1.7 12.5 2.1 16a16 16 0 0 0 5 2.5l.8-1.3a10 10 0 0 1-1.5-.7l.3-.2c3.1 1.4 6.5 1.4 9.6 0l.3.2c-.5.3-1 .5-1.5.7l.8 1.3a16 16 0 0 0 5-2.5c.5-3.9-.7-7.4-2.6-10.7zM8.6 14.2c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7zm6.8 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l2.2 5.2L20 9l-4 3.6L17.2 19 12 16.2 6.8 19 8 12.6 4 9l5.8-.8L12 3z" />
    </svg>
  );
}
