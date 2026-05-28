import assert from "node:assert/strict";
import { test } from "node:test";

import { createJobId } from "../desktop_app/ui_server.js";
import { buildFinalVideoName } from "../pipeline/run_pipeline.js";

test("createJobId stays unique for rapid concurrent batches", () => {
  const ids = new Set();
  for (let request = 0; request < 20; request += 1) {
    for (let index = 0; index < 3; index += 1) {
      ids.add(createJobId(index, 1_779_696_000_000));
    }
  }

  assert.equal(ids.size, 60);
});

test("buildFinalVideoName includes run id so parallel same-topic renders do not overwrite", () => {
  const date = new Date("2026-05-25T10:11:12.000Z");
  const first = buildFinalVideoName({
    safeTopicName: "github-keon-awesome-nlp",
    date,
    runId: "job-a",
  });
  const second = buildFinalVideoName({
    safeTopicName: "github-keon-awesome-nlp",
    date,
    runId: "job-b",
  });

  assert.notEqual(first, second);
  assert.match(first, /job-a\.mp4$/);
  assert.match(second, /job-b\.mp4$/);
});
