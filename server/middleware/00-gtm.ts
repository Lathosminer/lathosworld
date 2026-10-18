/**
 * Place the Google Tag Manager container script immediately after `<head>`
 * in every server-rendered HTML document.
 *
 * React 19 emits charset, meta, and stylesheet links before an inline
 * `<script>`, and the share-card injector inserts its meta tags at the
 * opening head tag. The `00-` filename sorts before `grok-pwa.ts`, so this
 * middleware runs outside that injector and moves the one official snippet
 * back to the top of `<head>` afterward. The matching `<noscript>` iframe
 * stays the first element in `<body>`.
 */
import { placeGtmScriptAfterHeadOpen } from "../../src/lib/gtm";

interface GtmEvent {
  req: { method: string; headers: Headers };
}

function createHeadHoist() {
  const pending: Buffer[] = [];
  let done = false;

  const emit = (html: string) => Buffer.from(placeGtmScriptAfterHeadOpen(html), "utf8");

  return {
    push(chunk: Uint8Array): Buffer[] {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (done) return [buf];
      pending.push(buf);
      const joined = Buffer.concat(pending);
      const at = joined.toString("latin1").search(/<\/head>/i);
      if (at === -1) return [];
      done = true;
      pending.length = 0;
      const close = joined.toString("latin1", at).match(/^<\/head>/i);
      if (!close) return [emit(joined.toString("utf8"))];
      const head = emit(joined.subarray(0, at + close[0].length).toString("utf8"));
      return [Buffer.concat([head, joined.subarray(at + close[0].length)])];
    },
    flush(): Buffer[] {
      if (done || pending.length === 0) return [];
      const rest = Buffer.concat(pending);
      pending.length = 0;
      done = true;
      return [emit(rest.toString("utf8"))];
    },
  };
}

function inject(response: Response): Response {
  const hoist = createHeadHoist();
  const transformed = response.body!.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        for (const out of hoist.push(chunk)) controller.enqueue(out);
      },
      flush(controller) {
        for (const out of hoist.flush()) controller.enqueue(out);
      },
    }),
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(transformed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default async function gtmMiddleware(
  event: GtmEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET") return next();

  const result = await next();
  if (
    !(result instanceof Response) ||
    !result.body ||
    !String(result.headers.get("content-type") ?? "").includes("text/html") ||
    result.headers.get("content-encoding")
  ) {
    return result;
  }
  return inject(result);
}
