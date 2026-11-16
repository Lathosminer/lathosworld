/** Minimal YouTube IFrame API. Failures resolve to null and never throw. */

export type YouTubeHandle = {
  mute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
};

type YTPlayer = YouTubeHandle;

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options?: {
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: () => void;
          };
        },
      ) => YTPlayer;
      PlayerState?: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const ENDED = 0;
let api: Promise<boolean> | null = null;

export function loadYouTubeIframeApi(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.YT?.Player) return Promise.resolve(true);
  if (api) return api;
  api = new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), 8000);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timer);
      try {
        previous?.();
      } catch {
        /* A previous ready callback is not this player's problem. */
      }
      finish(Boolean(window.YT?.Player));
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      finish(false);
    };
    document.head.appendChild(script);
  });
  return api;
}

export function playMuted(player: YouTubeHandle) {
  try {
    player.mute();
    player.playVideo();
  } catch {
    /* Leave the embed paused if the API call fails. */
  }
}

export function pauseVideo(player: YouTubeHandle) {
  try {
    player.pauseVideo();
  } catch {
    /* Already stopped, or the API never attached. */
  }
}

export function attachYouTubePlayer(
  iframe: HTMLIFrameElement,
  hooks?: { onEnded?: () => void },
): Promise<YouTubeHandle | null> {
  return loadYouTubeIframeApi().then(
    (ok) =>
      new Promise((resolve) => {
        if (!ok || !window.YT?.Player) {
          resolve(null);
          return;
        }
        let settled = false;
        const finish = (player: YouTubeHandle | null) => {
          if (settled) return;
          settled = true;
          resolve(player);
        };
        try {
          new window.YT.Player(iframe, {
            events: {
              onReady: (event) => {
                try {
                  event.target.mute();
                } catch {
                  /* Mute is best-effort. Playback stays silent either way. */
                }
                finish(event.target);
              },
              onStateChange: (event) => {
                const ended = window.YT?.PlayerState?.ENDED ?? ENDED;
                if (event.data === ended) hooks?.onEnded?.();
              },
              onError: () => finish(null),
            },
          });
        } catch {
          finish(null);
        }
      }),
  );
}
