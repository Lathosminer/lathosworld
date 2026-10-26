import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalRedirect } from "./canonical-redirect.ts";

function ask(url: string, headers: Record<string, string> = {}) {
  return canonicalRedirect(new Request(url, { headers }));
}

function location(response: Response | null) {
  assert.ok(response);
  assert.equal(response.status, 301);
  return response.headers.get("location");
}

test("https apex is not redirected", () => {
  const response = ask("https://lathosworld.com/path?q=1", {
    host: "lathosworld.com",
    "cf-visitor": '{"scheme":"https"}',
  });
  assert.equal(response, null);
});

test("http apex is a single 301 to https apex", () => {
  const response = ask("http://lathosworld.com/path?q=1", {
    host: "lathosworld.com",
    "cf-visitor": '{"scheme":"http"}',
  });
  assert.equal(location(response), "https://lathosworld.com/path?q=1");
});

test("http www is a single 301 straight to https apex", () => {
  const response = ask("http://www.lathosworld.com/?ref=pin", {
    host: "www.lathosworld.com",
    "cf-visitor": '{"scheme":"http"}',
  });
  assert.equal(location(response), "https://lathosworld.com/?ref=pin");
});

test("https www is a single 301 to https apex", () => {
  const response = ask("https://www.lathosworld.com/", {
    host: "www.lathosworld.com",
    "cf-visitor": '{"scheme":"https"}',
  });
  assert.equal(location(response), "https://lathosworld.com/");
});

test("falls back to x-forwarded-proto when CF-Visitor is absent", () => {
  const response = ask("https://lathosworld.com/clips", {
    host: "lathosworld.com",
    "x-forwarded-proto": "http",
  });
  assert.equal(location(response), "https://lathosworld.com/clips");
});

test("uses CF-Visitor when the worker URL was already rewritten to https", () => {
  const response = ask("https://lathosworld.com/", {
    host: "lathosworld.com",
    "cf-visitor": '{"scheme":"http"}',
  });
  assert.equal(location(response), "https://lathosworld.com/");
});

test("preview and localhost hosts are not redirected", () => {
  assert.equal(ask("http://127.0.0.1:8080/", { host: "127.0.0.1:8080" }), null);
  assert.equal(ask("https://lathosworld.workers.dev/", { host: "lathosworld.workers.dev" }), null);
});
