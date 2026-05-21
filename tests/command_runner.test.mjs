import assert from "node:assert/strict";
import { test } from "node:test";

import { createSpawnCommand } from "../pipeline/command_runner.mjs";

test("createSpawnCommand runs Windows cmd shims through cmd.exe", () => {
  const result = createSpawnCommand("C:/project/node_modules/.bin/hyperframes.cmd", ["validate"], {
    platform: "win32",
  });

  assert.equal(result.command, "C:\\project\\node_modules\\.bin\\hyperframes.cmd");
  assert.deepEqual(result.args, ["validate"]);
  assert.equal(result.shell, true);
});

test("createSpawnCommand keeps regular executables unchanged", () => {
  const result = createSpawnCommand("node", ["script.mjs"], { platform: "win32" });

  assert.equal(result.command, "node");
  assert.deepEqual(result.args, ["script.mjs"]);
  assert.equal(result.shell, false);
});
