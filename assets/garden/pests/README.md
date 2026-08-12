# Pest sprite sources

Editable Aseprite masters for the garden pest overlay. These are **sources only** — nothing here is
served. The runtime assets are the flattened strips in `public/garden/pests/`.

Pack: Foozle "Spire" flying enemy pack.

Each master is a 3×3 block grid of animation × direction, 100 ms per frame:

| rows | animation | Clampbeetle | Firewasp | Flying Locust | Voidbutterfly |
| ---- | --------- | ----------- | -------- | ------------- | ------------- |
| 0–2  | Idle (Down/Up/Side) | 8 | 12 | 12 | 6 |
| 3–5  | Move (Down/Up/Side) | 8 | 8 | 8 | 4 |
| 6–8  | Death (Down/Up/Side) | 13 | 12 | 14 | 13 |

Cell size is 64×64 except Firewasp, which is 96×96.

## Re-exporting

`public/garden/pests/*.png` holds only the **Idle / Side** row (row index 2), trimmed to the union
bounding box across that row so every frame keeps a shared origin — per-frame trimming would make the
bugs jitter as the animation cycles. Frame counts and trimmed cell sizes are recorded in
`PEST_SPRITES` (`src/constants/garden.ts`) and must be updated together with the PNG.

With the Aseprite CLI installed:

```
aseprite -b Clampbeetle.aseprite --frame-range 16,23 --sheet ../../../public/garden/pests/beetle.png \
  --sheet-type horizontal --trim
```

Note `--trim` trims per frame, so verify the result is jitter-free, or re-run the union-bbox export
that produced the current strips.
