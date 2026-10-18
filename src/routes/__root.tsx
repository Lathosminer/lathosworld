import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AccountBar } from "@/components/AccountBadge";
import { SwordCursor } from "@/components/SwordCursor";
import appCss from "../styles.css?url";

const APP_NAME = "lathosworld.com";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content: "I am a gamer and a streamer. $LWRLD is a passion project on Flap. Not about raising money. Not financial advice.",
      },
      { name: "theme-color", content: "#05080C" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", type: "image/png", href: "/favicon-32.png", sizes: "32x32" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  notFoundComponent: () => (
    <main className="notfound">
      <img src="/mark-sm.webp" width={80} height={80} alt="" />
      <h1>That door is not here.</h1>
      <p>The page you wanted does not exist. Head back to LathosWorld.</p>
      <p><a className="btn btn-cyan" href="/">Back to lathosworld.com</a></p>
    </main>
  ),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <SwordCursor />
        <AuthProvider>
          <AccountBar />
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
