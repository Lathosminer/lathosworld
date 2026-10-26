import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { COMMUNITY_COUNT_FALLBACK } from "./community-counts.ts";
import {
  EMPTY_COMMUNITY,
  applyCommunityFallback,
  hasCommunity,
  parseTikTokProfileFollowers,
  parseTikTokUserInfo,
  parseTwitchFollowers,
  parseXFollowers,
  parseXProfileFollowers,
  parseYouTubeSubscribers,
} from "./community.ts";
import { getCommunityStats, resetCommunityCaches } from "./community.server.ts";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const ENV_KEYS = [
  "TWITCH_CLIENT_ID",
  "TWITCH_CLIENT_SECRET",
  "TWITCH_USER_TOKEN",
  "TWITCH_REFRESH_TOKEN",
  "YOUTUBE_API_KEY",
  "X_BEARER_TOKEN",
  "TIKTOK_ACCESS_TOKEN",
] as const;

const RECENT_BODY = {
  total: 12,
  data: [
    { user_id: "999", user_login: "nova", user_name: "Nova", followed_at: "2026-10-01T00:00:00Z" },
  ],
};

type FetchCall = { url: string; method: string; body: string; headers: Record<string, string> };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function bodyText(body: BodyInit | null | undefined): string {
  if (body == null) return "";
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  return "";
}

function headerMap(init?: RequestInit): Record<string, string> {
  const headers = new Headers(init?.headers);
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function installFetch(handler: (call: FetchCall) => Response): {
  calls: FetchCall[];
  restore: () => void;
} {
  const calls: FetchCall[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const call: FetchCall = {
      url,
      method: (init?.method ?? "GET").toUpperCase(),
      body: bodyText(init?.body),
      headers: headerMap(init),
    };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = real;
    },
  };
}

function form(call: FetchCall): URLSearchParams {
  return new URLSearchParams(call.body);
}

function isTokenPost(call: FetchCall, grant: string): boolean {
  return call.method === "POST" && call.url === TOKEN_URL && form(call).get("grant_type") === grant;
}

function bearer(call: FetchCall): string | null {
  const value = call.headers.authorization ?? "";
  return value.startsWith("Bearer ") ? value.slice("Bearer ".length) : null;
}

async function withTwitch(
  envVars: Record<string, string>,
  handler: (call: FetchCall) => Response,
  run: (calls: FetchCall[]) => Promise<void>,
): Promise<void> {
  const saved = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  resetCommunityCaches();
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(envVars)) process.env[key] = value;
  const fetchMock = installFetch(handler);
  try {
    await run(fetchMock.calls);
  } finally {
    fetchMock.restore();
    resetCommunityCaches();
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function appToken(call: FetchCall): Response | null {
  if (!isTokenPost(call, "client_credentials")) return null;
  return json({ access_token: "app-access", expires_in: 10_000 });
}

function users(call: FetchCall): Response | null {
  if (!call.url.includes("/helix/users")) return null;
  return json({ data: [{ id: "4242" }] });
}

function followersUrl(call: FetchCall, first: number): boolean {
  return call.url.includes("/helix/channels/followers") && call.url.includes(`first=${first}`);
}

const REFRESH_ENV = {
  TWITCH_CLIENT_ID: "client-id",
  TWITCH_CLIENT_SECRET: "client-secret",
  TWITCH_REFRESH_TOKEN: "env-refresh",
};

describe("community parsers", () => {
  it("hides an empty payload", () => {
    assert.equal(hasCommunity(EMPTY_COMMUNITY), false);
    assert.equal(hasCommunity(null), false);
  });

  it("keeps a twitch total and display names, not user ids", () => {
    const parsed = parseTwitchFollowers({
      total: 12,
      data: [
        {
          user_id: "999",
          user_login: "nova",
          user_name: "Nova",
          followed_at: "2026-10-01T00:00:00Z",
        },
        { user_id: "1", user_name: "", user_login: "quiet" },
      ],
    });
    assert.equal(parsed.total, 12);
    assert.deepEqual(parsed.recent, [
      { name: "Nova", followedAt: "2026-10-01T00:00:00Z" },
      { name: "quiet", followedAt: "" },
    ]);
    assert.equal(JSON.stringify(parsed).includes("999"), false);
  });

  it("drops a hidden YouTube subscriber count", () => {
    assert.equal(
      parseYouTubeSubscribers({
        items: [{ statistics: { hiddenSubscriberCount: true, subscriberCount: "10" } }],
      }),
      null,
    );
    assert.equal(
      parseYouTubeSubscribers({ items: [{ statistics: { subscriberCount: "3481" } }] }),
      3481,
    );
  });

  it("reads an X follower count", () => {
    assert.equal(parseXFollowers({ data: { public_metrics: { followers_count: 80 } } }), 80);
    assert.equal(parseXFollowers({}), null);
  });

  it("reads an X profile count only when the handle is on the page", () => {
    const escaped = `{"screen_name":"lathos563"} \\"relationship_counts\\":{\\"followers\\":227,\\"following\\":521}`;
    assert.equal(parseXProfileFollowers(escaped), 227);
    assert.equal(
      parseXProfileFollowers(`lathos563",followers:227,following:521,hasHighlights`),
      227,
    );
    assert.equal(parseXProfileFollowers(`"relationship_counts":{"followers":227}`), null);
    assert.equal(parseXProfileFollowers("Log in to X"), null);
  });

  it("reads a TikTok user.info follower count", () => {
    assert.equal(parseTikTokUserInfo({ data: { user: { follower_count: 4 } } }), 4);
    assert.equal(parseTikTokUserInfo({ data: { user: {} } }), null);
  });

  it("reads the TikTok profile count for lathos.world, not a suggested account", () => {
    const page = [
      '"uniqueId":"someone.else","stats":{"followerCount":999}',
      '"uniqueId":"lathos.world","nickname":"Lathos World","stats":{"followerCount":4,"followingCount":15}',
    ].join(" ");
    assert.equal(parseTikTokProfileFollowers(page), 4);
    assert.equal(parseTikTokProfileFollowers('"uniqueId":"someone.else","stats":{"followerCount":9}'), null);
  });

  it("fills a missing X or TikTok count from the config file", () => {
    assert.deepEqual(applyCommunityFallback({ ...EMPTY_COMMUNITY, twitch: 21, youtube: 11 }), {
      twitch: 21,
      youtube: 11,
      x: COMMUNITY_COUNT_FALLBACK.x,
      tiktok: COMMUNITY_COUNT_FALLBACK.tiktok,
      recent: [],
    });
    assert.equal(applyCommunityFallback({ ...EMPTY_COMMUNITY, x: 80, tiktok: 3 }).x, 80);
    assert.equal(hasCommunity({ ...EMPTY_COMMUNITY, tiktok: 4 }), true);
  });
});

describe("twitch refresh token", () => {
  afterEach(() => {
    mock.timers.reset();
    resetCommunityCaches();
  });

  it("exchanges a refresh token and lists recent followers", async () => {
    const logs: string[] = [];
    const methods = ["log", "info", "warn", "error", "debug"] as const;
    const originals = methods.map((name) => [name, console[name]] as const);
    for (const name of methods) {
      console[name] = (...args: unknown[]) => {
        logs.push(args.map((part) => String(part)).join(" "));
      };
    }
    try {
      await withTwitch(
        REFRESH_ENV,
        (call) => {
          const app = appToken(call);
          if (app) return app;
          if (isTokenPost(call, "refresh_token")) {
            const params = form(call);
            assert.equal(call.headers["content-type"], "application/x-www-form-urlencoded");
            assert.equal(params.get("refresh_token"), "env-refresh");
            assert.equal(params.get("client_id"), "client-id");
            assert.equal(params.get("client_secret"), "client-secret");
            assert.equal(call.url, TOKEN_URL);
            return json({
              access_token: "user-access",
              expires_in: 3600,
              refresh_token: "rotated-refresh",
            });
          }
          const listed = users(call);
          if (listed) return listed;
          if (followersUrl(call, 20)) {
            assert.equal(bearer(call), "user-access");
            assert.equal(call.headers["client-id"], "client-id");
            return json(RECENT_BODY);
          }
          throw new Error(`unexpected ${call.method} ${new URL(call.url).pathname}`);
        },
        async () => {
          const body = await getCommunityStats();
          assert.equal(body.twitch, 12);
          assert.deepEqual(body.recent, [{ name: "Nova", followedAt: "2026-10-01T00:00:00Z" }]);
          assert.equal(JSON.stringify(body).includes("999"), false);
          assert.equal(JSON.stringify(body).includes("env-refresh"), false);
          assert.equal(JSON.stringify(body).includes("user-access"), false);
          assert.equal(JSON.stringify(body).includes("client-secret"), false);
          assert.equal(process.env.TWITCH_REFRESH_TOKEN, "env-refresh");
        },
      );
    } finally {
      for (const [name, fn] of originals) console[name] = fn;
    }
    const written = logs.join("\n");
    assert.equal(written.includes("env-refresh"), false);
    assert.equal(written.includes("rotated-refresh"), false);
    assert.equal(written.includes("user-access"), false);
    assert.equal(written.includes("client-secret"), false);
  });

  it("keeps a cached user token across the stats window and rotates the refresh token after expiry", async () => {
    const start = 1_700_000_000_000;
    mock.timers.enable({ apis: ["Date"], now: start });
    const refreshTokens: string[] = [];
    const accessTokens: string[] = [];
    await withTwitch(
      REFRESH_ENV,
      (call) => {
        const app = appToken(call);
        if (app) return app;
        if (isTokenPost(call, "refresh_token")) {
          const sent = form(call).get("refresh_token") ?? "";
          refreshTokens.push(sent);
          const nextRefresh = refreshTokens.length === 1 ? "rotated-refresh" : "rotated-again";
          const access = refreshTokens.length === 1 ? "user-access-1" : "user-access-2";
          return json({ access_token: access, expires_in: 1000, refresh_token: nextRefresh });
        }
        const listed = users(call);
        if (listed) return listed;
        if (followersUrl(call, 20)) {
          const token = bearer(call);
          if (token) accessTokens.push(token);
          return json(RECENT_BODY);
        }
        throw new Error(`unexpected ${call.method} ${new URL(call.url).pathname}`);
      },
      async () => {
        await getCommunityStats();
        // Stats last 8 minutes. The user token lasts 1000s minus a 120s skew, so it is still warm.
        mock.timers.setTime(start + 8 * 60 * 1000 + 1);
        await getCommunityStats();
        assert.deepEqual(refreshTokens, ["env-refresh"]);
        // The second load refreshed the stats window. Step past that and past the token skew.
        mock.timers.setTime(start + 16 * 60 * 1000 + 2);
        await getCommunityStats();
      },
    );
    assert.deepEqual(refreshTokens, ["env-refresh", "rotated-refresh"]);
    assert.deepEqual(accessTokens, ["user-access-1", "user-access-1", "user-access-2"]);
  });

  it("keeps the previous refresh token when Twitch does not return a new one", async () => {
    const start = 1_700_000_000_000;
    mock.timers.enable({ apis: ["Date"], now: start });
    const refreshTokens: string[] = [];
    await withTwitch(
      REFRESH_ENV,
      (call) => {
        const app = appToken(call);
        if (app) return app;
        if (isTokenPost(call, "refresh_token")) {
          refreshTokens.push(form(call).get("refresh_token") ?? "");
          return json({ access_token: `user-access-${refreshTokens.length}`, expires_in: 1000 });
        }
        const listed = users(call);
        if (listed) return listed;
        if (followersUrl(call, 20)) return json(RECENT_BODY);
        throw new Error(`unexpected ${call.method} ${new URL(call.url).pathname}`);
      },
      async () => {
        await getCommunityStats();
        mock.timers.setTime(start + (1000 - 120) * 1000);
        await getCommunityStats();
      },
    );
    assert.deepEqual(refreshTokens, ["env-refresh", "env-refresh"]);
  });

  it("refreshes once after a followers 401 and does not refresh again if the retry is still unauthorized", async () => {
    const followerStatuses = [401, 401];
    const refreshTokens: string[] = [];
    await withTwitch(
      REFRESH_ENV,
      (call) => {
        const app = appToken(call);
        if (app) return app;
        if (isTokenPost(call, "refresh_token")) {
          refreshTokens.push(form(call).get("refresh_token") ?? "");
          return json({
            access_token: `user-access-${refreshTokens.length}`,
            expires_in: 3600,
            refresh_token: `rotated-${refreshTokens.length}`,
          });
        }
        const listed = users(call);
        if (listed) return listed;
        if (followersUrl(call, 20)) {
          const status = followerStatuses.shift() ?? 401;
          if (status === 200) return json(RECENT_BODY);
          return json({ message: "unauthorized" }, status);
        }
        if (followersUrl(call, 1)) {
          assert.equal(bearer(call), "app-access");
          return json({ total: 40, data: [] });
        }
        throw new Error(`unexpected ${call.method} ${new URL(call.url).pathname}`);
      },
      async () => {
        const body = await getCommunityStats();
        assert.equal(body.twitch, 40);
        assert.deepEqual(body.recent, []);
      },
    );
    assert.deepEqual(refreshTokens, ["env-refresh", "rotated-1"]);
    assert.equal(followerStatuses.length, 0);
  });

  it("uses the refreshed token when the followers retry succeeds", async () => {
    const statuses = [401, 200];
    const bearers: string[] = [];
    let refreshes = 0;
    await withTwitch(
      REFRESH_ENV,
      (call) => {
        const app = appToken(call);
        if (app) return app;
        if (isTokenPost(call, "refresh_token")) {
          refreshes += 1;
          return json({
            access_token: `user-access-${refreshes}`,
            expires_in: 3600,
            refresh_token: `rotated-${refreshes}`,
          });
        }
        const listed = users(call);
        if (listed) return listed;
        if (followersUrl(call, 20)) {
          bearers.push(bearer(call) ?? "");
          const status = statuses.shift() ?? 500;
          return status === 200 ? json(RECENT_BODY) : json({}, status);
        }
        throw new Error(`unexpected ${call.method} ${new URL(call.url).pathname}`);
      },
      async () => {
        const body = await getCommunityStats();
        assert.equal(body.twitch, 12);
        assert.equal(body.recent[0]?.name, "Nova");
      },
    );
    assert.deepEqual(bearers, ["user-access-1", "user-access-2"]);
    assert.equal(refreshes, 2);
    assert.equal(statuses.length, 0);
  });

  it("uses TWITCH_USER_TOKEN when no refresh token is set", async () => {
    await withTwitch(
      {
        TWITCH_CLIENT_ID: "client-id",
        TWITCH_CLIENT_SECRET: "client-secret",
        TWITCH_USER_TOKEN: "static-user",
      },
      (call) => {
        if (isTokenPost(call, "refresh_token")) throw new Error("refresh was not configured");
        const app = appToken(call);
        if (app) return app;
        const listed = users(call);
        if (listed) return listed;
        if (followersUrl(call, 20)) {
          assert.equal(bearer(call), "static-user");
          return json(RECENT_BODY);
        }
        throw new Error(`unexpected ${call.method} ${new URL(call.url).pathname}`);
      },
      async () => {
        const body = await getCommunityStats();
        assert.equal(body.twitch, 12);
        assert.equal(body.recent.length, 1);
      },
    );
  });

  it("falls back to the app-token count when the user-token path fails", async () => {
    const seen = new Set<string>();
    await withTwitch(
      { ...REFRESH_ENV, TWITCH_USER_TOKEN: "static-user" },
      (call) => {
        if (isTokenPost(call, "refresh_token")) return json({ message: "invalid" }, 400);
        const app = appToken(call);
        if (app) return app;
        const listed = users(call);
        if (listed) return listed;
        if (call.url.includes("/helix/channels/followers")) {
          seen.add(`${bearer(call)}:${call.url.includes("first=1") ? "count" : "list"}`);
          if (followersUrl(call, 1)) return json({ total: 7, data: [] });
          return json({}, 500);
        }
        throw new Error(`unexpected ${call.method} ${new URL(call.url).pathname}`);
      },
      async () => {
        const body = await getCommunityStats();
        assert.equal(body.twitch, 7);
        assert.deepEqual(body.recent, []);
      },
    );
    assert.deepEqual([...seen], ["app-access:count"]);
  });

  it("falls back to the count when a user-token followers call fails", async () => {
    let refreshes = 0;
    await withTwitch(
      REFRESH_ENV,
      (call) => {
        const app = appToken(call);
        if (app) return app;
        if (isTokenPost(call, "refresh_token")) {
          refreshes += 1;
          return json({
            access_token: "user-access",
            expires_in: 3600,
            refresh_token: "rotated-refresh",
          });
        }
        const listed = users(call);
        if (listed) return listed;
        if (followersUrl(call, 20)) return json({}, 500);
        if (followersUrl(call, 1)) return json({ total: 3, data: [] });
        throw new Error(`unexpected ${call.method} ${new URL(call.url).pathname}`);
      },
      async () => {
        const body = await getCommunityStats();
        assert.equal(body.twitch, 3);
        assert.deepEqual(body.recent, []);
        assert.equal(refreshes, 1);
      },
    );
  });

  it("shares one refresh when two loads overlap", async () => {
    let refreshes = 0;
    await withTwitch(
      REFRESH_ENV,
      (call) => {
        const app = appToken(call);
        if (app) return app;
        if (isTokenPost(call, "refresh_token")) {
          refreshes += 1;
          return json({
            access_token: "user-access",
            expires_in: 3600,
            refresh_token: "rotated-refresh",
          });
        }
        const listed = users(call);
        if (listed) return listed;
        if (followersUrl(call, 20)) return json(RECENT_BODY);
        throw new Error(`unexpected ${call.method} ${new URL(call.url).pathname}`);
      },
      async () => {
        const [a, b] = await Promise.all([getCommunityStats(), getCommunityStats()]);
        assert.equal(a.twitch, 12);
        assert.deepEqual(b.recent, a.recent);
        assert.equal(refreshes, 1);
      },
    );
  });
});

describe("x and tiktok counts", () => {
  it("uses the config fallback when live reads fail", async () => {
    await withTwitch(
      {},
      () => json({ message: "nope" }, 503),
      async () => {
        const body = await getCommunityStats();
        assert.equal(body.twitch, null);
        assert.equal(body.youtube, null);
        assert.equal(body.x, COMMUNITY_COUNT_FALLBACK.x);
        assert.equal(body.tiktok, COMMUNITY_COUNT_FALLBACK.tiktok);
      },
    );
  });

  it("prefers the X API over the public page and the static number", async () => {
    await withTwitch(
      { X_BEARER_TOKEN: "x-bearer" },
      (call) => {
        if (call.url.includes("api.x.com")) {
          assert.equal(bearer(call), "x-bearer");
          return json({ data: { public_metrics: { followers_count: 80 } } });
        }
        if (call.url.startsWith("https://x.com/")) {
          return new Response("lathos563,followers:1,following:1", {
            status: 200,
            headers: { "content-type": "text/html" },
          });
        }
        if (call.url.includes("tiktok.com")) return new Response("blocked", { status: 403 });
        return json({}, 404);
      },
      async () => {
        const body = await getCommunityStats();
        assert.equal(body.x, 80);
        assert.equal(body.tiktok, COMMUNITY_COUNT_FALLBACK.tiktok);
        assert.equal(JSON.stringify(body).includes("x-bearer"), false);
      },
    );
  });

  it("reads public profiles when no token is set", async () => {
    const xPage = `lathos563 \\"relationship_counts\\":{\\"followers\\":227,\\"following\\":1}`;
    const tiktokPage = `"uniqueId":"lathos.world","stats":{"followerCount":4,"followingCount":1}`;
    await withTwitch(
      {},
      (call) => {
        if (call.url.startsWith("https://x.com/")) {
          return new Response(xPage, { status: 200, headers: { "content-type": "text/html" } });
        }
        if (call.url.includes("www.tiktok.com")) {
          return new Response(tiktokPage, { status: 200, headers: { "content-type": "text/html" } });
        }
        return json({}, 404);
      },
      async () => {
        const body = await getCommunityStats();
        assert.equal(body.x, 227);
        assert.equal(body.tiktok, 4);
      },
    );
  });

  it("prefers the TikTok user token over the public page", async () => {
    await withTwitch(
      { TIKTOK_ACCESS_TOKEN: "tt-user" },
      (call) => {
        if (call.url.includes("open.tiktokapis.com")) {
          assert.equal(bearer(call), "tt-user");
          return json({ data: { user: { follower_count: 9 } } });
        }
        if (call.url.includes("www.tiktok.com")) {
          return new Response(`"uniqueId":"lathos.world","stats":{"followerCount":4}`, { status: 200 });
        }
        if (call.url.startsWith("https://x.com/")) return new Response("login wall", { status: 200 });
        return json({}, 404);
      },
      async () => {
        const body = await getCommunityStats();
        assert.equal(body.tiktok, 9);
        assert.equal(body.x, COMMUNITY_COUNT_FALLBACK.x);
        assert.equal(JSON.stringify(body).includes("tt-user"), false);
      },
    );
  });
});
