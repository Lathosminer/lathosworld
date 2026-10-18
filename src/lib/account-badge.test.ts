import { test } from "node:test";
import assert from "node:assert/strict";
import { badgeName } from "./account-badge.ts";

test("badge name: display name, else email local part, never a full email", () => {
  assert.equal(badgeName("Lathos", "a@b.com"), "Lathos");
  assert.equal(badgeName("  Jared   Hooker ", null), "Jared Hooker");
  assert.equal(badgeName("", "lathosx@gmail.com"), "lathosx");
  assert.equal(badgeName("someone@mail.com", "lathosx@gmail.com"), "lathosx");
  assert.equal(badgeName(null, null), "Fan");
  assert.equal(badgeName("x".repeat(80), null).length, 40);
});
