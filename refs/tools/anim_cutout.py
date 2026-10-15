"""Turn a white-background mascot loop (mp4) into a transparent animated WebP.

Every frame gets the same edge flood-fill cutout as cutout.py, then all frames
share one crop (the union of their bounding boxes) so the character never jitters.

usage: python anim_cutout.py <in.mp4> <out-animated.webp> <out-still.webp> [width] [fps]
"""
import glob
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, out_anim, out_still = sys.argv[1:4]
width = int(sys.argv[4]) if len(sys.argv) > 4 else 480
fps = int(sys.argv[5]) if len(sys.argv) > 5 else 15
KEY = (255, 0, 255)


def cut(frame):
    w, h = frame.size
    filled = frame.copy()
    for x in range(0, w, 12):
        for y in (0, h - 1):
            if filled.getpixel((x, y)) != KEY and min(filled.getpixel((x, y))) > 225:
                ImageDraw.floodfill(filled, (x, y), KEY, thresh=38)
    for y in range(0, h, 12):
        for x in (0, w - 1):
            if filled.getpixel((x, y)) != KEY and min(filled.getpixel((x, y))) > 225:
                ImageDraw.floodfill(filled, (x, y), KEY, thresh=38)
    f = np.asarray(filled).astype(np.int16)
    bg = (f[..., 0] == 255) & (f[..., 1] == 0) & (f[..., 2] == 255)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    near = np.asarray(Image.fromarray(alpha).filter(ImageFilter.MinFilter(5))) < 255
    light = np.asarray(frame).astype(np.int16).min(axis=2)
    rim = near & ~bg
    alpha[rim] = np.clip((255 - light[rim]) * 2.2, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([np.asarray(frame), alpha]), "RGBA")


with tempfile.TemporaryDirectory() as tmp:
    # Work at 2x the output width for clean edges, then downscale.
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", src, "-vf",
                    f"fps={fps},colorlevels=rimax=0.94:gimax=0.94:bimax=0.94,scale={width * 2}:-1:flags=lanczos",
                    os.path.join(tmp, "f%04d.png")], check=True)
    frames = [cut(Image.open(p).convert("RGB")) for p in sorted(glob.glob(os.path.join(tmp, "f*.png")))]

boxes = [f.getbbox() for f in frames]
box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
pad = 6
box = (max(box[0] - pad, 0), max(box[1] - pad, 0), box[2] + pad, box[3] + pad)
height = round(width * (box[3] - box[1]) / (box[2] - box[0]))
frames = [f.crop(box).resize((width, height), Image.LANCZOS) for f in frames]
frames[0].save(out_still, "WEBP", quality=88, method=6)
frames[0].save(out_anim, "WEBP", save_all=True, append_images=frames[1:], duration=round(1000 / fps),
               loop=0, quality=80, method=4, minimize_size=True)
print(f"{len(frames)} frames, {width}x{height}, crop {box}")
