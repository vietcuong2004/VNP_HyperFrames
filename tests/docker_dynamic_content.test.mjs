import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeDockerScenes } from "../pipeline/generators/docker_generator.mjs";
import { getHyperframesReviewScene, getSceneCards } from "../templates/G2_docker/scenes.mjs";

test("normalizeDockerScenes preserves config steps and maps them to bento fields", () => {
  const scenes = normalizeDockerScenes(
    [
      {
        headline_line1: "POSTGRES",
        repo_url: "hub.docker.com/_/postgres",
      },
      {
        content_mode: "steps",
        headline_line1: "TAG ỔN ĐỊNH",
        headline_line2: "PIN VERSION TRƯỚC",
        steps: [
          { title: "Chọn tag", body: "Dùng bản major cụ thể thay vì latest." },
          { title: "Pull image", body: "Tải image trước khi viết compose." },
        ],
      },
      {
        content_mode: "steps",
        headline_line1: "CONFIG DB",
        headline_line2: "GIỮ DATA AN TOÀN",
        steps: [
          { title: "Password", body: "Đặt POSTGRES_PASSWORD bằng secret riêng." },
          { title: "Volume", body: "Mount thư mục data để không mất dữ liệu." },
          { title: "Port", body: "Chỉ expose port khi cần truy cập từ host." },
        ],
      },
    ],
    {
      imageRef: "library/postgres",
      repoUrl: "hub.docker.com/_/postgres",
    },
  );

  assert.equal(scenes.length, 5);
  assert.equal(scenes[2].content_mode, "steps");
  assert.deepEqual(scenes[2].steps.map((step) => step.title), ["Password", "Volume", "Port"]);
  assert.equal(scenes[2].bento1_title, "Password");
  assert.equal(scenes[2].repo_url, "hub.docker.com/_/postgres");
});

test("G2_docker config renderer uses dynamic step cards instead of fixed port volume env copy", () => {
  const scene = {
    layout: "docker_config",
    content_mode: "steps",
    headline_line1: "CONFIG DB",
    headline_line2: "GIỮ DATA AN TOÀN",
    steps: [
      { title: "Password", body: "Đặt secret riêng cho database." },
      { title: "Volume", body: "Mount thư mục data để giữ dữ liệu." },
      { title: "Network", body: "Đặt network riêng cho service nội bộ." },
    ],
  };

  const cards = getSceneCards(scene, 3);
  const result = getHyperframesReviewScene(2, scene, "scene3", 0);

  assert.deepEqual(cards.map((card) => card.title), ["Password", "Volume", "Network"]);
  assert.match(result.html, /Đặt secret riêng/);
  assert.match(result.html, /Network/);
  assert.doesNotMatch(result.html, /-e KEY=VALUE/);
});

test("G2_docker outro renderer uses dynamic checklist card bodies", () => {
  const scene = {
    layout: "outro_docker",
    content_mode: "steps",
    headline_line1: "TRƯỚC PROD",
    headline_line2: "KIỂM TRA LẠI",
    steps: [
      { title: "Pin tag", body: "Ghim version cụ thể trước khi deploy." },
      { title: "Backup", body: "Kiểm tra volume và lịch backup dữ liệu." },
      { title: "Health", body: "Thêm healthcheck cho service chính." },
      { title: "Secrets", body: "Không đưa password vào command." },
    ],
  };

  const result = getHyperframesReviewScene(4, scene, "scene5", 0);

  assert.match(result.html, /Ghim version cụ thể/);
  assert.match(result.html, /Không đưa password/);
  assert.doesNotMatch(result.html, /Volumes & data/);
});

test("G2_docker outro renderer includes a concrete final action", () => {
  const scene = {
    layout: "outro_docker",
    headline_line1: "BEFORE PROD",
    headline_line2: "VERIFY AGAIN",
    btn_text: "$ docker compose config",
  };

  const result = getHyperframesReviewScene(4, scene, "scene5", 0);

  assert.match(result.html, /docker compose config/);
  assert.match(result.gsap, /btn-scene5/);
});

test("normalizeDockerScenes replaces generic schema headlines with image-aware copy", () => {
  const scenes = normalizeDockerScenes(
    [
      {
        headline_line1: "LIBRARY/UBUNTU",
        headline_line2: "DOCKER QUICK START",
      },
      {
        headline_line1: "CHỌN TAG",
        headline_line2: "RỒI PULL IMAGE",
      },
      {
        headline_line1: "CẤU HÌNH",
        headline_line2: "PORT, VOLUME VÀ ENV",
      },
      {
        headline_line1: "RUN THỬ",
        headline_line2: "TRƯỚC KHI DEPLOY",
      },
      {
        headline_line1: "PRODUCTION",
        headline_line2: "CHECKLIST VÀ BACKUP",
      },
    ],
    {
      imageRef: "library/ubuntu",
      repoUrl: "hub.docker.com/_/ubuntu",
    },
  );

  assert.deepEqual(
    scenes.map((scene) => [scene.headline_line1, scene.headline_line2]),
    [
      ["UBUNTU", "CHẠY CONTAINER"],
      ["PIN TAG", "UBUNTU ỔN ĐỊNH"],
      ["CONFIG UBUNTU", "KIỂM TRA TRƯỚC"],
      ["RUN UBUNTU", "THỬ TRÊN MÁY PHỤ"],
      ["TRƯỚC PROD", "BACKUP VÀ UPDATE"],
    ],
  );
});
