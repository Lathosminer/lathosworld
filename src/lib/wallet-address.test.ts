import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LWRLD_CONTRACT,
  WALLET_HELP_HREF,
  checkBscAddress,
  keccak256Hex,
  maskAddress,
  toChecksumAddress,
} from "./wallet-address.ts";
import { LWRLD } from "./trust.ts";
import { OFFICIAL_CONTRACT, effectiveWalletStatus, walletIneligible } from "./giveaway.ts";
import { safeNext } from "./safe-next.ts";

test("keccak-256 known vectors", () => {
  assert.equal(keccak256Hex(""), "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
  assert.equal(keccak256Hex("abc"), "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45");
});

// EIP-55 spec vectors.
const EIP55 = [
  "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
  "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
  "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
  "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb",
  "0x52908400098527886E0F7030069857D2E4169EE7",
  "0x8617E340B3D01FA5F11F306F4090FD50E238070D",
  "0xde709f2102306220921060314715629080e2fb77",
  "0x27b1fdb04752bbc536007a920d24acb045561c26",
];

test("EIP-55 checksums match the spec", () => {
  for (const address of EIP55) assert.equal(toChecksumAddress(address.toLowerCase()), address);
});

test("valid addresses: checksummed, all-lowercase, all-uppercase", () => {
  for (const address of EIP55) {
    const result = checkBscAddress(address);
    assert.equal(result.ok, true, address);
    if (result.ok) {
      assert.equal(result.address, toChecksumAddress(address));
      assert.equal(result.key, address.toLowerCase());
    }
  }
  const lower = checkBscAddress("  0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed ");
  assert.deepEqual(lower, { ok: true, address: EIP55[0], key: EIP55[0]!.toLowerCase() });
  const upper = checkBscAddress("0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED");
  assert.equal(upper.ok && upper.address, EIP55[0]);
});

test("bad checksum, wrong length, junk, zero address, and the token contract are rejected", () => {
  assert.equal(checkBscAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeD").ok, false); // last char case flipped
  assert.equal(checkBscAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beae").ok, false); // 39 hex
  assert.equal(checkBscAddress("5aaeb6053f3e94c9b9a09f33669435e7ef1beaed").ok, false); // no 0x
  assert.equal(checkBscAddress("0xZZaeb6053f3e94c9b9a09f33669435e7ef1beaed").ok, false);
  assert.equal(checkBscAddress("bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2").ok, false);
  assert.equal(checkBscAddress("").ok, false);
  assert.equal(checkBscAddress(null).ok, false);
  assert.equal(checkBscAddress("0x0000000000000000000000000000000000000000").ok, false);
  assert.equal(checkBscAddress(LWRLD_CONTRACT).ok, false);
  assert.equal(checkBscAddress(LWRLD_CONTRACT.toUpperCase().replace("0X", "0x")).ok, false);
  assert.equal(checkBscAddress(toChecksumAddress(LWRLD_CONTRACT)).ok, false);
});

test("seed phrases and private keys get a warning, never accepted", () => {
  const phrase = checkBscAddress("abandon ability able about above absent absorb abstract absurd abuse access accident");
  assert.equal(phrase.ok, false);
  assert.match(phrase.ok ? "" : phrase.error, /recovery phrase/i);
  const key = checkBscAddress(`0x${"ab".repeat(32)}`);
  assert.equal(key.ok, false);
  assert.match(key.ok ? "" : key.error, /private key/i);
});

test("contract constants agree", () => {
  assert.equal(LWRLD_CONTRACT, LWRLD);
  assert.equal(OFFICIAL_CONTRACT, LWRLD);
});

test("masking shows only the ends", () => {
  assert.equal(maskAddress(EIP55[0]), "0x5aAe...eAed");
  assert.equal(maskAddress(null), "");
  assert.equal(maskAddress("nope"), "Invalid");
});

test("wallet eligibility: required, shared wallets flagged unless cleared", () => {
  const a = EIP55[0]!;
  assert.equal(effectiveWalletStatus(null, "none", 0), "none");
  assert.equal(effectiveWalletStatus(a, "ok", 1), "ok");
  assert.equal(effectiveWalletStatus(a, "ok", 2), "flagged");
  assert.equal(effectiveWalletStatus(a, "cleared", 2), "cleared");
  assert.equal(effectiveWalletStatus(a, "rejected", 1), "rejected");
  assert.equal(walletIneligible(null, "none"), "No wallet address");
  assert.match(walletIneligible(a, "flagged") ?? "", /Flagged & Excluded/);
  assert.equal(walletIneligible(a, "rejected"), "Wallet rejected");
  assert.equal(walletIneligible(a, "ok"), null);
  assert.equal(walletIneligible(a, "cleared"), null);
});

test("need-a-wallet link stays on the site", () => {
  assert.ok(WALLET_HELP_HREF.startsWith("/") && !WALLET_HELP_HREF.startsWith("//"));
});

test("login next only allows same-site paths", () => {
  assert.equal(safeNext("/giveaway"), "/giveaway");
  assert.equal(safeNext("/giveaway?x=1#entries"), "/giveaway?x=1#entries");
  assert.equal(safeNext("//evil.com"), undefined);
  assert.equal(safeNext("/\\evil.com"), undefined);
  assert.equal(safeNext("https://evil.com"), undefined);
  assert.equal(safeNext("giveaway"), undefined);
  assert.equal(safeNext("/a\nb"), undefined);
  assert.equal(safeNext(undefined), undefined);
});
