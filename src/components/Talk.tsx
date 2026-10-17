import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BODY_MAX,
  COMMUNITY_RULES,
  HELD_NOTICE,
  TITLE_MAX,
  formatWhen,
  initial,
  muteMessage,
  postsByParent,
  previewText,
  reviewPlace,
  type TalkFeed,
  type TalkPost,
  type TalkReview,
  type TalkViewer,
} from "@/lib/discussion";
import {
  banUser,
  commentOnClip,
  createThread,
  getThread,
  listClipComments,
  listThreads,
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
  if (viewer.mutedUntil) return <p className="talk-note">{muteMessage(viewer.mutedUntil)}</p>;
  return null;
}

function canPost(viewer: TalkViewer): boolean {
  return viewer.signedIn && !viewer.banned && !viewer.mutedUntil;
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
      <p className="talk-rules">{COMMUNITY_RULES}</p>
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
          <ReviewPanel items={feed.queue} busy={busy} setBusy={setBusy} setError={setError} setNotice={setNotice} reload={reload} />
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

function ReviewPanel({
  items,
  busy,
  setBusy,
  setError,
  setNotice,
  reload,
}: {
  items: TalkReview[];
  busy: boolean;
  setBusy: (value: boolean) => void;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
  reload: () => void;
}) {
  function run(work: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setBusy(true);
    setError("");
    setNotice("");
    work()
      .then((result) => {
        if (!result.ok) setError(result.error);
        else {
          setNotice("Done.");
          reload();
        }
      })
      .catch((err: unknown) => setError(messageOf(err)))
      .finally(() => setBusy(false));
  }

  return (
    <section className="talk-bans talk-queue" aria-label="Review queue">
      <h2>Review queue</h2>
      {items.length === 0 ? <p className="talk-empty">Nothing waiting for review.</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <p className="talk-meta">
                <strong>{item.author.name}</strong>
                <span>{reviewPlace(item.scope)}</span>
                <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
                {item.hidden ? <span className="talk-flag">Hidden · {item.hiddenReason}</span> : null}
                {item.reportCount > 0 ? <span className="talk-flag">{item.reportCount} reports</span> : null}
              </p>
              {item.title ? <p className="talk-preview">{item.title}</p> : null}
              <p className="talk-body">{item.body}</p>
            </div>
            <div className="talk-actions">
              {item.hidden ? (
                <button type="button" className="talk-btn" disabled={busy} onClick={() => run(() => restorePost({ data: { postId: item.id } }))}>
                  Restore
                </button>
              ) : null}
              <button type="button" className="talk-btn talk-btn-danger" disabled={busy} onClick={() => run(() => removePost({ data: { postId: item.id } }))}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
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
