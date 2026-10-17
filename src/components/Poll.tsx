import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { COMMUNITY_RULES, HELD_NOTICE } from "@/lib/discussion";
import { POLL_OPT_MAX, POLL_Q_MAX, type PollCard } from "@/lib/polls";
import {
  approveSuggestion,
  closePoll,
  createPoll,
  editPoll,
  getPollBoard,
  removeSuggestion,
  suggestPoll,
  votePoll,
  type PollBoard,
} from "@/lib/polls.functions";

function messageOf(err: unknown): string {
  if (err instanceof Error && err.message) {
    if (err.message === "Unauthorized") return "Sign in to vote.";
    return err.message;
  }
  return "Something went wrong. Try again.";
}

export function usePollBoard() {
  const [board, setBoard] = useState<PollBoard | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    getPollBoard()
      .then((next) => {
        if (live) setBoard(next);
      })
      .catch((err: unknown) => {
        if (live) setError(messageOf(err));
      });
    return () => {
      live = false;
    };
  }, [tick]);
  return { board, error, setError, reload: () => setTick((n) => n + 1) };
}

function Rules() {
  return (
    <div className="talk-rules">
      {COMMUNITY_RULES.split("\n").map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function Bars({
  poll,
  canVote,
  busy,
  onVote,
}: {
  poll: PollCard;
  canVote: boolean;
  busy: boolean;
  onVote: (optionId: string) => void;
}) {
  const show = poll.closed || poll.myOptionId != null;
  return (
    <div className="poll-options">
      {poll.options.map((option) =>
        show ? (
          <button
            key={option.id}
            type="button"
            className={option.id === poll.myOptionId ? "poll-result poll-mine" : "poll-result"}
            onClick={() => onVote(option.id)}
            disabled={!canVote || busy || poll.closed}
            aria-pressed={option.id === poll.myOptionId}
          >
            <span className="poll-fill" style={{ width: `${option.pct}%` }} />
            <span>{option.label}</span>
            <span>
              {option.pct}%{option.id === poll.myOptionId ? " · yours" : ""}
            </span>
          </button>
        ) : (
          <button key={option.id} type="button" className="poll-choice" onClick={() => onVote(option.id)} disabled={!canVote || busy}>
            {option.label}
          </button>
        ),
      )}
    </div>
  );
}

export function PollWidget() {
  const state = usePollBoard();
  if (!state.board?.featured && !state.error) return null;
  return (
    <section className="section" id="poll" aria-label="Community poll">
      <div className="wrap">
        <PollFace board={state.board} error={state.error} reload={state.reload} setError={state.setError} compact />
      </div>
    </section>
  );
}

export function CommunityPolls({
  part,
  state,
}: {
  part: "board" | "tools";
  state: ReturnType<typeof usePollBoard>;
}) {
  if (part === "board") {
    return <PollFace board={state.board} error={state.error} reload={state.reload} setError={state.setError} />;
  }
  if (!state.board?.viewer.isAdmin) return null;
  return <PollTools board={state.board} error={state.error} reload={state.reload} setError={state.setError} />;
}

function PollFace({
  board,
  error,
  compact = false,
  reload,
  setError,
}: {
  board: PollBoard | null;
  error: string;
  compact?: boolean;
  reload?: () => void;
  setError?: (value: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [openSuggest, setOpenSuggest] = useState(false);
  const poll = board?.featured ?? null;
  const viewer = board?.viewer;
  const canVote = Boolean(viewer?.signedIn && !viewer.banned && poll && !poll.closed);

  async function onVote(optionId: string) {
    if (!poll || !reload || !setError) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await votePoll({ data: { pollId: poll.id, optionId } });
      if (!result.ok) setError(result.error);
      else reload();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  if (!board && !error) return compact ? null : <p className="talk-meta">Loading the poll…</p>;

  return (
    <section className={compact ? "poll-card poll-compact" : "poll-card"} aria-label="This week's poll">
      <p className="kicker">This week</p>
      <h2>{poll ? poll.question : "No poll this week"}</h2>
      {error ? <p className="wallet-error" role="alert">{error}</p> : null}
      {notice ? <p className="talk-note">{notice}</p> : null}
      {poll ? (
        <>
          <Bars poll={poll} canVote={canVote} busy={busy} onVote={onVote} />
          <p className="talk-meta">
            {poll.myOptionId || poll.closed ? <span>{poll.total === 1 ? "1 vote" : `${poll.total} votes`}</span> : <span>Vote to see the bars</span>}
            {compact ? (
              <Link to="/community" search={{}}>Community</Link>
            ) : (
              <span>A new question each Monday</span>
            )}
          </p>
        </>
      ) : null}
      {viewer && !viewer.signedIn ? (
        <p className="talk-signin">
          <Link className="btn btn-ghost talk-submit" to="/login">Sign in to vote</Link>
        </p>
      ) : null}
      {viewer?.banned ? <p className="talk-note">This account can't vote.</p> : null}
      {!compact && viewer?.signedIn && !viewer.banned ? (
        openSuggest ? (
          <SuggestForm
            busy={busy}
            setBusy={setBusy}
            onDone={(text) => {
              setNotice(text);
              setOpenSuggest(false);
              reload?.();
            }}
            onError={(text) => setError?.(text)}
            onCancel={() => setOpenSuggest(false)}
          />
        ) : (
          <button type="button" className="talk-btn" onClick={() => setOpenSuggest(true)}>
            Suggest a poll
          </button>
        )
      ) : null}
      {!compact && board && board.archive.length > 0 ? (
        <details className="poll-archive">
          <summary>Past polls</summary>
          <ul>
            {board.archive.map((item) => (
              <li key={item.id}>
                <p className="talk-preview">{item.question}</p>
                <Bars poll={item} canVote={false} busy={false} onVote={() => {}} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function ChoiceFields({
  options,
  setOptions,
}: {
  options: string[];
  setOptions: (next: string[]) => void;
}) {
  return (
    <div className="poll-fields">
      {options.map((option, index) => (
        <label key={index}>
          Choice {index + 1}
          <input
            value={option}
            maxLength={POLL_OPT_MAX}
            onChange={(event) => {
              const next = options.slice();
              next[index] = event.target.value;
              setOptions(next);
            }}
          />
        </label>
      ))}
      <div className="talk-actions">
        {options.length < 4 ? (
          <button type="button" className="talk-btn" onClick={() => setOptions([...options, ""])}>
            Add choice
          </button>
        ) : null}
        {options.length > 2 ? (
          <button type="button" className="talk-btn" onClick={() => setOptions(options.slice(0, -1))}>
            Remove choice
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SuggestForm({
  busy,
  setBusy,
  onDone,
  onError,
  onCancel,
}: {
  busy: boolean;
  setBusy: (value: boolean) => void;
  onDone: (notice: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    onError("");
    try {
      const result = await suggestPoll({ data: { question, options } });
      if (!result.ok) onError(result.error);
      else onDone(HELD_NOTICE);
    } catch (err) {
      onError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="talk-form" onSubmit={onSubmit}>
      <Rules />
      <label>
        Poll idea
        <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={POLL_Q_MAX} required />
      </label>
      <ChoiceFields options={options} setOptions={setOptions} />
      <p className="talk-meta">Ideas wait for the owner. Opinions are fine. Slurs, threats, harassment, and spam are not.</p>
      <div className="talk-form-row">
        <button className="btn btn-cyan talk-submit" type="submit" disabled={busy}>
          Suggest
        </button>
        <button type="button" className="talk-btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function PollTools({
  board,
  error,
  reload,
  setError,
}: {
  board: PollBoard;
  error: string;
  reload: () => void;
  setError: (value: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const featured = board.featured;

  async function run(work: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setBusy(true);
    setError("");
    try {
      const result = await work();
      if (!result.ok) setError(result.error);
      else {
        setEditing(false);
        setCreating(false);
        reload();
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="talk-bans talk-queue poll-tools" aria-label="Poll queue">
      <h2>Polls</h2>
      <p className="talk-note">Suggestions stay here until you approve them. Close a poll to archive its results.</p>
      {error ? <p className="wallet-error" role="alert">{error}</p> : null}
      {featured ? (
        <div className="poll-card">
          <p className="talk-preview">{featured.question}</p>
          <div className="talk-actions">
            <button
              type="button"
              className="talk-btn"
              disabled={busy}
              onClick={() => {
                setEditing((open) => !open);
                setCreating(false);
                setQuestion(featured.question);
                setOptions(featured.options.map((option) => option.label));
              }}
            >
              Edit
            </button>
            <button type="button" className="talk-btn talk-btn-danger" disabled={busy} onClick={() => void run(() => closePoll({ data: { pollId: featured.id } }))}>
              Close
            </button>
          </div>
          {editing ? (
            <form
              className="talk-form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => editPoll({ data: { pollId: featured.id, question, options } }));
              }}
            >
              <label>
                Question
                <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={POLL_Q_MAX} required />
              </label>
              <ChoiceFields options={options} setOptions={setOptions} />
              <button className="btn btn-cyan talk-submit" type="submit" disabled={busy}>
                Save poll
              </button>
            </form>
          ) : null}
        </div>
      ) : (
        <p className="talk-empty">No poll is open.</p>
      )}
      {creating ? (
        <form
          className="talk-form"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => createPoll({ data: { question, options } }));
          }}
        >
          <label>
            New poll
            <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={POLL_Q_MAX} required />
          </label>
          <ChoiceFields options={options} setOptions={setOptions} />
          <button className="btn btn-cyan talk-submit" type="submit" disabled={busy}>
            Feature this poll
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="talk-btn"
          onClick={() => {
            setCreating(true);
            setEditing(false);
            setQuestion("");
            setOptions(["", ""]);
          }}
        >
          Create a poll
        </button>
      )}
      {board.suggestions.length > 0 ? (
        <ul>
          {board.suggestions.map((item) => (
            <li key={item.id}>
              <div>
                <p className="talk-meta">
                  <strong>{item.authorName}</strong>
                  <span className="talk-flag">{item.reason === "language" ? "Pending · language" : "Waiting for approval"}</span>
                </p>
                <p className="talk-body">{item.question}</p>
                <p className="talk-preview">{item.options.join(" · ")}</p>
              </div>
              <div className="talk-actions">
                <button type="button" className="talk-btn" disabled={busy} onClick={() => void run(() => approveSuggestion({ data: { pollId: item.id } }))}>
                  Approve
                </button>
                <button type="button" className="talk-btn talk-btn-danger" disabled={busy} onClick={() => void run(() => removeSuggestion({ data: { pollId: item.id } }))}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="talk-empty">No poll ideas waiting.</p>
      )}
    </section>
  );
}
