"""Trace badge art (one PNG per badge, white background) into transparent SVGs.

Removes the white background (flood fill from the edges, so white food inside
the drawing stays), crops to a square around the icon, then traces it with
vtracer. See docs/BADGES.md.

    python3.11 -m venv .venv-trace && .venv-trace/bin/pip install vtracer pillow numpy
    .venv-trace/bin/python scripts/trace_badges.py <pngs> <work dir> assets/badges [threshold] [ids...]

vtracer 0.6 crashes on Python 3.14; use 3.11.
"""
import re, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
import vtracer

src, work, out = (Path(p) for p in sys.argv[1:4])
thresh = int(sys.argv[4]) if len(sys.argv) > 4 else 14
ids = sys.argv[5:] or [p.stem for p in sorted(src.glob('*.png'))]
work.mkdir(parents=True, exist_ok=True); out.mkdir(parents=True, exist_ok=True)
KEY = (255, 0, 255)

for id_ in ids:
    im = Image.open(src / f'{id_}.png').convert('RGB')
    w, h = im.size
    filled = im.copy()
    seeds = [(x, 0) for x in range(0, w, 8)] + [(x, h - 1) for x in range(0, w, 8)] + \
            [(0, y) for y in range(0, h, 8)] + [(w - 1, y) for y in range(0, h, 8)]
    for s in seeds:
        if filled.getpixel(s) != KEY and min(filled.getpixel(s)) > 225:
            ImageDraw.floodfill(filled, s, KEY, thresh=thresh)
    a = np.array(filled)
    bg = np.all(a == KEY, axis=2)
    rgb = np.array(im)
    # Ignore a margin at the cell edges, where faint grid lines from the source sheet sit.
    m = 12
    bg[:m, :] = bg[-m:, :] = True; bg[:, :m] = bg[:, -m:] = True
    # Soften the light fringe: very light pixels touching the background become transparent.
    light = rgb.min(axis=2) > 232
    near = np.zeros_like(bg)
    near[1:, :] |= bg[:-1, :]; near[:-1, :] |= bg[1:, :]; near[:, 1:] |= bg[:, :-1]; near[:, :-1] |= bg[:, 1:]
    bg |= light & near
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    rgba = np.dstack([rgb, alpha])
    ys, xs = np.where(alpha > 0)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    side = int(max(x1 - x0, y1 - y0) * 1.06)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    piece = Image.fromarray(rgba).crop((x0, y0, x1 + 1, y1 + 1))
    canvas.paste(piece, ((side - piece.width) // 2, (side - piece.height) // 2))
    canvas = canvas.resize((320, 320), Image.LANCZOS)
    # Resampling makes semi-transparent edge pixels: snap alpha so the tracer sees clean shapes.
    c = np.array(canvas); c[..., 3] = np.where(c[..., 3] > 110, 255, 0); canvas = Image.fromarray(c)
    png = work / f'{id_}.png'
    canvas.save(png)
    svg = out / f'{id_}.svg'
    vtracer.convert_image_to_svg_py(str(png), str(svg), colormode='color', hierarchical='stacked', mode='spline',
                                    filter_speckle=4, color_precision=6, layer_difference=14, corner_threshold=60,
                                    length_threshold=4.0, max_iterations=10, splice_threshold=45, path_precision=1)
    text = svg.read_text()
    text = re.sub(r'<svg([^>]*?) width="(\d+)" height="(\d+)"', r'<svg\1 viewBox="0 0 \2 \3"', text, count=1)
    text = re.sub(r'<\?xml[^>]*\?>\s*', '', text)
    text = re.sub(r'<!--.*?-->\s*', '', text, flags=re.S)
    svg.write_text(text)
    print(id_, f'{len(text)//1024} KB')
