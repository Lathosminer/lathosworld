const APEX = "lathosworld.com";
const WWW = "www.lathosworld.com";

/** Scheme the visitor used to reach Cloudflare, not the edge-to-worker hop. */
function visitorScheme(request: Request, url: URL): "http" | "https" {
  const cfVisitor = request.headers.get("cf-visitor");
  if (cfVisitor) {
    try {
      const parsed = JSON.parse(cfVisitor) as { scheme?: unknown };
      if (parsed.scheme === "http" || parsed.scheme === "https") return parsed.scheme;
    } catch {
      // Ignore a malformed CF-Visitor and fall through.
    }
  }
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwarded === "http" || forwarded === "https") return forwarded;
  return url.protocol === "http:" ? "http" : "https";
}

function hostnameOf(request: Request, url: URL): string {
  const raw = (request.headers.get("host") ?? url.hostname).split(":")[0] ?? "";
  return raw.trim().replace(/\.$/, "").toLowerCase();
}

/**
 * One 301 to https://lathosworld.com for http and for www.
 * Other hosts (preview, localhost) are left alone. https://lathosworld.com is not redirected.
 */
export function canonicalRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const host = hostnameOf(request, url);
  if (host !== APEX && host !== WWW) return null;

  const scheme = visitorScheme(request, url);
  if (scheme === "https" && host === APEX) return null;

  const dest = new URL(request.url);
  dest.protocol = "https:";
  dest.hostname = APEX;
  dest.port = "";
  return Response.redirect(dest.toString(), 301);
}
