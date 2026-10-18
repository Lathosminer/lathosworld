/**
 * Header account badge. Only says whether the signed-in account is the site owner
 * (listed in COMMUNITY_ADMIN_EMAIL). The check runs on the server and returns a
 * boolean; the env value itself never leaves the server.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export const getMyBadge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ owner: boolean }> => {
    try {
      const sql = await getSql();
      const { isAdminUser } = await import("@/lib/giveaway.server");
      return { owner: await isAdminUser(sql, context.userId, null) };
    } catch {
      return { owner: false };
    }
  });
