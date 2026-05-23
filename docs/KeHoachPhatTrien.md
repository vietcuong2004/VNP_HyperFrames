# Ke hoach phat trien hien tai

Tai lieu nay thay the cac ban ke hoach cu dua tren template co dinh G1/G2/G3. Huong moi cua du an la pipeline agentic: AI sinh kich ban, voice, subtitle, scene HTML, thumbnail va mot phan art direction; code chi giu vai tro guardrail, validation, asset routing va fallback an toan.

## Trang thai hien tai

Pipeline chinh nam o `pipeline/run_agent_pipeline.js`.

Luot chay hien tai da co cac phan sau:

- Lay URL/topic, trich metadata co ban va chup screenshot nguon vao `assets/images/github_repo.png`.
- Sinh script JSON bang `agents/scriptAgent.js`.
- Sinh TTS bang LarVoice neu co key, hoac Edge TTS Node fallback.
- Tao SRT/transcript, gan timing vao tung scene.
- Goi `agents/scene/generate.js` de AI sinh HTML cho tung scene.
- Auto-fix mot so loi render pho bien trong `agents/scene/htmlValidator.js`.
- Neu AI fail hoac scene vi pham rule quan trong, fallback sang `pipeline/localFallbackGenerator.js`.
- Lap `index.html`, validate bang HyperFrames, render MP4.

Da sua gan day:

- Khong fallback anh tuy tien khi scene can chup/scroll trang nguon. Scene dang can screenshot chi nhan screenshot nguon va logo.
- Khong de AI/fallback copy nguyen cau voice vao hero/card/title. Voice chi dung cho narration/subtitle.
- Tu dong sua path asset trong scene HTML: `./assets/...` -> `../assets/...`.
- Tu dong loai `drawSVG`, vi DrawSVGPlugin khong co trong runtime.
- TTS Edge fallback khong phu thuoc Python `edge_tts`.

## Van de chua giai quyet

Phan noi dung chinh giua video van co the trong vo nghia hoac giong template, vi AI scene generator hien chi nhan `voice`, `visual`, SRT timeline va prompt dai. Khi model khong hieu du ngu canh, no sinh cac label ngan nhu `HTML`, `SCENE 01`, `Focus`, hoac card chung chung.

Day khong nen sua bang cach them them hardcode vao template. Huong dung la tao mot lop contract rieng cho visual scene truoc khi sinh HTML.

## Huong kien truc tiep theo

### 1. Tach Scene Brief khoi Voice

Moi scene can co hai nhom du lieu rieng:

```json
{
  "voice": "Loi doc tu nhien cho nguoi xem.",
  "visual_brief": {
    "purpose": "explain_value",
    "main_subject": "RTK CLI proxy",
    "primary_text": "TOKEN CUT 60-90%",
    "secondary_labels": ["Rust binary", "Local proxy", "Cache"],
    "facts": ["reduces LLM token consumption by 60-90%"],
    "avoid_text": ["HTML", "Scene 1", "Infinite possibilities"]
  }
}
```

`voice` khong duoc dung lam nguon text chinh. `visual_brief` moi la nguon cho title, cards, badge, number, command block va diagram label.

### 2. Them Visual Planner Agent

Them agent moi truoc `generateSceneHTML`:

```txt
script scene -> visual planner -> validated visual brief -> HTML scene generator
```

Visual Planner nhan topic, metadata, scene voice, screenshot context va tra ve JSON ngan gon:

- `scene_goal`: hook, explain, compare, demo, warning, outro.
- `layout_intent`: browser_scroll, terminal_steps, architecture_map, metric_cards, checklist.
- `primary_text`: text lon nhat tren man hinh.
- `supporting_text`: toi da 3-5 label ngan.
- `visual_objects`: cac doi tuong nen ve bang HTML/CSS/SVG.
- `asset_requirements`: screenshot, logo, character, none.

### 3. Validate Visual Brief truoc khi generate HTML

Can co guard de chan brief yeu:

- `primary_text` khong duoc la `HTML`, `Scene 1`, `Focus`, `Module`, `Overview` neu khong co ngu canh ro.
- Khong copy 5+ tu lien tiep tu `voice`.
- Phai co it nhat mot danh tu rieng hoac keyword lay tu URL/source: repo name, image name, domain, product, command, metric.
- Neu scene la browser/scroll, asset screenshot la bat buoc.

Neu brief fail, regenerate brief hoac fallback bang rule deterministic.

### 4. HTML Generator chi render theo Visual Brief

Prompt HTML nen giam phu thuoc vao `voice`. No chi duoc dung:

- `visual_brief`
- `srt/beat timeline` de can animation timing
- `projectAssets`
- style guide va HyperFrames rules

`voice` chi nen dua vao prompt nhu canh bao: "do not copy this narration into main content".

### 5. Fallback cung phai la dynamic visual fallback

Fallback hien tai da bot hardcode, nhung van chi la generic cards/browser/outro. Can doi fallback thanh cac renderer theo `layout_intent`:

- `browser_scroll`: screenshot lon + 2-3 callout label.
- `terminal_steps`: command/step cards.
- `architecture_map`: node/link diagram.
- `metric_cards`: cards voi number/keyword ro.
- `checklist`: next actions/warnings.

Fallback khong can dep nhu AI, nhung phai de nguoi xem hieu noi dung.

## Thu tu uu tien

1. Tao `agents/scene/visualPlanner.js` va test cho cac URL da gap loi: `rtk-ai/rtk`, GitHub repo, Docker Hub, web docs.
2. Them schema/validator cho `visual_brief`.
3. Sua `generateSceneHTML` de prompt dung `visual_brief`, khong de model tu boc text tu `voice`.
4. Tach fallback theo `layout_intent`.
5. Chi sau khi visual brief on dinh moi refresh thiet ke animation/style.

## Tieu chi hoan thanh gan nhat

- Video cua `https://github.com/rtk-ai/rtk` phai co text giua man hinh de hieu voi nguoi xem lan dau, vi du `TOKEN CUT 60-90%`, `Rust CLI proxy`, `Local cache`.
- Khong scene nao hien text chung chung nhu `HTML`, `Scene 1`, `Module`, `Focus` neu khong co boi canh.
- Khong hero/card/title nao copy nguyen cau voice.
- Scene browser/scroll dung screenshot nguon that, khong dung anh asset co san.
- `npx hyperframes validate` khong co console error.
