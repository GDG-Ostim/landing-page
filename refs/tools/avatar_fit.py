"""Reframe a generated avatar so the shirt bleeds past the bottom of the round
crop and the head keeps a consistent top margin.
usage: python avatar_fit.py <in.png> <out.webp> [size]"""
import sys
from PIL import Image, ImageChops

src, dst = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 320
im = Image.open(src).convert("RGB")
w, h = im.size
bg = im.getpixel((5, 5))
mask = ImageChops.difference(im, Image.new("RGB", im.size, bg)).convert("L").point(lambda v: 255 if v > 28 else 0)
left, top, right, _ = mask.getbbox()
cx = (left + right) // 2
# Lowest figure pixel in the middle band: the bottom of the shirt.
band = mask.crop((cx - 40, 0, cx + 40, h))
body_bottom = band.getbbox()[3]
head_top = top
side = int((body_bottom - head_top) / 0.88)        # 8% headroom, 4% bleed
crop_bottom = body_bottom - int(side * 0.04)
box = (cx - side // 2, crop_bottom - side, cx - side // 2 + side, crop_bottom)
canvas = Image.new("RGB", (side, side), bg)         # pad with the backdrop if the box runs off the image
canvas.paste(im.crop((max(box[0], 0), max(box[1], 0), min(box[2], w), min(box[3], h))),
             (max(-box[0], 0), max(-box[1], 0)))
canvas.resize((size, size), Image.LANCZOS).save(dst, "WEBP", quality=88, method=6)
print(dst, "head", head_top, "body", body_bottom, "side", side)
