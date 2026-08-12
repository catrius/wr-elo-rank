#!/usr/bin/env python3
"""Bakes public/garden/lawn.png — the garden's lawn slab.

The lawn is one image rather than a tiled sprite because it needs a vertical gradient (dark at the
horizon, bright in the foreground) and a speckle density that thickens toward the viewer. Tiling a
16px ground tile over that area striped badly, and approximating the gradient in CSS lost the
pixel-art speckle. It is authored at exactly the scene's design width so it lands 1:1 on the stage.

Palette is taken from public/garden/ground.png so the lawn matches the rest of the pixel art.

Usage: python3 generate.py   (writes ../../../public/garden/lawn.png)
"""

import os

from PIL import Image, ImageDraw

W, H = 480, 112

# Sampled from ground.png: its two grass greens, plus a lighter tip and darker shade for speckles
DARK = (38, 92, 66)
MID = (62, 137, 72)
LIGHT = (99, 199, 77)
SHADE = (20, 60, 45)
TIP = (160, 230, 120)

SPECKLES = 900


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def hash_seed(n):
    """Same deterministic hash the runtime uses, so regenerating never reshuffles the texture."""
    a = ((n + 1) * 48271) % 2147483647
    b = ((a + 0x9E3779B9) * 16807) % 2147483647
    return (b % 1000003) / 1000003


def main():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Aerial perspective: the far lawn sits in haze, the near lawn catches full light
    for y in range(H):
        t = y / (H - 1)
        col = lerp(DARK, MID, min(1, t * 2.2)) if t < 0.45 else lerp(MID, LIGHT, (t - 0.45) / 0.55)
        d.line([(0, y), (W, y)], fill=col + (255,))

    # Grass blades as 1px dashes. `** 0.7` biases them toward the foreground, where blades would
    # resolve individually; the far lawn stays smooth.
    for i in range(SPECKLES):
        sx, sy, sv = hash_seed(i * 3 + 1), hash_seed(i * 7 + 11), hash_seed(i * 11 + 5)
        y = int((sy**0.7) * (H - 1))
        t = y / (H - 1)
        x = int(sx * W)
        length = 1 + int(sv * 2 * (0.4 + t))
        base = lerp(DARK, LIGHT, t)
        col = lerp(base, SHADE, 0.35) if sv < 0.5 else lerp(base, TIP, 0.30)
        d.line([(x, y), (x, y - length)], fill=col + (255,))

    out = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'public', 'garden', 'lawn.png')
    img.save(os.path.normpath(out))
    print(f'wrote {os.path.normpath(out)} {img.size}')


if __name__ == '__main__':
    main()
