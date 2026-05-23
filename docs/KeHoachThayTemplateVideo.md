# Legacy: thay template video co dinh

Tai lieu nay duoc giu lai nhu ghi chu lich su. Huong "thay template G1/G2/G3 bang nhieu variant template" khong con la huong chinh.

Huong hien tai:

- Khong tiep tuc mo rong template co dinh theo group.
- AI sinh scene HTML truc tiep qua `agents/scene/generate.js`.
- Code chi giu cac guardrail: asset routing, visual brief validation, HyperFrames validation, auto-fix va fallback.
- Neu can fallback, fallback phai bam theo `visual_brief`/`layout_intent`, khong bam theo template mau co san.

Tai lieu can doc truoc khi phat trien tiep:

- `docs/KeHoachPhatTrien.md`
- `docs/KeHoachNoiDungVideoDong.md`
- `docs/pipeline-flow.md`

## Bai hoc van con dung

Mot so nguyen tac trong ke hoach cu van dung:

- Khong de video nao lap lai text mau nhu `Infinite Possibilities`, `Automated Screenshots`, `Start Generating Today`.
- Scene huong dan nen hien steps/commands, khong ep vao bento card chung chung.
- Text hien thi phai ngan, ro, bam vao nguon that.
- Khong de AI tra ve component tuy y roi render truc tiep neu chua validate.

## Diem khac voi huong moi

Truoc day:

```txt
URL -> classify G1/G2/G3 -> template variant -> fill content
```

Bay gio:

```txt
URL/topic -> script agent -> visual planner -> scene HTML agent -> validator/autofix -> fallback neu can
```

Cong viec tiep theo khong phai tao them template, ma la tao `visual_brief` du ro de scene HTML agent khong sinh cac label vo nghia nhu `HTML`, `Scene 1`, `Focus`.
