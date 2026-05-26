const shibas = [
  "character shiba cheerfully talking.png",
  "character shiba thinking.png",
  "character shiba explaining something.png",
  "character shiba wearing stylish glasses.png",
  "character shiba using a magnifying glass to look closely.png",
  "character shiba showing surprise.png",
  "character shiba wearing a cassock like it has become enlightened.png",
  "character shiba smiling brightly.png",
];

function sceneBase(index, start, duration, overrides = {}) {
  return {
    scene: index + 1,
    audio_start: start,
    audio_duration: duration,
    duration,
    assets: [shibas[index % shibas.length]],
    transcript: [],
    ...overrides,
  };
}

function withTimings(rawScenes, sceneDuration = 6) {
  return rawScenes.map((scene, index) => sceneBase(index, index * sceneDuration, sceneDuration, scene));
}

export const DEMO_SPECS = [
  ["G1_github", "template1"],
  ["G1_github", "template2"],
  ["G1_github", "template3"],
  ["G2_docker", "template1"],
  ["G2_docker", "template2"],
  ["G2_docker", "template3"],
  ["G3_web", "template1"],
  ["G3_web", "template2"],
  ["G3_web", "template3"],
];

const githubIntro = {
  repo_url: "github.com/keon/awesome-nlp",
  headline_line1: "AWESOME NLP",
  headline_line2: "BAN DO HOC NLP",
};

const githubScenes = {
  template1: [
    githubIntro,
    {
      headline_line1: "USE CASE",
      headline_line2: "AI CAN REPO NAY?",
      bento1_title: "Nguoi moi",
      bento1_desc: "Co ban do chu de de bat dau NLP ma khong bi lac.",
      bento2_title: "Builder",
      bento2_desc: "Tim nhanh paper, course va repo phu hop voi bai toan.",
      bento3_title: "Reviewer",
      bento3_desc: "Dung lam checklist khi danh gia nguon hoc.",
    },
    {
      headline_line1: "LO TRINH",
      headline_line2: "DOC README",
      content_mode: "steps",
      steps: [
        { title: "Muc luc", body: "Quet cac nhom NLP truoc khi mo tung link." },
        { title: "Chon nhanh", body: "Uu tien mot nhanh nho nhu embeddings hoac parsing." },
        { title: "Ghi chu", body: "Luu link goc va ly do vi sao can quay lai." },
      ],
    },
    {
      headline_line1: "DIEM MANH",
      headline_line2: "DUNG NHU BAN DO",
      btn_text: "Doc README roi chon 1 nhanh",
      steps: [
        { title: "Rong", body: "Gom nhieu nguon NLP theo tung chu de." },
        { title: "Nhanh", body: "Giam thoi gian tim tai lieu tu dau." },
        { title: "Can loc", body: "Moi link van can kiem tra lai nguon goc." },
      ],
    },
    {
      headline_line1: "CHECKLIST",
      headline_line2: "TRUOC KHI DUNG",
      cards: [
        { title: "License", body: "Kiem tra license cua tung repo hoac paper con." },
        { title: "Cap nhat", body: "Uu tien link con song va con duoc duy tri." },
        { title: "Do sau", body: "Chon nguon co vi du, paper goc hoac benchmark." },
        { title: "Muc tieu", body: "Doc theo bai toan dang lam, khong doc tran lan." },
      ],
    },
    {
      headline_line1: "TIN HIEU REPO",
      headline_line2: "DOC TRUOC KHI LUU",
      repo_name: "keon/awesome-nlp",
      repo_lang: "Markdown",
      repo_stars: "18k+ stars",
      repo_trend: "Curated",
      repo_trend_label: "GitHub",
    },
    {
      headline_line1: "CLONE REPO",
      headline_line2: "DOC OFFLINE",
      btn_text: "$ git clone github.com/keon/awesome-nlp",
      steps: [
        { title: "Clone", body: "Lay repo ve may de doc khi can." },
        { title: "Filter", body: "Loc mot chu de nho thay vi doc het." },
        { title: "Verify", body: "Mo nguon goc de kiem tra noi dung." },
      ],
    },
    {
      headline_line1: "LUU REPO",
      headline_line2: "DUNG NHU BAN DO",
      cards: [
        { title: "Star", body: "Luu lai de tra cuu khi can hoc tiep." },
        { title: "Share", body: "Gui cho nguoi dang hoc NLP." },
        { title: "Comment", body: "Ghi lai nhanh ban muon hoc tiep." },
        { title: "Follow", body: "Theo doi video review repo tiep theo." },
      ],
    },
  ],
  template2: [
    githubIntro,
    {
      headline_line1: "BAN DO TRI THUC",
      headline_line2: "CHIA NHANH THE NAO?",
      bento1_title: "Core NLP",
      bento1_desc: "Nhan dien cac mang nen tang nhu tokenization, parsing, embeddings.",
      bento2_title: "Tasks",
      bento2_desc: "Tach nhom theo bai toan: sentiment, QA, chatbots, summarization.",
      bento3_title: "Research",
      bento3_desc: "Danh dau paper va survey de doc sau.",
    },
    {
      headline_line1: "DOC THEO TANG",
      headline_line2: "TU DE DEN KHO",
      content_mode: "steps",
      steps: [
        { title: "Tang 1", body: "Doc course va tutorial de co khung khai niem." },
        { title: "Tang 2", body: "Mo paper goc khi da hieu bai toan." },
        { title: "Tang 3", body: "Chay repo demo de thay trade-off that." },
      ],
    },
    {
      headline_line1: "CHON NGUON",
      headline_line2: "KHONG DOC LAN MAN",
      btn_text: "Chon 3 link cho 1 chu de",
      steps: [
        { title: "Tin cay", body: "Uu tien nguon co tac gia, nam cap nhat va citation." },
        { title: "Gan muc tieu", body: "Chi luu link lien quan bai toan dang hoc." },
        { title: "Co vi du", body: "Nguon co notebook hoac code mau de kiem chung." },
      ],
    },
    {
      headline_line1: "NOTE HOC TAP",
      headline_line2: "BIEN LIST THAN PLAN",
      cards: [
        { title: "Chu de", body: "Moi buoi chi chon mot nhanh nho." },
        { title: "Nguon goc", body: "Gan link paper/course goc vao note." },
        { title: "Cau hoi", body: "Ghi cau hoi can tra loi sau khi doc." },
        { title: "Ket qua", body: "Tong ket dieu da hieu bang 3 gach dau dong." },
      ],
    },
    {
      headline_line1: "DO PHU",
      headline_line2: "NHIN QUA STARS",
      repo_name: "keon/awesome-nlp",
      repo_lang: "Markdown",
      repo_stars: "18k+ stars",
      repo_trend: "Resource map",
      repo_trend_label: "GitHub",
    },
    {
      headline_line1: "TAO PLAYLIST",
      headline_line2: "HOC THEO NHANH",
      btn_text: "Fork note hoc rieng",
      steps: [
        { title: "Fork", body: "Tao ban note rieng neu can them danh dau." },
        { title: "Label", body: "Gan nhan beginner, paper, code cho tung link." },
        { title: "Review", body: "Cuoi tuan xoa link khong con phu hop." },
      ],
    },
    {
      headline_line1: "KET LUAN",
      headline_line2: "DAY LA BAN DO",
      cards: [
        { title: "Hoc", body: "Dung de lap lo trinh NLP." },
        { title: "Loc", body: "Khong coi moi link deu dang doc." },
        { title: "Kiem", body: "Mo nguon goc truoc khi tin." },
        { title: "Luu", body: "Star neu muon quay lai sau." },
      ],
    },
  ],
  template3: [
    githubIntro,
    {
      headline_line1: "TASK THUC TE",
      headline_line2: "LAY GI DE LAM?",
      bento1_title: "Prototype",
      bento1_desc: "Tim nhanh repo/paper de dung trong mot demo NLP.",
      bento2_title: "Compare",
      bento2_desc: "So sanh nhieu cach giai cung mot bai toan.",
      bento3_title: "Ship",
      bento3_desc: "Chon nguon co code, license ro va con duoc duy tri.",
    },
    {
      headline_line1: "WORKFLOW DEV",
      headline_line2: "TU LINK DEN DEMO",
      content_mode: "steps",
      steps: [
        { title: "Pick", body: "Chon mot bai toan cu the nhu sentiment hoac QA." },
        { title: "Run", body: "Mo repo co code mau de chay thu nho." },
        { title: "Measure", body: "Ghi lai input, output, loi va gioi han." },
      ],
    },
    {
      headline_line1: "TICH HOP",
      headline_line2: "CAN KIEM TRA GI?",
      btn_text: "Chay demo nho truoc",
      steps: [
        { title: "API", body: "Doc cach goi model hoac thu vien." },
        { title: "Data", body: "Kiem tra format du lieu dau vao." },
        { title: "Risk", body: "Xem license va bias truoc khi dung that." },
      ],
    },
    {
      headline_line1: "CARD REVIEW",
      headline_line2: "QUYET DINH NHANH",
      cards: [
        { title: "Setup", body: "Mat bao lau de chay duoc vi du dau tien?" },
        { title: "Quality", body: "Ket qua co du tot cho bai toan demo khong?" },
        { title: "Maintain", body: "Repo con song, issue co duoc tra loi khong?" },
        { title: "Fit", body: "Co can qua nhieu dependency khong?" },
      ],
    },
    {
      headline_line1: "TIN HIEU SHIP",
      headline_line2: "SAO CHUA DU",
      repo_name: "keon/awesome-nlp",
      repo_lang: "Markdown",
      repo_stars: "18k+ stars",
      repo_trend: "Use with checks",
      repo_trend_label: "GitHub",
    },
    {
      headline_line1: "SANDBOX",
      headline_line2: "THU RIENG TRUOC",
      btn_text: "$ git clone github.com/keon/awesome-nlp",
      steps: [
        { title: "Branch", body: "Tao nhanh thu nghiem rieng." },
        { title: "Example", body: "Lay mot input nho de kiem output." },
        { title: "Decide", body: "Chi tich hop khi demo tra loi dung nhu cau." },
      ],
    },
    {
      headline_line1: "NEXT ACTION",
      headline_line2: "CHON MOT DEMO",
      cards: [
        { title: "Star", body: "Luu repo de quay lai." },
        { title: "Issue", body: "Doc loi thuong gap truoc." },
        { title: "Demo", body: "Chay thu voi du lieu cua ban." },
        { title: "Share", body: "Gui link cho team neu thay co gia tri." },
      ],
    },
  ],
};

const dockerIntro = {
  layout: "intro_docker",
  repo_url: "hub.docker.com/_/nginx",
  headline_line1: "NGINX IMAGE",
  headline_line2: "CHAY CONTAINER",
};

const dockerScenes = {
  template1: [
    dockerIntro,
    {
      layout: "docker_tag",
      headline_line1: "QUICK START",
      headline_line2: "PULL ROI RUN",
      btn_text: "$ docker pull nginx:1.27-alpine",
      steps: [
        { title: "Pull", body: "Lay image voi tag cu the, tranh latest." },
        { title: "Run", body: "Map cong local de test trang mac dinh." },
        { title: "Stop", body: "Dung container sau khi kiem tra." },
      ],
    },
    {
      layout: "docker_config",
      headline_line1: "CONFIG CO BAN",
      headline_line2: "PORT VA VOLUME",
      bento1_title: "Port",
      bento1_desc: "-p 8080:80 de xem local.",
      bento2_title: "Volume",
      bento2_desc: "Mount thu muc html o che do read-only.",
      bento3_title: "Logs",
      bento3_desc: "Doc log khi container khoi dong loi.",
    },
    {
      layout: "terminal_docker",
      headline_line1: "RUN LOCAL",
      headline_line2: "THU TREN MAY PHU",
      btn_text: "$ docker run --rm -p 8080:80 nginx:1.27-alpine",
    },
    {
      layout: "outro_docker",
      headline_line1: "TRUOC PROD",
      headline_line2: "PIN TAG VA TEST",
      cards: [
        { title: "Pin tag", body: "Khong deploy bang latest." },
        { title: "Config", body: "Luu nginx.conf trong repo." },
        { title: "Health", body: "Them healthcheck neu chay dai han." },
        { title: "Update", body: "Test image moi truoc khi thay." },
      ],
    },
  ],
  template2: [
    dockerIntro,
    {
      layout: "docker_tag",
      headline_line1: "SELF HOST",
      headline_line2: "CHON TAG ON DINH",
      btn_text: "$ docker pull nginx:1.27-alpine",
      steps: [
        { title: "Version", body: "Dung tag co version de rollback duoc." },
        { title: "Digest", body: "Ghi digest neu can build lap lai." },
        { title: "Policy", body: "Len lich update thay vi keo moi tuy hung." },
      ],
    },
    {
      layout: "docker_config",
      headline_line1: "PERSISTENCE",
      headline_line2: "CONFIG PHAI LUU",
      bento1_title: "Volume",
      bento1_desc: "Mount config, cert va static asset tu thu muc rieng.",
      bento2_title: "Backup",
      bento2_desc: "Luu file config truoc moi lan update.",
      bento3_title: "Secret",
      bento3_desc: "Khong hardcode secret trong lenh run.",
    },
    {
      layout: "terminal_docker",
      headline_line1: "COMPOSE",
      headline_line2: "DEPLOY DE KIEM SOAT",
      btn_text: "$ docker compose config",
    },
    {
      layout: "outro_docker",
      headline_line1: "CHECK DEPLOY",
      headline_line2: "BACKUP ROI UPDATE",
      cards: [
        { title: "Backup", body: "Sao luu config va volume truoc." },
        { title: "Rollback", body: "Giu tag cu de quay lai nhanh." },
        { title: "TLS", body: "Kiem tra cert va reverse proxy." },
        { title: "Monitor", body: "Theo doi log sau khi update." },
      ],
    },
  ],
  template3: [
    dockerIntro,
    {
      layout: "docker_tag",
      headline_line1: "DEV WORKFLOW",
      headline_line2: "PIN RUNTIME",
      btn_text: "$ docker pull nginx:1.27-alpine",
      steps: [
        { title: "Runtime", body: "Co dinh version de team dung cung moi truong." },
        { title: "Mount", body: "Mount project local vao container khi test." },
        { title: "CI", body: "Dung cung tag trong pipeline." },
      ],
    },
    {
      layout: "docker_config",
      headline_line1: "DEV CONFIG",
      headline_line2: "LAP LAI DUOC",
      bento1_title: "Bind",
      bento1_desc: "Mount thu muc code de reload nhanh.",
      bento2_title: "Cache",
      bento2_desc: "Tach cache de CI khong cham bat thuong.",
      bento3_title: "Command",
      bento3_desc: "Ghi lenh test ro trong script.",
    },
    {
      layout: "terminal_docker",
      headline_line1: "RUN TEST",
      headline_line2: "GIONG CI",
      btn_text: "$ docker run --rm nginx:1.27-alpine nginx -v",
    },
    {
      layout: "outro_docker",
      headline_line1: "SHIP WORKFLOW",
      headline_line2: "KHONG LECH ENV",
      cards: [
        { title: "Tag", body: "Dev va CI dung cung tag." },
        { title: "Script", body: "Lenh run nam trong repo." },
        { title: "Logs", body: "Luu log loi de debug." },
        { title: "Clean", body: "Xoa container tam sau test." },
      ],
    },
  ],
};

const webIntro = {
  repo_url: "developer.mozilla.org/en-US/docs/Web/API/Fetch_API",
  headline_line1: "FETCH API",
  headline_line2: "CAN KIEM TRA GI?",
};

const webScenes = {
  template1: [
    webIntro,
    {
      headline_line1: "TOM TAT",
      headline_line2: "NOI DUNG CHINH",
      cards: [
        { title: "What", body: "Fetch API giup goi HTTP request trong trinh duyet." },
        { title: "Who", body: "Frontend dev can lay du lieu tu API." },
        { title: "Caution", body: "HTTP 4xx khong tu dong nem exception." },
        { title: "Next", body: "Chay mot request nho de kiem tra." },
      ],
    },
    {
      headline_line1: "BA CAU HOI",
      headline_line2: "TRUOC KHI DUNG",
      steps: [
        { title: "What", body: "API nay thay the luong request nao?" },
        { title: "Why", body: "Co can thu vien ngoai khong?" },
        { title: "Check", body: "CORS va browser support ra sao?" },
      ],
    },
    {
      headline_line1: "DIEM CHINH",
      headline_line2: "RUT TU MDN",
      cards: [
        { title: "Promise", body: "fetch tra promise va can doc body rieng." },
        { title: "Error", body: "Network error moi reject." },
        { title: "CORS", body: "Phu thuoc header tu server." },
      ],
    },
    {
      headline_line1: "HANH DONG",
      headline_line2: "MO DOCS GOC",
      btn_text: "Doc MDN roi chay vi du",
      steps: [
        { title: "Open", body: "Mo trang goc de doi chieu cu phap." },
        { title: "Test", body: "Goi endpoint nho truoc." },
        { title: "Wrap", body: "Viet helper xu ly loi nhat quan." },
      ],
    },
    {
      headline_line1: "LUU LINK",
      headline_line2: "KIEM CHUNG LAI",
      cards: [
        { title: "Nguon", body: "MDN la nguon chinh." },
        { title: "Doc", body: "Doc error handling ky." },
        { title: "Apply", body: "Dung trong app sau khi test." },
        { title: "Share", body: "Gui cho team khi can chuan hoa request." },
      ],
    },
  ],
  template2: [
    webIntro,
    {
      headline_line1: "DOCS MAP",
      headline_line2: "DOC THEO LO TRINH",
      cards: [
        { title: "Concept", body: "Hieu request, response va promise truoc." },
        { title: "Guide", body: "Doc vi du co ban trong docs." },
        { title: "Reference", body: "Tra option va method khi can." },
        { title: "Compat", body: "Kiem tra browser support sau cung." },
      ],
    },
    {
      headline_line1: "DOC SAU HON",
      headline_line2: "3 MOCCANH",
      steps: [
        { title: "Syntax", body: "Nam cach goi fetch va doc JSON." },
        { title: "Errors", body: "Tu check response.ok cho HTTP error." },
        { title: "Abort", body: "Can timeout thi doc AbortController." },
      ],
    },
    {
      headline_line1: "BANG CHUNG",
      headline_line2: "LAY TU DOCS",
      cards: [
        { title: "Example", body: "Vi du MDN cho thay flow promise." },
        { title: "Note", body: "Docs noi ro HTTP error khong reject." },
        { title: "Compat", body: "Bang support giup quyet dinh polyfill." },
      ],
    },
    {
      headline_line1: "NOTE KY THUAT",
      headline_line2: "TRUOC KHI CODE",
      btn_text: "Ghi 3 rule request",
      steps: [
        { title: "Rule 1", body: "Luon check response.ok." },
        { title: "Rule 2", body: "Tach parse JSON khoi request." },
        { title: "Rule 3", body: "Xu ly CORS o server, khong do client." },
      ],
    },
    {
      headline_line1: "KET LUAN DOCS",
      headline_line2: "DOC CO HE THONG",
      cards: [
        { title: "Start", body: "Doc concept truoc." },
        { title: "Deep", body: "Dao vao error va abort." },
        { title: "Verify", body: "Kiem browser support." },
        { title: "Save", body: "Luu link reference de tra sau." },
      ],
    },
  ],
  template3: [
    webIntro,
    {
      headline_line1: "ACTION BRIEF",
      headline_line2: "DUNG TRONG APP",
      cards: [
        { title: "Value", body: "Goi API khong can thu vien ngoai." },
        { title: "Fit", body: "Tot cho request don gian va app hien dai." },
        { title: "Gap", body: "Can tu viet retry, timeout va error layer." },
        { title: "Decision", body: "Dung neu team muon API native." },
      ],
    },
    {
      headline_line1: "DEMO FLOW",
      headline_line2: "CHAY 5 PHUT",
      steps: [
        { title: "GET", body: "Goi endpoint mau va in status." },
        { title: "Parse", body: "Doc JSON khi response.ok." },
        { title: "Fail", body: "Thu endpoint loi de xem handler." },
      ],
    },
    {
      headline_line1: "RISKS",
      headline_line2: "TRUOC KHI SHIP",
      cards: [
        { title: "Timeout", body: "fetch khong co timeout mac dinh." },
        { title: "Retry", body: "Can tu them retry neu API chap chon." },
        { title: "CORS", body: "Loi cross-origin can sua server." },
      ],
    },
    {
      headline_line1: "NEXT STEP",
      headline_line2: "VIET HELPER",
      btn_text: "Build fetchJson()",
      steps: [
        { title: "Input", body: "Nhan URL va option ro rang." },
        { title: "Status", body: "Nem loi khi response.ok false." },
        { title: "Log", body: "Ghi lai status va message de debug." },
      ],
    },
    {
      headline_line1: "SHIP DECISION",
      headline_line2: "NATIVE HAY LIB",
      cards: [
        { title: "Native", body: "Dung fetch neu nhu cau gon." },
        { title: "Library", body: "Can cache/retry phuc tap thi can lib." },
        { title: "Test", body: "Viet test cho helper request." },
        { title: "Review", body: "Doi chieu docs MDN khi browser doi." },
      ],
    },
  ],
};

function buildGithubData(subtemplate) {
  return {
    template: "G1_github",
    subtemplate,
    platform: "github",
    video_format: subtemplate === "template2" ? "knowledge_map_resource_digest" : subtemplate === "template3" ? "developer_integration_brief" : "repo_overview_with_use_cases",
    visual_theme: subtemplate,
    duration: 48,
    scenes: withTimings(githubScenes[subtemplate] || githubScenes.template1),
  };
}

function buildDockerData(subtemplate) {
  return {
    template: "G2_docker",
    subtemplate,
    platform: "docker",
    video_format: subtemplate === "template2" ? "self_host_setup_guide" : subtemplate === "template3" ? "dev_workflow_image_brief" : "container_quick_start",
    visual_theme: subtemplate,
    duration: 48,
    scenes: withTimings(dockerScenes[subtemplate] || dockerScenes.template1),
  };
}

function buildWebData(subtemplate) {
  return {
    template: "G3_web",
    subtemplate,
    platform: "web",
    video_format: subtemplate === "template2" ? "web_docs_explainer" : subtemplate === "template3" ? "web_tool_overview" : "web_context_digest",
    visual_theme: subtemplate,
    duration: 36,
    scenes: withTimings(webScenes[subtemplate] || webScenes.template1),
  };
}

export function buildDemoData(template, subtemplate) {
  if (template === "G1_github") return buildGithubData(subtemplate);
  if (template === "G2_docker") return buildDockerData(subtemplate);
  return buildWebData(subtemplate);
}
