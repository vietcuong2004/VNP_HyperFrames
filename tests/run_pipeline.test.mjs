import assert from "node:assert/strict";
import { test } from "node:test";

import { findJsonPath } from "../pipeline/run_pipeline.js";

test("findJsonPath extracts only the generated JSON path from Vietnamese output", () => {
  const output = [
    "Nền tảng: docker",
    "Đã tạo kịch bản UTF-8 tại: C:\\Users\\AMLT\\AppData\\Roaming\\my-video\\workspace\\data\\mongo-21-05-2026-10-03.json",
  ].join("\n");

  assert.equal(
    findJsonPath(output),
    "C:\\Users\\AMLT\\AppData\\Roaming\\my-video\\workspace\\data\\mongo-21-05-2026-10-03.json",
  );
});

test("findJsonPath extracts POSIX JSON paths from plain output", () => {
  assert.equal(
    findJsonPath("created /tmp/workspace/data/demo.json"),
    "/tmp/workspace/data/demo.json",
  );
});
