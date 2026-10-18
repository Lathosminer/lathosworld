-- Giveaway: a BNB Smart Chain wallet address is required to enter and receive prizes.
-- Applied with the other migrations/*.sql files (Neon on deploy, PGLite in preview).
--
-- wallet_address is stored in EIP-55 checksum form; compare with lower(wallet_address).
-- Not unique on purpose: a wallet reused by a different account is saved but flagged
-- for the owner to review (wallet_status = 'flagged'), and flagged entrants can't win.

alter table giveaway_entrant add column if not exists wallet_address text;

alter table giveaway_entrant drop constraint if exists giveaway_entrant_wallet_address_check;

alter table giveaway_entrant add constraint giveaway_entrant_wallet_address_check
  check (wallet_address is null or wallet_address ~ '^0x[0-9a-fA-F]{40}$');

alter table giveaway_entrant add column if not exists wallet_status text not null default 'none';

alter table giveaway_entrant drop constraint if exists giveaway_entrant_wallet_status_check;

alter table giveaway_entrant add constraint giveaway_entrant_wallet_status_check
  check (wallet_status in ('none', 'ok', 'flagged', 'cleared', 'rejected'));

alter table giveaway_entrant add column if not exists wallet_updated_at timestamptz;

create index if not exists giveaway_entrant_wallet_idx
  on giveaway_entrant (lower(wallet_address)) where wallet_address is not null;
