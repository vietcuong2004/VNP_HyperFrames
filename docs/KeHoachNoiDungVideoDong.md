# Ke hoach noi dung va visual dong

Tai lieu nay mo ta contract noi dung can co de scene AI khong sinh text giua video vo nghia.

## Nguyen tac

Moi scene co 3 lop thong tin rieng:

1. `voice`: loi doc tu nhien.
2. `visual_brief`: noi dung duoc phep hien tren man hinh.
3. `html`: scene composition do AI sinh tu `visual_brief`.

Khong dung `voice` lam nguon text chinh. Neu can subtitle, subtitle/burn-in nam rieng o lower-third.

## Visual Brief de xuat

```json
{
  "scene_goal": "explain_value",
  "layout_intent": "metric_cards",
  "main_subject": "RTK CLI proxy",
  "primary_text": "TOKEN CUT 60-90%",
  "secondary_labels": ["Rust binary", "Local proxy", "Cache"],
  "facts": [
    "CLI proxy that reduces LLM token consumption by 60-90%",
    "single Rust binary",
    "zero dependencies"
  ],
  "visual_objects": ["terminal", "token meter", "cache node"],
  "asset_requirements": ["logo"],
  "avoid_text": ["HTML", "Scene 1", "Focus", "Infinite possibilities"]
}
```

## Layout Intent

Danh sach ban dau:

| Intent | Khi dung | Visual nen co |
|---|---|---|
| `browser_scroll` | Can hien trang nguon, GitHub, Docker Hub, docs | Screenshot lon, browser chrome, callout ngan |
| `terminal_steps` | Install, clone, run, config | Command block, step cards, progress |
| `architecture_map` | Giai thich proxy, library, data flow | Nodes, arrows, label ngan |
| `metric_cards` | Co number/benefit ro | Number lon, 2-3 card phu |
| `feature_cards` | Liet ke tinh nang | Cards ngan, icon/shape lien quan |
| `checklist` | Outro, warning, next action | Checklist, CTA, repo/domain |

AI khong tu phat minh intent ngoai danh sach neu chua co renderer/fallback.

## Rule chong text vo nghia

Text hien giua video bi xem la fail neu:

- Chi la tu chung chung: `HTML`, `Scene`, `Focus`, `Module`, `Overview`, `Dynamic`, `Visual`.
- Khong chua keyword nao tu URL/source.
- Copy 5+ tu lien tiep tu `voice`.
- Khong giup nguoi xem hieu scene dang noi ve cai gi.

Text tot nen co:

- Ten repo/image/product/domain.
- Mot metric hoac loi ich cu the.
- Command/keyword that neu source co.
- 1-4 tu moi label, nhung du nghia.

## Normalize de xuat

Neu `primary_text` yeu:

1. Lay `[TEXT] '...'` trong `scene.visual` neu co.
2. Lay repo/image/domain name tu source metadata.
3. Lay number/metric trong description/README.
4. Ket hop thanh label ngan, vi du:
   - `RTK PROXY`
   - `TOKEN CUT 60-90%`
   - `RUST CLI`
   - `LOCAL CACHE`

Neu van khong co du lieu, dung fallback co boi canh:

```txt
<repo-name> OVERVIEW
<domain> SUMMARY
<image-name> QUICKSTART
```

Khong fallback ve `Scene 1`.

## Test can co

- `rtk-ai/rtk`: primary text phai co `RTK`, `TOKEN`, `60-90`, `Rust` hoac `proxy`.
- GitHub repo co README: scene install phai dung `terminal_steps` neu co command.
- Docker Hub: scene run/config phai dung command/checklist neu co lenh.
- Web docs: scene browser phai dung screenshot nguon.
- Validator phai bat voice leak ngoai caption.
