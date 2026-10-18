import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CLAIM_DAYS,
  COMMENT_ENTRIES_PER_DAY,
  GIVEAWAY_TITLE,
  MAX_ENTRIES_PER_PERSON,
  MIN_AGE,
  PRIZE_TIERS,
  PRIZE_TOTAL,
  TIKTOK_HANDLE,
  TWITCH_LOGIN,
  X_HANDLE,
  OFFICIAL_CONTRACT,
  SCAM_WARNING,
  formatTokens,
} from "@/lib/giveaway";
import { pageHead } from "@/lib/seo";
import { WALLET_HELP_HREF } from "@/lib/wallet-address";
import { getGiveaway, type GiveawayView } from "@/lib/giveaway.functions";

export const Route = createFileRoute("/giveaway/rules")({
  component: RulesPage,
  head: () => {
    const head = pageHead({
      path: "/giveaway/rules",
      title: "Official Rules · LathosWorld Giveaway",
      description:
        "Official Rules for the LathosWorld Million Token Giveaway. Free to enter. No purchase necessary. Void where prohibited. 18+.",
    });
    return { ...head, meta: [...head.meta, { name: "robots", content: "noindex, nofollow" }] };
  },
});

function RulesPage() {
  const [view, setView] = useState<GiveawayView | null>(null);
  useEffect(() => {
    let live = true;
    getGiveaway()
      .then((next) => live && setView(next))
      .catch(() => live && setView({ state: "hidden", isAdmin: false }));
    return () => {
      live = false;
    };
  }, []);

  return (
    <main className="gate gate-wide gw">
      <Link className="brand" to="/">
        <img src="/mark-sm.webp" width={40} height={40} alt="" decoding="async" />
        <span>lathosworld.com</span>
      </Link>
      <section className="section">
        <div className="wrap">
          {!view ? <p className="talk-meta">Loading…</p> : null}
          {view && view.state === "hidden" && !view.isAdmin ? (
            <>
              <h1>Nothing here yet</h1>
              <p className="serif-line">Check back soon.</p>
            </>
          ) : null}
          {view && (view.state !== "hidden" || view.isAdmin) ? <Rules /> : null}
        </div>
      </section>
    </main>
  );
}

function Rules() {
  return (
    <article className="gw-official">
      <p className="page-jump">
        <Link to="/giveaway" search={{}}>← Back to the giveaway</Link>
      </p>
      <p className="kicker">Official Rules</p>
      <h1>{GIVEAWAY_TITLE}</h1>
      <p className="serif-line">The LathosWorld Million Token Giveaway</p>

      <p>
        <strong>NO PURCHASE NECESSARY TO ENTER OR WIN. Buying $LWRLD or anything else does not increase your chances
        of winning. VOID WHERE PROHIBITED OR RESTRICTED BY LAW 🚫. Open to people {MIN_AGE} or older.</strong>
      </p>

      <h2>1. Sponsor</h2>
      <p>The giveaway is run by Lathos / LathosWorld (lathosworld.com), called "the Sponsor" here.</p>

      <h2>2. Who can enter</h2>
      <ul>
        <li>You must be {MIN_AGE} or older when you enter.</li>
        <li>
          You are responsible for making sure that entering and receiving a prize is legal where you live. The giveaway
          is void where prohibited or restricted by law.
        </li>
        <li>
          Not eligible: the Sponsor, the Sponsor's family, LathosWorld moderators, banned accounts, and site accounts
          created after the entry period ends.
        </li>
      </ul>

      <h2>3. Entry period</h2>
      <p>
        Entries close on <strong>July 9, 2027 at 11:59 PM Central Time</strong>. Entries made after that don't count.
      </p>

      <h2>4. How to enter (all free)</h2>
      <p>
        Sign in at lathosworld.com/giveaway and add a <strong>valid BNB Smart Chain wallet address that you control</strong>.
        A wallet address is required to enter and to receive a prize. Wallets are free (for example Trust Wallet,
        MetaMask, Binance Web3 Wallet, or Coinbase Wallet; see the <a href={WALLET_HELP_HREF}>wallet section</a>), so no
        purchase is necessary. Never share your seed phrase (recovery phrase) or private key with anyone, including us.
        We only ever need your public wallet address.
      </p>
      <p>Then each of these is one entry:</p>
      <ul>
        <li>Follow twitch.tv/{TWITCH_LOGIN} (checked by signing in with Twitch).</li>
        <li>Subscribe to the LathosWorld YouTube channel.</li>
        <li>Follow @{X_HANDLE} on X, plus one bonus entry for liking and reposting the giveaway post.</li>
        <li>Follow @{TIKTOK_HANDLE} on TikTok (self-reported, spot-checked).</li>
        <li>
          Comment on the giveaway page: each comment that stays up counts, up to {COMMENT_ENTRIES_PER_DAY} per day.
          Comments follow the community rules ("Common courtesy. Be respectful."). Comments held for review or removed
          don't count.
        </li>
      </ul>
      <p>
        <strong>Limit: {MAX_ENTRIES_PER_PERSON} entries per person in total.</strong> One entry list per person. Each
        social account can be entered by only one person, and each wallet address can be used by only one person. A
        wallet used on more than one account is flagged and excluded from the drawing until the Sponsor reviews it. Using
        several accounts, fake accounts, or bots to get extra entries is not allowed.
      </p>

      <h2>5. Drawing and odds</h2>
      <p>
        Winners are drawn at random, live on stream at twitch.tv/{TWITCH_LOGIN}, after the entry period ends. Each entry
        is one chance, so the drawing is weighted by how many entries each person has. Your odds depend on the total
        number of entries received. Before the drawing, the Sponsor may publish the entry list (display names and entry
        counts) on the giveaway page.
      </p>

      <h2>6. Prizes</h2>
      <p>Planned prizes, paid in $LWRLD tokens (up to {formatTokens(PRIZE_TOTAL)} $LWRLD in total):</p>
      <ul>
        {PRIZE_TIERS.map((tier) => (
          <li key={tier.place}>
            {tier.place}: {formatTokens(tier.amount)} $LWRLD{tier.count > 1 ? ` each (${tier.count} winners)` : ""}
          </li>
        ))}
      </ul>
      <p>
        These are planned amounts. The Sponsor announces the final amounts. The prize is $LWRLD tokens only.{" "}
        <strong>
          $LWRLD has no guaranteed cash value. The Sponsor makes no claims about its price, its future value, or any
          return. Nothing here is an investment offer or financial advice.
        </strong>{" "}
        Prizes can't be swapped for cash or anything else.
      </p>
      <p>
        <strong>How prizes are sent:</strong> prizes are sent in $LWRLD on BNB Smart Chain to the wallet address the
        winner entered. The only official $LWRLD contract is <code>{OFFICIAL_CONTRACT}</code>. If the address is invalid,
        on the wrong network, or not controlled by the winner (for example, an exchange deposit address that doesn't
        credit $LWRLD), the prize can't be delivered and may be forfeited after the claim window, and the Sponsor may draw
        a new winner. Sent tokens can't be recovered. Token transfers may carry network fees.
      </p>
      <p>
        <strong>About $LWRLD:</strong> 4% buy tax and 4% sell tax, split 85% to liquidity, 10% to project funding, and 5%
        burned. $LWRLD comes with no promise of utility, value, or returns.{" "}
        <strong>Nothing on this page or the site is financial advice.</strong>
      </p>

      <h2>7. Claiming a prize</h2>
      <p>
        Winners are announced live on stream. A winner has <strong>{CLAIM_DAYS} days</strong> from the drawing to claim
        publicly (for example, by replying on the Sponsor's official channels). If a prize isn't claimed in time, the
        Sponsor may draw a new winner. The Sponsor will never DM you first and will never ask you to send money, tokens,
        or a wallet recovery phrase. Official info is only at lathosworld.com.
      </p>
      <p className="gw-warn">
        ⚠️ <strong>Scam warning:</strong> {SCAM_WARNING} Nobody needs to charge you a fee to release a prize. Anyone who
        asks is not us.
      </p>

      <h2>8. Taxes</h2>
      <p>Winners are responsible for any taxes or reporting that apply to them where they live.</p>

      <h2>9. Disqualification</h2>
      <p>
        The Sponsor may disqualify anyone who cheats, uses bots or fake accounts, breaks these rules or the community
        rules, or tampers with the giveaway. The Sponsor's decisions are final.
      </p>

      <h2>10. Not affiliated</h2>
      <p>
        This giveaway is not sponsored, endorsed, or administered by, or associated with, X, Twitch, TikTok, YouTube,
        Google, or BNB Chain. By entering, you release those platforms from any responsibility for this giveaway.
      </p>

      <h2>11. Privacy</h2>
      <p>
        Your display name may appear in the entrant ticker, the published entry list, and on stream if you win. Your
        email and wallet address are never shown publicly; only the Sponsor sees your wallet address, and it is used only
        to send a prize. The social handles you enter and the results of follow checks are used only to run this
        giveaway. Twitch and YouTube sign-ins are used once to check a follow or subscription, and the access is
        revoked right after.
      </p>

      <h2>12. Changes</h2>
      <p>
        The Sponsor may change, pause, or cancel the giveaway if needed (for example, because of fraud, technical
        problems, or legal reasons). Any changes will be posted on this page.
      </p>

      <h2>13. Contact</h2>
      <p>Questions? Use the help desk at lathosworld.com/help.</p>
    </article>
  );
}
