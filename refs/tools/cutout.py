"""Remove the white background from a thick-outline sticker render.
usage: python cutout.py <in.png> <out.png> [size | WxH]"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
spec = sys.argv[3] if len(sys.argv) > 3 else "320"
W, H = (int(v) for v in spec.split("x")) if "x" in spec else (int(spec), int(spec))
im = Image.open(src).convert("RGB")
w, h = im.size
key = (255, 0, 255)
filled = im.copy()
# Flood the background from every edge pixel step so islands touching edges go too.
for x in range(0, w, 16):
    for y in (0, h - 1):
        if filled.getpixel((x, y)) != key and min(filled.getpixel((x, y))) > 225:
            ImageDraw.floodfill(filled, (x, y), key, thresh=38)
for y in range(0, h, 16):
    for x in (0, w - 1):
        if filled.getpixel((x, y)) != key and min(filled.getpixel((x, y))) > 225:
            ImageDraw.floodfill(filled, (x, y), key, thresh=38)
f = np.asarray(filled).astype(np.int16)
bg = (f[..., 0] == 255) & (f[..., 1] == 0) & (f[..., 2] == 255)
alpha = np.where(bg, 0, 255).astype(np.uint8)
# Soften the rim: near the cut, light pixels fade out by how light they are.
near = np.asarray(Image.fromarray(alpha).filter(ImageFilter.MinFilter(7))) < 255
rgb = np.asarray(im).astype(np.int16)
light = rgb.min(axis=2)
rim = near & ~bg
alpha[rim] = np.clip((255 - light[rim]) * 2.2, 0, 255).astype(np.uint8)
out = Image.fromarray(np.dstack([np.asarray(im), alpha]), "RGBA")
bbox = out.getbbox()
out = out.crop(bbox)
out.thumbnail((W, H), Image.LANCZOS)
canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
canvas.paste(out, ((W - out.width) // 2, (H - out.height) // 2))
canvas.save(dst, "WEBP", quality=90, method=6) if dst.endswith(".webp") else canvas.save(dst, optimize=True)
