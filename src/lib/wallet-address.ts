/**
 * BNB Smart Chain wallet addresses for the giveaway. Dependency-free so the client,
 * the server, and the unit tests share it.
 *
 * A BSC address is 0x + 40 hex characters (same format as Ethereum). Mixed-case
 * addresses carry an EIP-55 checksum, which catches most typos; all-lowercase and
 * all-uppercase addresses have no checksum and are accepted as typed.
 */

/** $LWRLD contract (same value as LWRLD in trust.ts). Prizes can't be sent to the token contract itself. */
export const LWRLD_CONTRACT = "0x3899ebf76c768c156df3073031a4518c5f947777";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Where the "Need a wallet?" link points: the wallet section on the home page. */
export const WALLET_HELP_HREF = "/#wallets";

/* ------------------------------- Keccak-256 ------------------------------- */

const MASK = (1n << 64n) - 1n;

const ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

/** Rotation offsets, indexed [x + 5 * y]. */
const ROTATIONS = [
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14,
];

function rotl(value: bigint, shift: number): bigint {
  if (shift === 0) return value;
  const s = BigInt(shift);
  return ((value << s) | (value >> (64n - s))) & MASK;
}

function keccakF(state: bigint[]): void {
  const c: bigint[] = new Array(5).fill(0n);
  const b: bigint[] = new Array(25).fill(0n);
  for (let round = 0; round < 24; round += 1) {
    for (let x = 0; x < 5; x += 1) {
      c[x] = state[x]! ^ state[x + 5]! ^ state[x + 10]! ^ state[x + 15]! ^ state[x + 20]!;
    }
    for (let x = 0; x < 5; x += 1) {
      const d = c[(x + 4) % 5]! ^ rotl(c[(x + 1) % 5]!, 1);
      for (let y = 0; y < 25; y += 5) state[x + y] = state[x + y]! ^ d;
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(state[x + 5 * y]!, ROTATIONS[x + 5 * y]!);
      }
    }
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) {
        state[x + 5 * y] = b[x + 5 * y]! ^ (~b[((x + 1) % 5) + 5 * y]! & MASK & b[((x + 2) % 5) + 5 * y]!);
      }
    }
    state[0] = state[0]! ^ ROUND_CONSTANTS[round]!;
  }
}

/** Keccak-256 (the original Keccak padding Ethereum uses, not NIST SHA3-256), as lowercase hex. */
export function keccak256Hex(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const rate = 136;
  const padded = new Uint8Array(Math.ceil((bytes.length + 1) / rate) * rate);
  padded.set(bytes);
  padded[bytes.length] = (padded[bytes.length] ?? 0) ^ 0x01;
  padded[padded.length - 1] = (padded[padded.length - 1] ?? 0) ^ 0x80;
  const state: bigint[] = new Array(25).fill(0n);
  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let lane = 0; lane < rate / 8; lane += 1) {
      let value = 0n;
      for (let k = 7; k >= 0; k -= 1) value = (value << 8n) | BigInt(padded[offset + lane * 8 + k]!);
      state[lane] = state[lane]! ^ value;
    }
    keccakF(state);
  }
  let out = "";
  for (let lane = 0; lane < 4; lane += 1) {
    let value = state[lane]!;
    for (let k = 0; k < 8; k += 1) {
      out += Number(value & 0xffn).toString(16).padStart(2, "0");
      value >>= 8n;
    }
  }
  return out;
}

/* -------------------------------- Addresses -------------------------------- */

/** EIP-55 mixed-case checksum form of a 0x + 40 hex address. */
export function toChecksumAddress(address: string): string {
  const lower = address.toLowerCase().replace(/^0x/, "");
  const hash = keccak256Hex(lower);
  let out = "0x";
  for (let i = 0; i < 40; i += 1) {
    const char = lower[i]!;
    out += parseInt(hash[i]!, 16) >= 8 ? char.toUpperCase() : char;
  }
  return out;
}

export type WalletResult =
  | { ok: true; address: string; key: string }
  | { ok: false; error: string };

/**
 * Checks a pasted wallet address. On success, `address` is the EIP-55 checksum form
 * (what we store and show) and `key` is the lowercase form (what we compare).
 */
export function checkBscAddress(raw: unknown): WalletResult {
  const text = String(raw ?? "").trim();
  if (!text) return { ok: false, error: "Add your BNB Smart Chain wallet address. It starts with 0x." };
  if (/\s/.test(text) && text.split(/\s+/).length >= 12) {
    return { ok: false, error: "That looks like a recovery phrase. Never share it with anyone. Paste your wallet address (0x…) instead." };
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(text)) {
    if (/^0x[0-9a-fA-F]{64}$/.test(text)) {
      return { ok: false, error: "That looks like a private key or a transaction id. Never share a private key. Paste your wallet address (0x + 40 characters)." };
    }
    return { ok: false, error: "That isn't a BNB Smart Chain address. It should be 0x followed by 40 letters and numbers." };
  }
  const body = text.slice(2);
  const mixed = body !== body.toLowerCase() && body !== body.toUpperCase();
  const checksummed = toChecksumAddress(text);
  if (mixed && checksummed !== text) {
    return { ok: false, error: "That address has a typo (its checksum doesn't match). Copy it again straight from your wallet." };
  }
  const key = text.toLowerCase();
  if (key === ZERO_ADDRESS) return { ok: false, error: "That's the empty (zero) address. Use your own wallet address." };
  if (key === LWRLD_CONTRACT) {
    return { ok: false, error: "That's the $LWRLD token contract, not a wallet. Use your own wallet address." };
  }
  return { ok: true, address: checksummed, key };
}

/** 0x1234...abcd for lists. Never use for the full value. */
export function maskAddress(address: string | null | undefined): string {
  const text = String(address ?? "");
  if (!/^0x[0-9a-fA-F]{40}$/.test(text)) return text ? "Invalid" : "";
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}
