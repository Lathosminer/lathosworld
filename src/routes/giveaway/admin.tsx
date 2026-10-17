import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ADMIN_NOTE_MAX, ADMIN_STATUSES, GIVEAWAY_TITLE, statusLabel, type Platform } from "@/lib/giveaway";
import {
  drawWinner,
  exportEntrantsCsv,
  getAdminBoard,
  resetDraws,
  runXCheck,
  setEntrantNote,
  setEntrantStatus,
  type AdminBoard,
  type AdminDraw,
} from "@/lib/giveaway.functions";
import type { AdminEntrant } from "@/lib/giveaway.server";

export const Route = createFileRoute("/giveaway/admin")({
  component: GiveawayAdmin,
  head: () => ({ meta: [{ title: "Giveaway entries · LathosWorld" }, { name: "robots", content: "noindex, nofollow" }] }),
});

function messageOf(err: unknown): string {
  if (err instanceof Error && err.message) return err.message === "Unauthorized" ? "Sign in as the site owner." : err.message;
  return "Something went wrong. Try again.";
}

function GiveawayAdmin() {
  const [board, setBoard] = useState<AdminBoard | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let live = true;
    getAdminBoard()
      .then((next) => {
        if (!live) return;
        if ("ok" in next) setError(next.error);
        else setBoard(next);
      })
      .catch((err: unknown) => live && setError(messageOf(err)));
    return () => {
      live = false;
    };
  }, [tick]);

  const reload = () => setTick((n) => n + 1);

  async function act<T extends { ok: boolean }>(fn: () => Promise<T>, done?: (result: T) => void) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await fn();
      if (!result.ok) setError((result as unknown as { error: string }).error);
      else done?.(result);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  const shown = useMemo(() => {
    const list = board?.entrants ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) =>
      [e.name, e.email, e.twitch.login, e.youtube.channel, e.youtube.title, e.x.handle, e.tiktok.handle, e.note]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [board, filter]);

  async function downloadCsv() {
    await act(
      () => exportEntrantsCsv(),
      (result) => {
        if (!("csv" in result)) return;
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lwrld-giveaway-entries-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
    );
  }

  const totals = useMemo(() => {
    const list = (board?.entrants ?? []).filter((e) => !e.isAdmin && !e.banned);
    return {
      people: list.length,
      entries: list.reduce((n, e) => n + e.entries.total, 0),
      verified: list.reduce((n, e) => n + e.verifiedEntries.total, 0),
    };
  }, [board]);

  return (
    <main className="gate gate-wide gw">
      <Link className="brand" to="/">
        <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="section">
        <div className="wrap">
          <p className="page-jump">
            <Link to="/giveaway" search={{}}>Giveaway page</Link>
            <Link to="/community" search={{}}>Community</Link>
          </p>
          <p className="kicker">Owner only</p>
          <h1>Giveaway entries</h1>
          {board ? <p className="serif-line">{GIVEAWAY_TITLE}</p> : null}
          {error ? <p className="wallet-error" role="alert">{error}</p> : null}
          {notice ? <p className="talk-note" role="status">{notice}</p> : null}
          {!board && !error ? <p className="talk-meta">Loading…</p> : null}
          {board ? (
            <>
              <p className="gw-preview">
                Status: <strong>{board.state === "hidden" ? "Hidden (not launched)" : board.state === "open" ? "Live" : "Ended"}</strong>
                {" · "}Twitch check {board.twitchReady ? "on" : "off"}
                {" · "}YouTube check {board.youtubeOAuthReady ? "on" : "off (self-reported handles)"}
                {" · "}X check {board.xReady ? "on" : "off (needs X_BEARER_TOKEN)"}
              </p>
              <DrawTool board={board} busy={busy} act={act} setBoard={setBoard} reload={reload} totals={totals} />
              <XCheck board={board} busy={busy} act={act} setNotice={setNotice} reload={reload} />
              <div className="gw-toolbar">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search name, handle, or note"
                  aria-label="Search entrants"
                />
                <button className="btn btn-ghost" type="button" onClick={downloadCsv} disabled={busy}>Export CSV</button>
                <button className="talk-btn" type="button" onClick={reload} disabled={busy}>Refresh</button>
              </div>
              <p className="talk-meta">
                {totals.people} entrants · {totals.entries} entries ({totals.verified} verified). Your own account is listed
                for testing but never drawn.
              </p>
              <div className="gw-table-wrap">
                <table className="gw-table">
                  <thead>
                    <tr>
                      <th>Entrant</th>
                      <th>Twitch</th>
                      <th>YouTube</th>
                      <th>X</th>
                      <th>TikTok</th>
                      <th>Entries</th>
                      <th>Private note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((e) => (
                      <EntrantRow key={e.userId} entrant={e} busy={busy} act={act} reload={reload} />
                    ))}
                    {shown.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="talk-empty">No entrants yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

type Act = <T extends { ok: boolean }>(fn: () => Promise<T>, done?: (result: T) => void) => Promise<void>;

function StatusPick({
  entrant,
  platform,
  value,
  busy,
  act,
  reload,
}: {
  entrant: AdminEntrant;
  platform: Platform;
  value: string;
  busy: boolean;
  act: Act;
  reload: () => void;
}) {
  return (
    <select
      className={`gw-select gw-${value === "verified" ? "ok" : value === "none" ? "off" : ["pending", "unverified", "self_reported"].includes(value) ? "wait" : "bad"}`}
      value={value}
      disabled={busy}
      aria-label={`${entrant.name} ${platform} status`}
      onChange={(event) =>
        act(() => setEntrantStatus({ data: { userId: entrant.userId, platform, status: event.target.value } }), reload)
      }
    >
      {ADMIN_STATUSES[platform].map((status) => (
        <option key={status} value={status}>{statusLabel(status)}</option>
      ))}
    </select>
  );
}

function EntrantRow({ entrant: e, busy, act, reload }: { entrant: AdminEntrant; busy: boolean; act: Act; reload: () => void }) {
  const [note, setNote] = useState(e.note);
  useEffect(() => setNote(e.note), [e.note]);
  const dirty = note.trim() !== e.note;
  return (
    <tr className={e.banned ? "gw-row-banned" : undefined}>
      <td>
        <strong>{e.name}</strong>
        {e.isAdmin ? <span className="gw-tag">You</span> : null}
        {e.banned ? <span className="gw-tag gw-bad">Banned</span> : null}
        <div className="talk-meta">{e.email ?? ""}</div>
      </td>
      <td>
        <div>{e.twitch.login ?? "—"}</div>
        <StatusPick entrant={e} platform="twitch" value={e.twitch.status} busy={busy} act={act} reload={reload} />
      </td>
      <td>
        <div>{e.youtube.title || e.youtube.channel || "—"}</div>
        <StatusPick entrant={e} platform="youtube" value={e.youtube.status} busy={busy} act={act} reload={reload} />
      </td>
      <td>
        <div>{e.x.handle ? <a href={`https://x.com/${e.x.handle}`} target="_blank" rel="noreferrer">@{e.x.handle}</a> : "—"}</div>
        <StatusPick entrant={e} platform="x" value={e.x.status} busy={busy} act={act} reload={reload} />
        <div className="talk-meta">Like + repost</div>
        <StatusPick entrant={e} platform="x_repost" value={e.x.repostStatus} busy={busy} act={act} reload={reload} />
      </td>
      <td>
        <div>
          {e.tiktok.handle ? (
            <a href={`https://www.tiktok.com/@${e.tiktok.handle}`} target="_blank" rel="noreferrer">@{e.tiktok.handle}</a>
          ) : "—"}
        </div>
        <StatusPick entrant={e} platform="tiktok" value={e.tiktok.status} busy={busy} act={act} reload={reload} />
      </td>
      <td className="gw-num">
        <strong>{e.entries.total}</strong>
        <div className="talk-meta">
          {e.entries.follows} follows · {e.entries.comments} comments
        </div>
        <div className="talk-meta">{e.verifiedEntries.total} verified</div>
      </td>
      <td>
        <form
          className="gw-note"
          onSubmit={(event) => {
            event.preventDefault();
            void act(() => setEntrantNote({ data: { userId: e.userId, note } }), reload);
          }}
        >
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={ADMIN_NOTE_MAX}
            rows={2}
            placeholder="e.g. TikTok checked"
            aria-label={`Private note for ${e.name}`}
          />
          <button className="talk-btn" type="submit" disabled={busy || !dirty}>Save</button>
        </form>
      </td>
    </tr>
  );
}

function DrawTool({
  board,
  busy,
  act,
  setBoard,
  reload,
  totals,
}: {
  board: AdminBoard;
  busy: boolean;
  act: Act;
  setBoard: (board: AdminBoard) => void;
  reload: () => void;
  totals: { people: number; entries: number; verified: number };
}) {
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const latest: AdminDraw | undefined = board.draws.find((d) => d.status === "picked");
  const [shownId, setShownId] = useState<string | null>(null);
  const winner = board.draws.find((d) => d.id === shownId) ?? null;

  function draw(redraw: boolean) {
    void act(
      () => drawWinner({ data: { verifiedOnly, redraw } }),
      (result) => {
        if (!("winner" in result)) return;
        setBoard({ ...board, draws: result.draws });
        setShownId(result.winner.id);
      },
    );
  }

  return (
    <div className="gw-draw">
      <h2>Draw a winner</h2>
      <p className="talk-meta">
        Random pick weighted by entries ({verifiedOnly ? totals.verified : totals.entries} in the pool). Anyone already drawn
        is left out of the next draw.
      </p>
      <label className="gw-check">
        <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
        Only count verified entries
      </label>
      <div className="gw-draw-actions">
        <button className="btn btn-cyan" type="button" onClick={() => draw(false)} disabled={busy}>
          {latest ? "Draw another winner" : "Draw winner"}
        </button>
        {latest ? (
          <button className="btn btn-ghost" type="button" onClick={() => draw(true)} disabled={busy}>
            Re-draw (replace last winner)
          </button>
        ) : null}
      </div>
      {winner ? (
        <div className="gw-winner" role="status" aria-live="assertive">
          <p className="kicker">Winner</p>
          <p className="gw-winner-name">{winner.name}</p>
          <p className="talk-meta">
            {winner.entries} of {winner.poolEntries} entries in the pool
          </p>
        </div>
      ) : null}
      {board.draws.length ? (
        <details className="gw-history">
          <summary>Draw history ({board.draws.length})</summary>
          <ol>
            {board.draws.map((d) => (
              <li key={d.id} className={d.status === "redrawn" ? "gw-redrawn" : undefined}>
                {d.name} · {d.entries}/{d.poolEntries} entries{d.verifiedOnly ? " · verified only" : ""}
                {d.status === "redrawn" ? " · re-drawn" : ""}
              </li>
            ))}
          </ol>
          <button
            className="talk-btn talk-btn-danger"
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Clear the whole draw history? Everyone goes back in the pool.")) {
                void act(() => resetDraws(), () => {
                  setShownId(null);
                  reload();
                });
              }
            }}
          >
            Clear draw history
          </button>
        </details>
      ) : null}
    </div>
  );
}

function XCheck({
  board,
  busy,
  act,
  setNotice,
  reload,
}: {
  board: AdminBoard;
  busy: boolean;
  act: Act;
  setNotice: (text: string) => void;
  reload: () => void;
}) {
  const [post, setPost] = useState(board.defaultPostId);
  return (
    <div className="gw-xcheck">
      <h2>Check X entries</h2>
      {!board.xReady ? (
        <p className="talk-meta">
          Add the X_BEARER_TOKEN secret in Cloudflare to switch this on. Until then X entries stay "pending check" and still
          count. You can also set them by hand below.
        </p>
      ) : null}
      <div className="gw-toolbar">
        <input
          value={post}
          onChange={(e) => setPost(e.target.value)}
          placeholder="Giveaway post link (for like + repost)"
          aria-label="Giveaway post link"
        />
        <button
          className="btn btn-ghost"
          type="button"
          disabled={busy || !board.xReady}
          onClick={() =>
            act(
              () => runXCheck({ data: { post } }),
              (result) => {
                if (!("summary" in result)) return;
                const s = result.summary;
                setNotice(
                  `Checked ${s.checked} X entrants: ${s.followVerified} follows verified, ${s.followMissing} not following, ` +
                    `${s.repostVerified} like + repost verified, ${s.repostMissing} not found.` +
                    (s.notes.length ? ` ${s.notes.join(" ")}` : ""),
                );
                reload();
              },
            )
          }
        >
          Check X now
        </button>
      </div>
    </div>
  );
}
