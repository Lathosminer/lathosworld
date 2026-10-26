import serverEntry from "@tanstack/react-start/server-entry";
import { canonicalRedirect } from "./lib/canonical-redirect";

export default {
  fetch(request: Request, ...rest: Parameters<typeof serverEntry.fetch> extends [Request, ...infer Tail] ? Tail : []) {
    const redirect = canonicalRedirect(request);
    if (redirect) return redirect;
    return serverEntry.fetch(request, ...rest);
  },
};
