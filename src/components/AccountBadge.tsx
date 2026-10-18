import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyBadge } from "@/lib/account-badge.functions";
import { badgeName } from "@/lib/account-badge";

/** Served by /api/eye-icon (animated 48px WebP; the ?v= busts the year-long cache if it changes). */
export const EYE_ICON = "/api/eye-icon?v=1";

/**
 * "Logged in as <name>" with a small animated Great Eye, linking to /account.
 * Shows "Owner" for the site owner (checked on the server). Signed out: a Sign in link
 * that comes back to the current page.
 */
export function AccountBadge({ inNav = false }: { inNav?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [owner, setOwner] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    let live = true;
    setOwner(false);
    if (!userId || !authEnabled) return;
    getMyBadge()
      .then((result) => live && setOwner(result.owner))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [userId]);

  const cls = `acct${inNav ? " acct-in-nav" : ""}`;
  if (!authEnabled) return null;
  if (isPending) return <span className={`${cls} acct-wait`} aria-hidden="true" />;
  if (!user) {
    const next = path && path !== "/login" && path.startsWith("/") && !path.startsWith("//") ? path : undefined;
    return (
      <Link className={`${cls} acct-out`} to="/login" search={next && next !== "/" ? { next } : {}}>
        Sign in
      </Link>
    );
  }
  return <BadgeView name={badgeName(user.displayName, user.primaryEmail)} owner={owner} inNav={inNav} />;
}

/** The signed-in badge itself (no data loading). */
export function BadgeView({ name, owner, inNav = false }: { name: string; owner: boolean; inNav?: boolean }) {
  const cls = `acct${inNav ? " acct-in-nav" : ""}`;
  return (
    <Link className={cls} to="/account" title={`Logged in as ${name}${owner ? " (Owner)" : ""}`}>
      <img className="acct-eye" src={EYE_ICON} width={24} height={24} alt="" decoding="async" />
      <span className="acct-text">
        <span className="acct-label">Logged in as </span>
        <span className="acct-name">{name}</span>
      </span>
      {owner ? <span className="acct-role">Owner</span> : null}
    </Link>
  );
}

/** Top-right badge for every page except the home page, which has it in its nav bar. */
export function AccountBar() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  if (path === "/" || path === "/login") return null;
  return (
    <div className="acct-bar">
      <AccountBadge />
    </div>
  );
}
