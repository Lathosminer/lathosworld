import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BODY_MAX,
  COMMUNITY_RULES,
  HELD_NOTICE,
  NOTE_MAX,
  TITLE_MAX,
  formatWhen,
  initial,
  postsByParent,
  previewText,
  proposedStrikeNote,
  reviewPlace,
  type TalkFeed,
  type TalkNote,
  type TalkNoteReview,
  type TalkPost,
  type TalkReview,
  type TalkViewer,
} from "@/lib/discussion";
import { CommunityPolls, usePollBoard } from "@/components/Poll";
import {
  banUser,
  commentOnClip,
  createNote,
  createThread,
  getThread,
  listClipComments,
  listThreads,
  rateNote,
  reportNote,
  removeNote,
  restoreNote,
  removePost,
  replyToPost,
  reportPost,
  restorePost,
  unbanUser,
} from "@/lib/discussion.functions";

function messageOf(err: unknown): string {
  if (err instanceof Error && err.message) {
    if (err.message === "Unauthorized") return "Sign in to post.";
    return err.message;
  }
  return "Something went wrong. Try again.";
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) return <img className="talk-avatar" src={image} alt="" width={40} height={40} />;
  return <span className="talk-fallback" aria-hidden="true">{initial(name)}</span>;
}

function TalkText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (!/^https?:\/\//.test(part)) return <span key={index}>{part}</span>;
        try {
          const url = new URL(part);
          if (url.protocol !== "https:" && url.protocol !== "http:") return <span key={index}>{part}</span>;
          return (
            <a key={index} href={url.toString()} rel="nofollow noopener noreferrer" target="_blank">
              {part}
            </a>
          );
        } catch {
          return <span key={index}>{part}</span>;
        }
      })}
    </>
  );
}

function useFeed(load: () => Promise<TalkFeed>, deps: unknown[]) {
  const [feed, setFeed] = useState<TalkFeed | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(deps);
  useEffect(() => {
    setFeed(null);
  }, [key]);
  useEffect(() => {
    let live = true;
    setError("");
    load()
      .then((next) => {
        if (live) setFeed(next);
      })
      .catch((err: unknown) => {
        if (live) {
          setFeed(null);
          setError(messageOf(err));
        }
      });
    return () => {
      live = false;
    };
    // `load` is a fresh closure each render. `key` and `tick` are what should refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, key]);
  return { feed, error, setError, reload: () => setTick((n) => n + 1) };
}

function SignIn({ viewer }: { viewer: TalkViewer }) {
  if (!viewer.signedIn) {
    return (
      <p className="talk-signin">
        <Link className="btn btn-ghost talk-submit" to="/login">Sign in to post</Link>
      </p>
    );
  }
  if (viewer.banned) return <p className="talk-note">This account can't post.</p>;
  return null;
}

function canPost(viewer: TalkViewer): boolean {
  return viewer.signedIn && !viewer.banned;
}

function CommunityRules() {
  return (
    <div className="talk-rules">
      {COMMUNITY_RULES.split("\n").map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function Composer({
  viewer,
  title,
  body,
  onTitle,
  onBody,
  onSubmit,
  busy,
  submitLabel,
  placeholder,
}: {
  viewer: TalkViewer;
  title?: string;
  body: string;
  onTitle?: (value: string) => void;
  onBody: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  busy: boolean;
  submitLabel: string;
  placeholder: string;
}) {
  return (
    <div className="talk-compose">
      <CommunityRules />
      {!canPost(viewer) ? (
        <SignIn viewer={viewer} />
      ) : (
    <form className="talk-form" onSubmit={onSubmit}>
      {viewer.name ? (
        <p className="talk-as">
          <Avatar name={viewer.name} image={viewer.image} />
          <span>Posting as {viewer.name}</span>
        </p>
      ) : null}
      {onTitle ? (
        <label>
          Title
          <input value={title ?? ""} onChange={(event) => onTitle(event.target.value)} maxLength={TITLE_MAX} required />
        </label>
      ) : null}
      <label>
        {onTitle ? "Post" : "Comment"}
        <textarea
          value={body}
          onChange={(event) => onBody(event.target.value)}
          maxLength={BODY_MAX}
          required
          rows={onTitle ? 5 : 3}
          placeholder={placeholder}
        />
      </label>
      <div className="talk-form-row">
        <button className="btn btn-cyan talk-submit" type="submit" disabled={busy}>
          {busy ? "Sending…" : submitLabel}
        </button>
        <span className="talk-count">{body.length}/{BODY_MAX}</span>
      </div>
    </form>
      )}
    </div>
  );
}

export function CommunityBoard({ threadId }: { threadId?: string }) {
  const navigate = useNavigate();
  const { feed, error, setError, reload } = useFeed(
    () => (threadId ? getThread({ data: { id: threadId } }) : listThreads()),
    [threadId],
  );
  const polls = usePollBoard();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await createThread({ data: { title, body } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setBody("");
      if (result.held) {
        setNotice(HELD_NOTICE);
        reload();
        return;
      }
      await navigate({ to: "/community", search: { thread: result.id } });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  const viewer = feed?.viewer;
  const posts = feed?.posts ?? [];
  const root = threadId ? posts.find((post) => post.id === threadId) ?? null : null;

  return (
    <div className="talk-column">
      {!threadId ? <CommunityPolls part="board" state={polls} /> : null}
      {error ? <p className="wallet-error" role="alert">{error}</p> : null}
      {notice ? <p className="talk-note">{notice}</p> : null}
      {!feed ? <p className="lede">Opening the board…</p> : null}
      {feed && !threadId ? (
        <>
          <Composer
            viewer={viewer!}
            title={title}
            body={body}
            onTitle={setTitle}
            onBody={setBody}
            onSubmit={onCreate}
            busy={busy}
            submitLabel="Start thread"
            placeholder="What do you want to talk about?"
          />
          {posts.length === 0 ? <p className="talk-empty">No threads yet. Be the first.</p> : null}
          <div className="talk-list">
            {posts.map((post) => (
              <article key={post.id} className="talk-card">
                <div className="talk-row">
                  <Avatar name={post.author.name} image={post.author.image} />
                  <div>
                    <h2>
                      <Link to="/community" search={{ thread: post.id }}>{post.title || "Removed"}</Link>
                    </h2>
                    <p className="talk-meta">
                      <span>{post.author.name}</span>
                      <time dateTime={post.createdAt}>{formatWhen(post.createdAt)}</time>
                      <span>{post.replyCount === 1 ? "1 reply" : `${post.replyCount} replies`}</span>
                    </p>
                    <p className="talk-preview">{previewText(post.body)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
      {feed && threadId && root && viewer ? (
        <>
          <p className="talk-back">
            <Link to="/community" search={{ thread: undefined }}>All threads</Link>
          </p>
          <PostTree
            posts={posts}
            parentId={null}
            viewer={viewer}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            setNotice={setNotice}
            reload={reload}
            mode="board"
          />
        </>
      ) : null}
      {feed && viewer?.isAdmin ? (
        <>
          <CommunityPolls part="tools" state={polls} />
          <ReviewPanel
            items={feed.queue}
            notes={feed.noteQueue}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            setNotice={setNotice}
            reload={reload}
          />
          <BanPanel bans={feed.bans} busy={busy} setBusy={setBusy} setError={setError} reload={reload} />
        </>
      ) : null}
    </div>
  );
}

export function ClipComments({ clipId }: { clipId: string }) {
  const { feed, error, setError, reload } = useFeed(() => listClipComments({ data: { clipId } }), [clipId]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function onComment(event: FormEvent) {
    event.preventDefault();
    if (!feed) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await commentOnClip({ data: { clipId, body } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setNotice(result.held ? HELD_NOTICE : "Posted.");
      reload();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  const posts = feed?.posts ?? [];
  const top = postsByParent(posts, null);

  return (
    <div className="talk-clip">
      <h3>Comments</h3>
      {error ? <p className="wallet-error" role="alert">{error}</p> : null}
      {notice ? <p className="talk-note">{notice}</p> : null}
      {!feed ? <p className="talk-meta">Loading comments…</p> : null}
      {feed && top.length === 0 ? <p className="talk-empty">No comments yet.</p> : null}
      {feed ? (
        <PostTree
          posts={posts}
          parentId={null}
          viewer={feed.viewer}
          busy={busy}
          setBusy={setBusy}
          setError={setError}
          setNotice={setNotice}
          reload={reload}
          mode="clip"
          clipId={clipId}
        />
      ) : null}
      {feed ? (
        <Composer
          viewer={feed.viewer}
          body={body}
          onBody={setBody}
          onSubmit={onComment}
          busy={busy}
          submitLabel="Comment"
          placeholder="Say something about this clip."
        />
      ) : null}
    </div>
  );
}

function PostTree({
  posts,
  parentId,
  viewer,
  busy,
  setBusy,
  setError,
  setNotice,
  reload,
  mode,
  clipId,
  depth = 0,
}: {
  posts: TalkPost[];
  parentId: string | null;
  viewer: TalkViewer;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
  reload: () => void;
  mode: "board" | "clip";
  clipId?: string;
  depth?: number;
}) {
  const children = postsByParent(posts, parentId);
  if (children.length === 0) return null;
  const nested = depth === 0 ? "talk-thread" : depth > 3 ? "talk-children talk-children-flat" : "talk-children";
  return (
    <div className={nested}>
      {children.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          posts={posts}
          viewer={viewer}
          busy={busy}
          setBusy={setBusy}
          setError={setError}
          setNotice={setNotice}
          reload={reload}
          mode={mode}
          clipId={clipId}
          depth={depth}
        />
      ))}
    </div>
  );
}

function PostCard({
  post,
  posts,
  viewer,
  busy,
  setBusy,
  setError,
  setNotice,
  reload,
  mode,
  clipId,
  depth,
}: {
  post: TalkPost;
  posts: TalkPost[];
  viewer: TalkViewer;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
  reload: () => void;
  mode: "board" | "clip";
  clipId?: string;
  depth: number;
}) {
  const [open, setOpen] = useState<"reply" | "report" | "ban" | "remove" | null>(null);
  const [text, setText] = useState("");
  const mine = viewer.userId === post.author.id;
  const canWrite = canPost(viewer);

  async function act(work: () => Promise<{ ok: true; held?: boolean } | { ok: false; error: string }>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await work();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(null);
      setText("");
      setNotice(result.held ? HELD_NOTICE : "Done.");
      reload();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function onReply(event: FormEvent) {
    event.preventDefault();
    await act(() =>
      mode === "clip" && clipId
        ? commentOnClip({ data: { clipId, parentId: post.id, body: text } })
        : replyToPost({ data: { parentId: post.id, body: text } }),
    );
  }

  return (
    <article className="talk-card">
      <div className="talk-row">
        <Avatar name={post.author.name} image={post.author.image} />
        <div>
          {depth === 0 && post.title ? <h2>{post.title}</h2> : null}
          <p className="talk-meta">
            <span>{post.author.name}</span>
            <time dateTime={post.createdAt}>{formatWhen(post.createdAt)}</time>
            {viewer.isAdmin && post.reportCount > 0 ? <span className="talk-flag">{post.reportCount} reports</span> : null}
            {post.reportedByMe ? <span>Reported</span> : null}
          </p>
          <p className={post.deleted ? "talk-body talk-removed" : "talk-body"}>
            <TalkText text={post.body} />
          </p>
          <div className="talk-actions">
            {canWrite && !post.deleted ? (
              <button type="button" className="talk-btn" onClick={() => setOpen(open === "reply" ? null : "reply")} aria-expanded={open === "reply"}>
                Reply
              </button>
            ) : null}
            {canWrite && !mine && !post.deleted ? (
              <button type="button" className="talk-btn" onClick={() => setOpen(open === "report" ? null : "report")} aria-expanded={open === "report"}>
                Report
              </button>
            ) : null}
            {viewer.signedIn && (mine || viewer.isAdmin) && !post.deleted ? (
              <button type="button" className="talk-btn talk-btn-danger" onClick={() => setOpen(open === "remove" ? null : "remove")} aria-expanded={open === "remove"}>
                Remove
              </button>
            ) : null}
            {viewer.isAdmin && !mine ? (
              <button type="button" className="talk-btn talk-btn-danger" onClick={() => setOpen(open === "ban" ? null : "ban")} aria-expanded={open === "ban"}>
                Ban
              </button>
            ) : null}
          </div>
          {open === "reply" ? (
            <form className="talk-form talk-inline" onSubmit={onReply}>
              <label>
                Reply
                <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={BODY_MAX} required rows={3} />
              </label>
              <button className="btn btn-cyan talk-submit" type="submit" disabled={busy}>Reply</button>
            </form>
          ) : null}
          {open === "report" ? (
            <form
              className="talk-form talk-inline"
              onSubmit={(event) => {
                event.preventDefault();
                void act(() => reportPost({ data: { postId: post.id, reason: text } }));
              }}
            >
              <label>
                Why report this?
                <input value={text} onChange={(event) => setText(event.target.value)} maxLength={300} placeholder="Optional" />
              </label>
              <button className="btn btn-ghost talk-submit" type="submit" disabled={busy}>Send report</button>
            </form>
          ) : null}
          {open === "remove" ? (
            <form
              className="talk-form talk-inline"
              onSubmit={(event) => {
                event.preventDefault();
                void act(() => removePost({ data: { postId: post.id } }));
              }}
            >
              <p className="talk-note">Remove this post? The replies stay.</p>
              <button className="btn btn-ghost talk-submit" type="submit" disabled={busy}>Remove it</button>
            </form>
          ) : null}
          {open === "ban" ? (
            <form
              className="talk-form talk-inline"
              onSubmit={(event) => {
                event.preventDefault();
                void act(() => banUser({ data: { userId: post.author.id, reason: text } }));
              }}
            >
              <label>
                Ban {post.author.name}
                <input value={text} onChange={(event) => setText(event.target.value)} maxLength={300} placeholder="Optional note" />
              </label>
              <button className="btn btn-ghost talk-submit" type="submit" disabled={busy}>Ban account</button>
            </form>
          ) : null}
          {post.deleted ? null : (
            <CommunityNotes
              post={post}
              viewer={viewer}
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              setNotice={setNotice}
              reload={reload}
            />
          )}
        </div>
      </div>
      <PostTree
        posts={posts}
        parentId={post.id}
        viewer={viewer}
        busy={busy}
        setBusy={setBusy}
        setError={setError}
        setNotice={setNotice}
        reload={reload}
        mode={mode}
        clipId={clipId}
        depth={depth + 1}
      />
    </article>
  );
}

function CommunityNotes({
  post,
  viewer,
  busy,
  setBusy,
  setError,
  setNotice,
  reload,
}: {
  post: TalkPost;
  viewer: TalkViewer;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const notes = post.notes;
  const already = viewer.userId != null && notes.some((note) => note.author.id === viewer.userId);
  const canAdd = canPost(viewer) && viewer.userId !== post.author.id && !already;
  if (notes.length === 0 && !canAdd) return null;

  function run(work: () => Promise<{ ok: true; held?: boolean } | { ok: false; error: string }>, done: string) {
    setBusy(true);
    setError("");
    setNotice("");
    work()
      .then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setOpen(false);
        setText("");
        if (done) setNotice(result.held ? HELD_NOTICE : done);
        reload();
      })
      .catch((err: unknown) => setError(messageOf(err)))
      .finally(() => setBusy(false));
  }

  return (
    <section className="talk-context" aria-label="Community notes">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          viewer={viewer}
          busy={busy}
          onRate={(helpful) => run(() => rateNote({ data: { noteId: note.id, helpful } }), "")}
          onReport={(reason) => run(() => reportNote({ data: { noteId: note.id, reason } }), "Report sent.")}
          onRemove={() => run(() => removeNote({ data: { noteId: note.id } }), "Note removed.")}
        />
      ))}
      {canAdd && !open ? (
        <button type="button" className="talk-btn" onClick={() => setOpen(true)}>
          Add context
        </button>
      ) : null}
      {canAdd && open ? (
        <form
          className="talk-form talk-inline"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => createNote({ data: { postId: post.id, body: text } }), "Note proposed. It shows after enough helpful ratings.");
          }}
        >
          <CommunityRules />
          <label>
            Add context
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={NOTE_MAX}
              required
              rows={3}
              placeholder="What should readers know about this post?"
            />
          </label>
          <p className="talk-meta">It shows publicly after enough people mark it helpful.</p>
          <div className="talk-form-row">
            <button className="btn btn-cyan talk-submit" type="submit" disabled={busy}>
              Propose note
            </button>
            <button type="button" className="talk-btn" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <span className="talk-count">{text.length}/{NOTE_MAX}</span>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function NoteCard({
  note,
  viewer,
  busy,
  onRate,
  onReport,
  onRemove,
}: {
  note: TalkNote;
  viewer: TalkViewer;
  busy: boolean;
  onRate: (helpful: boolean) => void;
  onReport: (reason: string) => void;
  onRemove: () => void;
}) {
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const mine = viewer.userId === note.author.id;
  const canRate = canPost(viewer) && !mine && note.status !== "held";
  const canReport = canPost(viewer) && !mine && note.status !== "held";
  const label = note.status === "held" ? "Held for review" : note.status === "pending" ? "Waiting for ratings" : "Community note";
  return (
    <div className="talk-context-card">
      <p className="talk-meta">
        <span>{label}</span>
        <span>{note.author.name}</span>
        <time dateTime={note.createdAt}>{formatWhen(note.createdAt)}</time>
        {viewer.isAdmin && note.reportCount > 0 ? <span className="talk-flag">{note.reportCount} reports</span> : null}
        {note.reportedByMe ? <span>Reported</span> : null}
      </p>
      <p className="talk-body">
        <TalkText text={note.body} />
      </p>
      <p className="talk-meta">
        <span>{note.helpful} helpful</span>
        <span>{note.notHelpful} not helpful</span>
      </p>
      {canRate || viewer.isAdmin ? (
        <div className="talk-actions">
          {canRate ? (
            <>
              <button
                type="button"
                className={note.myRating === "helpful" ? "talk-btn talk-btn-on" : "talk-btn"}
                aria-pressed={note.myRating === "helpful"}
                disabled={busy}
                onClick={() => onRate(true)}
              >
                Helpful
              </button>
              <button
                type="button"
                className={note.myRating === "not" ? "talk-btn talk-btn-on" : "talk-btn"}
                aria-pressed={note.myRating === "not"}
                disabled={busy}
                onClick={() => onRate(false)}
              >
                Not helpful
              </button>
            </>
          ) : null}
          {canReport ? (
            <button type="button" className="talk-btn" disabled={busy} aria-expanded={reporting} onClick={() => setReporting((open) => !open)}>
              Report
            </button>
          ) : null}
          {viewer.isAdmin ? (
            <button type="button" className="talk-btn talk-btn-danger" disabled={busy} onClick={onRemove}>
              Remove note
            </button>
          ) : null}
        </div>
      ) : null}
      {reporting ? (
        <form
          className="talk-form talk-inline"
          onSubmit={(event) => {
            event.preventDefault();
            onReport(reason);
            setReporting(false);
            setReason("");
          }}
        >
          <label>
            Why report this note?
            <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Optional" />
          </label>
          <button className="btn btn-ghost talk-submit" type="submit" disabled={busy}>Send report</button>
        </form>
      ) : null}
    </div>
  );
}

function ReviewPanel({
  items,
  notes,
  busy,
  setBusy,
  setError,
  setNotice,
  reload,
}: {
  items: TalkReview[];
  notes: TalkNoteReview[];
  busy: boolean;
  setBusy: (value: boolean) => void;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
  reload: () => void;
}) {
  return (
    <section className="talk-bans talk-queue" aria-label="Review queue">
      <h2>Review queue</h2>
      <p className="talk-note">Held posts and notes stay hidden until you approve, delete, or ban.</p>
      {items.length === 0 && notes.length === 0 ? <p className="talk-empty">Nothing waiting for review.</p> : null}
      <ul>
        {items.map((item) => (
          <QueueItem
            key={item.id}
            item={item}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            setNotice={setNotice}
            reload={reload}
          />
        ))}
      </ul>
      {notes.length > 0 ? (
        <>
          <h3>Community notes</h3>
          <ul>
            {notes.map((note) => (
              <NoteQueueItem
                key={note.id}
                note={note}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                setNotice={setNotice}
                reload={reload}
              />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function NoteQueueItem({
  note,
  busy,
  setBusy,
  setError,
  setNotice,
  reload,
}: {
  note: TalkNoteReview;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
  reload: () => void;
}) {
  const [banOpen, setBanOpen] = useState(false);
  const [reason, setReason] = useState("");
  const strike = proposedStrikeNote(note.proposedStrikes);

  function run(work: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setBusy(true);
    setError("");
    setNotice("");
    work()
      .then((result) => {
        if (!result.ok) setError(result.error);
        else {
          setBanOpen(false);
          setReason("");
          setNotice("Done.");
          reload();
        }
      })
      .catch((err: unknown) => setError(messageOf(err)))
      .finally(() => setBusy(false));
  }

  return (
    <li>
      <div>
        <p className="talk-meta">
          <strong>{note.author.name}</strong>
          <span>{note.place}</span>
          <time dateTime={note.createdAt}>{formatWhen(note.createdAt)}</time>
          {note.status === "held" ? <span className="talk-flag">Pending · {note.hiddenReason}</span> : null}
          {note.reportCount > 0 ? <span className="talk-flag">{note.reportCount} reports</span> : null}
          {strike ? <span>{strike}</span> : null}
        </p>
        <p className="talk-body">{note.body}</p>
        <p className="talk-preview">On: {note.postPreview}</p>
      </div>
      <div className="talk-actions">
        {note.status === "held" ? (
          <button type="button" className="talk-btn" disabled={busy} onClick={() => run(() => restoreNote({ data: { noteId: note.id } }))}>
            Approve
          </button>
        ) : null}
        <button type="button" className="talk-btn talk-btn-danger" disabled={busy} onClick={() => run(() => removeNote({ data: { noteId: note.id } }))}>
          Delete
        </button>
        <button type="button" className="talk-btn talk-btn-danger" disabled={busy} aria-expanded={banOpen} onClick={() => setBanOpen((open) => !open)}>
          Ban
        </button>
      </div>
      {banOpen ? (
        <form
          className="talk-form talk-inline"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => banUser({ data: { userId: note.author.id, reason } }));
          }}
        >
          <label>
            Ban {note.author.name}
            <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Optional note" />
          </label>
          <button className="btn btn-ghost talk-submit" type="submit" disabled={busy}>Ban account</button>
        </form>
      ) : null}
    </li>
  );
}

function QueueItem({
  item,
  busy,
  setBusy,
  setError,
  setNotice,
  reload,
}: {
  item: TalkReview;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
  reload: () => void;
}) {
  const [banOpen, setBanOpen] = useState(false);
  const [note, setNote] = useState("");
  const strike = proposedStrikeNote(item.proposedStrikes);

  function run(work: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setBusy(true);
    setError("");
    setNotice("");
    work()
      .then((result) => {
        if (!result.ok) setError(result.error);
        else {
          setBanOpen(false);
          setNote("");
          setNotice("Done.");
          reload();
        }
      })
      .catch((err: unknown) => setError(messageOf(err)))
      .finally(() => setBusy(false));
  }

  return (
    <li>
      <div>
        <p className="talk-meta">
          <strong>{item.author.name}</strong>
          <span>{reviewPlace(item.scope)}</span>
          <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
          {item.hidden ? <span className="talk-flag">Pending · {item.hiddenReason}</span> : null}
          {item.reportCount > 0 ? <span className="talk-flag">{item.reportCount} reports</span> : null}
          {strike ? <span>{strike}</span> : null}
        </p>
        {item.title ? <p className="talk-preview">{item.title}</p> : null}
        <p className="talk-body">{item.body}</p>
      </div>
      <div className="talk-actions">
        {item.hidden ? (
          <button type="button" className="talk-btn" disabled={busy} onClick={() => run(() => restorePost({ data: { postId: item.id } }))}>
            Approve
          </button>
        ) : null}
        <button type="button" className="talk-btn talk-btn-danger" disabled={busy} onClick={() => run(() => removePost({ data: { postId: item.id } }))}>
          Delete
        </button>
        <button type="button" className="talk-btn talk-btn-danger" disabled={busy} onClick={() => setBanOpen((open) => !open)} aria-expanded={banOpen}>
          Ban
        </button>
      </div>
      {banOpen ? (
        <form
          className="talk-form talk-inline"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => banUser({ data: { userId: item.author.id, reason: note } }));
          }}
        >
          <label>
            Ban {item.author.name}
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Optional note" />
          </label>
          <button className="btn btn-ghost talk-submit" type="submit" disabled={busy}>Ban account</button>
        </form>
      ) : null}
    </li>
  );
}

function BanPanel({
  bans,
  busy,
  setBusy,
  setError,
  reload,
}: {
  bans: TalkFeed["bans"];
  busy: boolean;
  setBusy: (value: boolean) => void;
  setError: (value: string) => void;
  reload: () => void;
}) {
  return (
    <section className="talk-bans" aria-label="Banned accounts">
      <h2>Banned accounts</h2>
      {bans.length === 0 ? <p className="talk-empty">Nobody is banned.</p> : null}
      <ul>
        {bans.map((ban) => (
          <li key={ban.userId}>
            <span>
              <strong>{ban.name}</strong>
              {ban.reason ? ` · ${ban.reason}` : ""}
            </span>
            <button
              type="button"
              className="talk-btn"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError("");
                unbanUser({ data: { userId: ban.userId } })
                  .then((result) => {
                    if (!result.ok) setError(result.error);
                    else reload();
                  })
                  .catch((err: unknown) => setError(messageOf(err)))
                  .finally(() => setBusy(false));
              }}
            >
              Unban
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
