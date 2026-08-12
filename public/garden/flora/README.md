# Flora sprites

Static (non-animated) pixel-art plants for the garden's flower beds and set dressing.

Pack: "Pixel Art Flower Pack". Files are copied straight out of the pack and renamed by role — no
re-export step, unlike the pest strips in `../pests/`. Every plant in the pack ships in several
colourways; only the one variant per role listed below is used, to keep the beds on a coherent
palette.

| file                 | pack source              | used for                              |
| -------------------- | ------------------------ | ------------------------------------- |
| `daisy-blue.png`     | Flower 7 – BLUE          | bed filler                            |
| `aster-purple.png`   | Flower 5 – PURPLE        | bed filler                            |
| `poppy-yellow.png`   | Flower 8 – YELLOW        | bed filler                            |
| `lily-orange.png`    | Flower 9 – ORANGE        | taller accent bloom                   |
| `cluster-pink.png`   | Flower 11 – PINK         | low ground cover                      |
| `cluster-yellow.png` | Flower 12 – YELLOW       | low ground cover                      |
| `bush-green.png`     | Bush 1 – GREEN           | shrubs **and** the horizon hedge      |
| `bush-dry.png`       | Bush 1 (no flowers) – WARM GREEN | dried-out shrub on an infested tree |
| `bed-pink.png`       | Bush 2 – PINK            | wide flowering bed                    |
| `trellis-warm.png`   | Garden Grid – Grid 2     | backdrop at the horizon               |
| `trellis-pink.png`   | Garden Grid – Grid 3     | backdrop at the horizon               |

The pack's potted plants (`Flower Pot *`) are intentionally unused: placed in the near corners as
foreground framing they get cropped by the card's edge, and a half-pot reads as pasted onto the scene
rather than standing in it.

Each file's pixel dimensions are hard-coded as an aspect ratio in `FLORA_SPRITES` / `GARDEN_PROPS`
(`src/constants/garden.ts`) so the renderer never has to measure a loaded image. **Swapping a file for
one of different dimensions means updating its `aspect` there too**, or the sprite will render
stretched.
