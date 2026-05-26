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

test("G2_docker run scene renders a terminal flow with the actual command", () => {
  const scene = {
    layout: "terminal_docker",
    headline_line1: "RUN POSTGRES",
    headline_line2: "THU TREN MAY PHU",
    btn_text: "$ docker run --rm -p 5432:5432 postgres:16",
    steps: [
      { title: "Dry run", body: "Chay voi --rm truoc khi dua vao compose." },
      { title: "Logs", body: "Doc log khoi dong de bat loi config." },
      { title: "Stop", body: "Dung container sau khi test xong." },
    ],
  };

  const result = getHyperframesReviewScene(3, scene, "scene4", 0);

  assert.match(result.html, /terminal-frame/);
  assert.match(result.html, /docker run --rm -p 5432:5432 postgres:16/);
  assert.match(result.html, /Doc log khoi dong/);
  assert.doesNotMatch(result.html, /main-glow-icon/);
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

test("normalizeDockerScenes replaces angle-bracket schema placeholders", () => {
  const scenes = normalizeDockerScenes(
    [
      { headline_line1: "<ten image ngan gon>", headline_line2: "<loi ich chay container>" },
      { headline_line1: "<tag nen dung>", headline_line2: "<ly do can pin tag>" },
      {
        headline_line1: "<config quan trong>",
        headline_line2: "<diem can kiem tra>",
        steps: [{ title: "<buoc 1>", body: "<noi dung mau>" }],
      },
      { headline_line1: "<lenh chay thu>", headline_line2: "<pham vi thu nghiem>" },
      { headline_line1: "<truoc production>", headline_line2: "<backup va cap nhat>" },
    ],
    {
      imageRef: "library/postgres",
      repoUrl: "hub.docker.com/_/postgres",
    },
  );

  const serialized = JSON.stringify(scenes);
  assert.doesNotMatch(serialized, /<[^>]+>/);
  assert.equal(scenes[0].headline_line1, "POSTGRES");
  assert.equal(scenes[2].steps[0].title, "Bước 1");
});
