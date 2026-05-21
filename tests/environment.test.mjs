import assert from "node:assert/strict";
import { test } from "node:test";

import { inspectEnvironment } from "../pipeline/environment.mjs";

test("inspectEnvironment reports required desktop runtime commands", async () => {
  const calls = [];
  const result = await inspectEnvironment({
    appRoot: "C:/definitely-no-local-hyperframes",
    commandExists: async (name) => {
      calls.push(name);
      return name !== "ffprobe";
    },
    canWriteWorkspace: async () => true,
  });

  assert.deepEqual(calls.sort(), ["ffmpeg", "ffprobe", process.platform === "win32" ? "hyperframes.cmd" : "hyperframes", "node"].sort());
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.checks.map((check) => [check.id, check.ok]),
    [
      ["node", true],
      ["ffmpeg", true],
      ["ffprobe", false],
      ["hyperframes", true],
      ["workspace", true],
    ],
  );
});
