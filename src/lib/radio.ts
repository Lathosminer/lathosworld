export const RADIO_STREAM_URL = "https://radio.lathosworld.com/live";
export const RADIO_STATUS_URL = "https://radio.lathosworld.com/status-json.xsl";
export const RADIO_POLL_MS = 15_000;
export const RADIO_VOLUME_KEY = "lathosworld-radio-volume";

export type RadioNowPlaying = {
  /** A mount is present in the Icecast status document. */
  online: boolean;
  /** icestats.source.title, falling back to display-title. */
  title: string;
  /** icestats.source.server_name, falling back to icestats.server_id. */
  serverName: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sourceRecords(source: unknown): Record<string, unknown>[] {
  if (Array.isArray(source)) {
    return source.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === "object",
    );
  }
  if (source && typeof source === "object") return [source as Record<string, unknown>];
  return [];
}

/**
 * Read the live mount from an Icecast status-json.xsl document.
 * `source` is one object, or an array when the server has several mounts.
 */
export function parseIcecastStatus(data: unknown): RadioNowPlaying {
  const empty: RadioNowPlaying = { online: false, title: "", serverName: "" };
  if (!data || typeof data !== "object") return empty;
  const root = (data as Record<string, unknown>).icestats;
  if (!root || typeof root !== "object") return empty;
  const icestats = root as Record<string, unknown>;
  const sources = sourceRecords(icestats.source);
  const preferred =
    sources.find((item) => text(item.listenurl).includes("/live")) ?? sources[0] ?? null;
  const serverName = text(preferred?.server_name) || text(icestats.server_id);
  if (!preferred) return { online: false, title: "", serverName };
  const title = text(preferred.title) || text(preferred["display-title"]);
  return { online: true, title, serverName };
}
