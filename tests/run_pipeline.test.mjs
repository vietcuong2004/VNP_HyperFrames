import assert from "node:assert/strict";
import { test } from "node:test";

import { findJsonPath } from "../pipeline/run_pipeline.js";
import { getHyperframesReviewScene } from "../templates/G2_docker/template1/scenes.mjs";

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

test("G2_docker renders scenes by declared layout instead of leaking nginx defaults", () => {
  const pullScene = getHyperframesReviewScene(
    1,
    {
      layout: "docker_tag",
      headline_line1: "CHON TAG",
      headline_line2: "ROI PULL IMAGE",
      btn_text: "$ docker pull mysql:latest",
      repo_url: "hub.docker.com/r/library/mysql",
    },
    "scene2",
    0,
  );

  assert.match(pullScene.html, /docker/);
  assert.match(pullScene.html, /mysql:latest/);
  assert.doesNotMatch(pullScene.html, /80:80/);
  assert.doesNotMatch(pullScene.html, /library\/nginx|nginx_web|nginx:1\.25/i);

  const outroScene = getHyperframesReviewScene(
    4,
    {
      layout: "outro_docker",
      headline_line1: "PRODUCTION",
      headline_line2: "CHECKLIST",
      bento1_title: "Pin tag",
      bento2_title: "Backup",
      bento3_title: "Health",
      bento4_title: "Update",
      btn_text: "$ docker run -d -p 3306:3306 mysql",
    },
    "scene5",
    0,
  );

  assert.match(outroScene.html, /Pin tag/);
  assert.match(outroScene.html, /mysql/);
  assert.doesNotMatch(outroScene.html, /library\/nginx|nginx_web|nginx:1\.25/i);
});
