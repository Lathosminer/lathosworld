import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseIcecastStatus } from "./radio.ts";

const live = {
  icestats: {
    server_id: "LathosWorld Radio",
    source: {
      listenurl: "http://127.0.0.1:8000/live",
      server_name: "LathosWorld Radio",
      server_type: "audio/aac",
      title: "LathosWorld - Footsteps",
      "display-title": "LathosWorld - Footsteps",
    },
  },
};

describe("parseIcecastStatus", () => {
  it("reads the live mount title and server name", () => {
    assert.deepEqual(parseIcecastStatus(live), {
      online: true,
      title: "LathosWorld - Footsteps",
      serverName: "LathosWorld Radio",
    });
  });

  it("picks the /live mount when source is a list", () => {
    const parsed = parseIcecastStatus({
      icestats: {
        server_id: "LathosWorld Radio",
        source: [
          { listenurl: "http://127.0.0.1:8000/other", server_name: "Other", title: "Skip" },
          {
            listenurl: "http://127.0.0.1:8000/live",
            server_name: "LathosWorld Radio",
            title: "On air",
          },
        ],
      },
    });
    assert.equal(parsed.online, true);
    assert.equal(parsed.title, "On air");
    assert.equal(parsed.serverName, "LathosWorld Radio");
  });

  it("falls back to display-title and server_id", () => {
    assert.deepEqual(
      parseIcecastStatus({
        icestats: {
          server_id: "Station",
          source: { listenurl: "http://127.0.0.1:8000/live", "display-title": "Shown" },
        },
      }),
      { online: true, title: "Shown", serverName: "Station" },
    );
  });

  it("is offline when the mount is missing", () => {
    assert.deepEqual(parseIcecastStatus({ icestats: { server_id: "LathosWorld Radio" } }), {
      online: false,
      title: "",
      serverName: "LathosWorld Radio",
    });
  });

  it("is offline for an empty or broken document", () => {
    assert.equal(parseIcecastStatus(null).online, false);
    assert.equal(parseIcecastStatus({}).online, false);
    assert.equal(parseIcecastStatus({ icestats: { source: [null, "nope"] } }).online, false);
  });
});
