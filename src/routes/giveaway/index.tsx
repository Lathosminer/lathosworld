import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GiveawayComments } from "@/components/Talk";
import { GiveawayTicker } from "@/components/GiveawayTicker";
import {
  CLAIM_DAYS,
  COMMENT_ENTRIES_PER_DAY,
  GIVEAWAY_TITLE,
  LEGAL_FOOTER,
  MAX_ENTRIES_PER_PERSON,
  MIN_AGE,
  PRIZE_TIERS,
  PRIZE_TOTAL,
  formatTokens,
  NEVER_DM_LINE,
  SCAM_WARNING,
  SEED_PHRASE_WARNING,
  TIKTOK_HANDLE,
  WALLET_FREE_NOTE,
  TWITCH_LOGIN,
  X_HANDLE,
  YOUTUBE_URL,
  statusLabel,
} from "@/lib/giveaway";
import {
  claimRepost,
  getGiveaway,
  getPublishedList,
  removeMyEntry,
  saveHandle,
  saveWallet,
  type GiveawayView,
  type MyEntry,
  type PublishedList,
} from "@/lib/giveaway.functions";
import { pageHead } from "@/lib/seo";
import { BSC_ID, connectWallet, getTrustState, shortAddress, subscribeTrust } from "@/lib/trust";
import { WALLET_HELP_HREF, checkBscAddress, maskAddress } from "@/lib/wallet-address";

type Search = { twitch?: string; youtube?: string };

export const Route = createFileRoute("/giveaway/")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const pick = (v: unknown) => (typeof v === "string" && /^[a-z_]{1,20}$/.test(v) ? v : undefined);
    return { twitch: pick(search.twitch), youtube: pick(search.youtube) };
  },
  component: GiveawayPage,
  head: () => {
    const head = pageHead({
      path: "/giveaway",
      title: "Win up to 1,000,000 $LWRLD · LathosWorld Giveaway",
      description:
        "Free to enter. Follow, comment, win. Drawn live on stream July 9, 2027. No purchase necessary. Void where prohibited. 18+.",
    });
    return { ...head, meta: [...head.meta, { name: "robots", content: "noindex, nofollow" }] };
  },
});

const RETURN_MESSAGES: Record<string, string> = {
  verified: "Verified. That's an entry.",
  not_following: "That Twitch account isn't following twitch.tv/lathosworld yet. Follow, then check again.",
  not_subscribed: "That YouTube account isn't subscribed yet. Subscribe, then check again.",
  taken: "That account is already entered by someone else.",
  signin: "Sign in to the site first, then try again.",
  wallet: "Add your BNB Smart Chain wallet address first (step 1). It's required to enter.",
  closed: "Entries aren't open.",
  slow: "Slow down a little. Try again in a few minutes.",
  not_configured: "That check isn't switched on yet.",
  no_channel: "That Google account doesn't have a YouTube channel to check. Pick the account you use on YouTube.",
  cancelled: "Cancelled. Nothing changed.",
  expired: "That check timed out. Try again.",
  error: "Something went wrong with that check. Try again.",
};

function endsLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

function messageOf(err: unknown): string {
  if (err instanceof Error && err.message) return err.message === "Unauthorized" ? "Sign in first." : err.message;
  return "Something went wrong. Try again.";
}

function GiveawayPage() {
  const search = Route.useSearch();
  const [view, setView] = useState<GiveawayView | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    getGiveaway()
      .then((next) => live && setView(next))
      .catch((err: unknown) => live && setError(messageOf(err)));
    return () => {
      live = false;
    };
  }, [tick]);

  const returned = search.twitch
    ? `Twitch: ${RETURN_MESSAGES[search.twitch] ?? "Done."}`
    : search.youtube
      ? `YouTube: ${RETURN_MESSAGES[search.youtube] ?? "Done."}`
      : "";

  if (!view) {
    return (
      <Shell>
        {error ? <p className="wallet-error" role="alert">{error}</p> : <p className="talk-meta">Loading…</p>}
      </Shell>
    );
  }

  if (view.state === "hidden" && !view.isAdmin) {
    return (
      <Shell>
        <h1>Nothing here yet</h1>
        <p className="serif-line">Check back soon.</p>
      </Shell>
    );
  }

  const v = view as Exclude<GiveawayView, { state: "hidden"; isAdmin: false }>;
  const setMe = (me: MyEntry) => setView({ ...v, me });

  return (
    <Shell>
      {v.isAdmin ? (
        <p className="gw-preview">
          {v.state === "hidden"
            ? "Admin preview. This page is hidden from everyone else until GIVEAWAY_OPEN is set to true."
            : v.state === "ended"
              ? "Admin view. Entries have closed."
              : "Admin view. The giveaway is live."}{" "}
          <Link to="/giveaway/admin">Open the entry list</Link>
        </p>
      ) : null}
      <p className="kicker">Giveaway</p>
      <h1 className="gw-title">{GIVEAWAY_TITLE}</h1>
      <p className="serif-line">
        {v.state === "ended" ? "Entries closed " : "Open until "}
        {endsLabel(v.endsAt)}. Winners announced <strong>live on stream</strong> 🔴
      </p>

      {v.state === "open" || (v.isAdmin && v.state === "hidden") ? (
        <GiveawayTicker preview={v.isAdmin && v.state === "hidden"} />
      ) : null}

      <div className="gw-rules">
        <h2>How it works</h2>
        <ul>
          <li>
            Step 1: add a BNB Smart Chain wallet address you control. It's required, and it's where a prize is sent. Free
            wallets only, no purchase needed.
          </li>
          <li>Every follow is 1 entry. Do one or do them all. Free to enter.</li>
          <li>Like + repost the giveaway post on X for a bonus entry.</li>
          <li>
            Comment below for more entries: each comment that stays up counts, up to {COMMENT_ENTRIES_PER_DAY} per day.
          </li>
          <li>Up to {MAX_ENTRIES_PER_PERSON} entries per person in total.</li>
          <li>Winners are picked at random, weighted by entries, live on twitch.tv/{TWITCH_LOGIN}.</li>
          <li>Winners have {CLAIM_DAYS} days to claim publicly, or the prize is re-drawn.</li>
          <li>
            One entry list per person. Each social account and each wallet can only be entered once. {MIN_AGE}+ only.
          </li>
          <li>Buying $LWRLD does not increase your chances.</li>
        </ul>
        <p className="gw-warn">⚠️ {NEVER_DM_LINE}</p>
        <p className="gw-warn">🚫 {SCAM_WARNING}</p>
        <p className="gw-rules-link">
          <Link to="/giveaway/rules">Read the Official Rules →</Link>
        </p>
      </div>

      <div className="gw-prizes">
        <h2>Planned prizes</h2>
        <ul className="gw-prize-list">
          {PRIZE_TIERS.map((tier) => (
            <li key={tier.place}>
              <b>{formatTokens(tier.amount)} $LWRLD</b>
              <span>
                {tier.place}
                {tier.count > 1 ? ` (${tier.count} winners, each)` : ""}
              </span>
            </li>
          ))}
        </ul>
        <p className="talk-meta">
          Up to {formatTokens(PRIZE_TOTAL)} $LWRLD in total. These are planned prizes. Final amounts are announced by Lathos.
        </p>
      </div>

      {returned ? (
        <p className="talk-note" role="status">
          {returned}
          {search.twitch === "signin" || search.youtube === "signin" ? (
            <>
              {" "}
              <Link to="/login" search={{ next: "/giveaway" }}>Sign in</Link>
            </>
          ) : null}
        </p>
      ) : null}

      <section id="entries" className="gw-entries">
        <EntryCount view={v} />
        {!v.signedIn ? (
          <p className="talk-signin">
            <Link className="btn btn-cyan" to="/login" search={{ next: "/giveaway" }}>Sign in to enter</Link>
          </p>
        ) : v.banned ? (
          <p className="talk-note">This account can't enter.</p>
        ) : (
          <Entries view={v} me={v.me} setMe={setMe} reload={() => setTick((n) => n + 1)} />
        )}
      </section>

      <section className="gw-talk">
        <GiveawayComments closed={!v.entriesOpen} onPosted={() => setTick((n) => n + 1)} />
      </section>

      <Published />

      <p className="gw-legal">
        {LEGAL_FOOTER} <Link to="/giveaway/rules">Official Rules</Link>.
      </p>
    </Shell>
  );
}

function Published() {
  const [list, setList] = useState<PublishedList | null>(null);
  useEffect(() => {
    let live = true;
    getPublishedList()
      .then((next) => live && setList(next))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  if (!list) return null;
  return (
    <details className="gw-published">
      <summary>
        Published entry list ({list.entrants.length} eligible entrants, as of{" "}
        {new Date(list.publishedAt).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" })} CT)
      </summary>
      <ol>
        {list.entrants.map((e, index) => (
          <li key={`${e.name}-${index}`}>
            {e.name}: {e.entries} {e.entries === 1 ? "entry" : "entries"}
          </li>
        ))}
      </ol>
    </details>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="gate gate-wide gw">
      <Link className="brand" to="/">
        <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="section">
        <div className="wrap">{children}</div>
      </section>
    </main>
  );
}

function EntryCount({ view }: { view: Exclude<GiveawayView, { state: "hidden"; isAdmin: false }> }) {
  const me = view.me;
  if (!me) return null;
  return (
    <div className="gw-count" aria-live="polite">
      <span className="gw-count-n">{me.entries.total}</span>
      <span className="gw-count-l">
        {me.entries.total === 1 ? "entry" : "entries"}
        <small>
          {me.entries.follows} from follows · {me.entries.comments} from comments
          {me.entries.capped ? ` · capped at ${MAX_ENTRIES_PER_PERSON}` : ` · max ${MAX_ENTRIES_PER_PERSON}`}
          {!me.wallet.address ? " · add your wallet to make these count" : ""}
          {me.wallet.status === "flagged" ? " · on hold: wallet under review" : ""}
        </small>
      </span>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const tone =
    status === "verified" || status === "ok" || status === "cleared"
      ? "ok"
      : status === "pending" || status === "unverified" || status === "self_reported"
        ? "wait"
        : status === "none"
          ? "off"
          : "bad";
  return <span className={`gw-status gw-${tone}`}>{statusLabel(status)}</span>;
}

function Entries({
  view,
  me,
  setMe,
  reload,
}: {
  view: Exclude<GiveawayView, { state: "hidden"; isAdmin: false }>;
  me: MyEntry | null;
  setMe: (me: MyEntry) => void;
  reload: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const s = me?.statuses;
  const hasWallet = Boolean(me?.wallet.address) && me?.wallet.status !== "rejected";
  const open = view.entriesOpen;

  async function run(fn: () => Promise<{ ok: true; me: MyEntry } | { ok: false; error: string }>) {
    setBusy(true);
    setError("");
    try {
      const result = await fn();
      if (!result.ok) setError(result.error);
      else setMe(result.me);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gw-grid">
      {error ? <p className="wallet-error gw-wide" role="alert">{error}</p> : null}

      <WalletCard me={me} open={open} busy={busy} setBusy={setBusy} setError={setError} setMe={setMe} />

      {!hasWallet ? (
        <p className="talk-note gw-wide">Add your wallet above first. Follows and the bonus count once it's saved.</p>
      ) : null}

      <article className="gw-card">
        <header>
          <h3>Twitch</h3>
          <Status status={s?.twitch ?? "none"} />
        </header>
        <p>
          Follow <a href={`https://www.twitch.tv/${TWITCH_LOGIN}`} target="_blank" rel="noreferrer">twitch.tv/{TWITCH_LOGIN}</a>
          {open && view.twitchReady ? ", then sign in with Twitch so we can check the follow." : "."}
        </p>
        {me?.twitchLogin ? <p className="talk-meta">Checked: {me.twitchLogin}</p> : null}
        {open && view.twitchReady ? (
          <a className="btn btn-ghost" href="/api/giveaway/connect/twitch">
            {s?.twitch === "verified" ? "Check again" : "Check my Twitch follow"}
          </a>
        ) : open ? (
          <p className="talk-meta">Automatic Twitch follow check is not available.</p>
        ) : null}
      </article>

      <article className="gw-card">
        <header>
          <h3>YouTube</h3>
          <Status status={s?.youtube ?? "none"} />
        </header>
        <p>
          Subscribe on <a href={YOUTUBE_URL} target="_blank" rel="noreferrer">YouTube</a>
          {view.youtubeOAuthReady ? ", then sign in with Google so we can check it." : ", then add your YouTube handle."}
        </p>
        {me?.youtubeTitle || me?.youtubeChannel ? (
          <p className="talk-meta">Entered: {me.youtubeTitle || me.youtubeChannel}</p>
        ) : null}
        {open && view.youtubeOAuthReady ? (
          <a className="btn btn-ghost" href="/api/giveaway/connect/youtube">
            {s?.youtube === "verified" ? "Check again" : "Check my YouTube subscription"}
          </a>
        ) : open ? (
          <HandleForm
            label="Your YouTube handle"
            placeholder="@yourchannel"
            current={me?.youtubeChannel ?? ""}
            busy={busy}
            onSave={(handle) => run(() => saveHandle({ data: { platform: "youtube", handle } }))}
            onRemove={me?.youtubeChannel ? () => run(() => removeMyEntry({ data: { platform: "youtube" } })) : undefined}
          />
        ) : null}
      </article>

      <article className="gw-card">
        <header>
          <h3>X</h3>
          <Status status={s?.x ?? "none"} />
        </header>
        <p>
          Follow <a href={`https://x.com/${X_HANDLE}`} target="_blank" rel="noreferrer">@{X_HANDLE}</a> and add your X handle.
          We check X follows before the drawing.
        </p>
        {open ? (
          <HandleForm
            label="Your X handle"
            placeholder="@you"
            current={me?.xHandle ? `@${me.xHandle}` : ""}
            busy={busy}
            onSave={(handle) => run(() => saveHandle({ data: { platform: "x", handle } }))}
            onRemove={me?.xHandle ? () => run(() => removeMyEntry({ data: { platform: "x" } })) : undefined}
          />
        ) : null}
        {me?.xHandle ? (
          <div className="gw-bonus">
            <label>
              <input
                type="checkbox"
                checked={s?.xRepost !== "none" && s?.xRepost !== undefined}
                disabled={!open || busy || s?.xRepost === "verified" || s?.xRepost === "rejected"}
                onChange={(event) => run(() => claimRepost({ data: { claimed: event.target.checked } }))}
              />
              I liked + reposted the giveaway post (bonus entry)
            </label>
            <Status status={s?.xRepost ?? "none"} />
          </div>
        ) : null}
      </article>

      <article className="gw-card">
        <header>
          <h3>TikTok</h3>
          <Status status={s?.tiktok ?? "none"} />
        </header>
        <p>
          Follow <a href={`https://www.tiktok.com/@${TIKTOK_HANDLE}`} target="_blank" rel="noreferrer">@{TIKTOK_HANDLE}</a> and add
          your TikTok username. TikTok doesn't share follower lists, so winners get spot-checked.
        </p>
        {open ? (
          <HandleForm
            label="Your TikTok username"
            placeholder="@you"
            current={me?.tiktokHandle ? `@${me.tiktokHandle}` : ""}
            busy={busy}
            onSave={(handle) => run(() => saveHandle({ data: { platform: "tiktok", handle } }))}
            onRemove={me?.tiktokHandle ? () => run(() => removeMyEntry({ data: { platform: "tiktok" } })) : undefined}
          />
        ) : null}
      </article>

      <p className="talk-meta gw-wide">
        <button type="button" className="talk-btn" onClick={reload} disabled={busy}>Refresh my entries</button>
      </p>
    </div>
  );
}

function WalletCard({
  me,
  open,
  busy,
  setBusy,
  setError,
  setMe,
}: {
  me: MyEntry | null;
  open: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (error: string) => void;
  setMe: (me: MyEntry) => void;
}) {
  const trust = useSyncExternalStore(subscribeTrust, getTrustState, getTrustState);
  const saved = me?.wallet.address ?? "";
  const [value, setValue] = useState(saved);
  const [hint, setHint] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => setValue(saved), [saved]);

  // Prefill from a wallet connected with the site's wallet connect (TrustConnect).
  const connected = trust.wallet?.address ?? "";
  useEffect(() => {
    if (connected && !saved) setValue((current) => current || connected);
  }, [connected, saved]);

  const typed = value.trim();
  const local = typed ? checkBscAddress(typed) : null;
  const sameAsSaved = Boolean(saved) && typed.toLowerCase() === saved.toLowerCase();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    if (local && !local.ok) {
      setHint(local.error);
      return;
    }
    setHint("");
    setBusy(true);
    setError("");
    try {
      const result = await saveWallet({ data: { address: typed } });
      if (!result.ok) setHint(result.error);
      else {
        setMe(result.me);
        setNotice(
          result.flagged
            ? "Saved, but that wallet is already on another entry, so this entry is on hold until Lathos reviews it."
            : "Wallet saved. Prizes are sent here in $LWRLD on BNB Smart Chain.",
        );
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await removeMyEntry({ data: { platform: "wallet" } });
      if (!result.ok) setError(result.error);
      else setMe(result.me);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="gw-card gw-wide gw-wallet" id="wallet">
      <header>
        <h3>Step 1 · Your wallet (required)</h3>
        <Status status={me?.wallet.status ?? "none"} />
      </header>
      <p>
        A BNB Smart Chain wallet address you control (starts with 0x). It's required to enter, and it's where your prize
        is sent in $LWRLD. Only you and Lathos can see it. It's never shown publicly.
      </p>
      {saved ? <p className="talk-meta">Saved: <code>{maskAddress(saved)}</code></p> : null}
      {open ? (
        <form className="gw-form" onSubmit={submit}>
          <label>
            <span className="sr-only">Your BNB Smart Chain wallet address</span>
            <input
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setHint("");
              }}
              placeholder="0x…"
              maxLength={80}
              required
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              inputMode="text"
              aria-label="Your BNB Smart Chain wallet address"
              aria-invalid={Boolean(local && !local.ok) || undefined}
              aria-describedby="gw-wallet-help"
            />
          </label>
          <button className="btn btn-ghost" type="submit" disabled={busy || !typed || sameAsSaved}>
            {saved ? "Update" : "Save wallet"}
          </button>
          {saved && me?.wallet.status !== "rejected" ? (
            <button className="talk-btn" type="button" onClick={remove} disabled={busy}>Remove</button>
          ) : null}
        </form>
      ) : null}
      {open && !trust.wallet && trust.wallets.length ? (
        <div className="gw-wallet-connect">
          <span className="talk-meta">Or fill it in from your browser wallet:</span>
          {trust.wallets.map((item) => (
            <button key={item.id} className="talk-btn" type="button" onClick={() => connectWallet(item.id)} disabled={busy || trust.busy}>
              {item.name}
            </button>
          ))}
        </div>
      ) : null}
      {open && trust.wallet ? (
        <p className="talk-meta">
          Connected: {trust.wallet.name} · {shortAddress(trust.wallet.address)}
          {trust.wallet.chainId !== BSC_ID ? " · switch it to BNB Smart Chain" : ""}{" "}
          {typed.toLowerCase() !== trust.wallet.address.toLowerCase() ? (
            <button className="talk-btn" type="button" onClick={() => setValue(trust.wallet?.address ?? "")} disabled={busy}>
              Use this address
            </button>
          ) : null}
        </p>
      ) : null}
      {trust.error && open ? <p className="talk-meta">{trust.error}</p> : null}
      {hint ? <p className="wallet-error" role="alert">{hint}</p> : null}
      {notice ? <p className="talk-note" role="status">{notice}</p> : null}
      <div id="gw-wallet-help" className="gw-wallet-help">
        <p>
          <a href={WALLET_HELP_HREF}>Need a wallet?</a> {WALLET_FREE_NOTE} Use one that supports BNB Smart Chain, like Trust
          Wallet, MetaMask, Binance Web3 Wallet, or Coinbase Wallet. Don't use an exchange deposit address: exchanges may
          not credit $LWRLD, so use a wallet you control.
        </p>
        <p className="gw-warn">🔒 {SEED_PHRASE_WARNING}</p>
        <p className="gw-warn">⚠️ {SCAM_WARNING}</p>
      </div>
    </article>
  );
}

function HandleForm({
  label,
  placeholder,
  current,
  busy,
  onSave,
  onRemove,
}: {
  label: string;
  placeholder: string;
  current: string;
  busy: boolean;
  onSave: (handle: string) => void;
  onRemove?: () => void;
}) {
  const [value, setValue] = useState(current);
  useEffect(() => setValue(current), [current]);
  function submit(event: FormEvent) {
    event.preventDefault();
    onSave(value);
  }
  return (
    <form className="gw-form" onSubmit={submit}>
      <label>
        <span className="sr-only">{label}</span>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} maxLength={60} required aria-label={label} />
      </label>
      <button className="btn btn-ghost" type="submit" disabled={busy || !value.trim() || value.trim() === current}>
        {current ? "Update" : "Enter"}
      </button>
      {onRemove ? (
        <button className="talk-btn" type="button" onClick={onRemove} disabled={busy}>Remove</button>
      ) : null}
    </form>
  );
}
