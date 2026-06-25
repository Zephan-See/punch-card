"""
ponytail: the user's re-crop saved without alpha and baked the macOS Preview
checkerboard into the pixels. Detect that pattern (light/gray pixels near edges)
and flood-fill back to transparent.
"""
from PIL import Image
import numpy as np
from scipy import ndimage
from pathlib import Path

STICKER_DIR = Path('/Users/zephan/Downloads/Claude-Yann/Small Punch Card/frontend/public/stickers')

for f in sorted(STICKER_DIR.glob('*.png')):
    im = Image.open(f).convert('RGBA')
    arr = np.array(im)
    rgb = arr[:, :, :3]

    # Checkerboard pixels: grayscale, very light (>= 235)
    is_gray = np.ptp(rgb, axis=2) <= 8
    is_light = np.all(rgb >= 235, axis=2)
    bg_candidate = is_gray & is_light

    # Flood-fill from edges so only reachable background pixels become transparent.
    # Interior whites (eye highlights, hair shine) stay opaque because they're
    # surrounded by darker pixels.
    h, w = bg_candidate.shape
    seed = np.zeros_like(bg_candidate)
    seed[0, :] = bg_candidate[0, :]
    seed[-1, :] = bg_candidate[-1, :]
    seed[:, 0] = bg_candidate[:, 0]
    seed[:, -1] = bg_candidate[:, -1]
    struct = ndimage.generate_binary_structure(2, 1)
    mask = ndimage.binary_propagation(seed, structure=struct, mask=bg_candidate)

    arr[mask, 3] = 0

    # Tight crop around remaining opaque content
    opaque = arr[:, :, 3] > 0
    if opaque.any():
        ys, xs = np.where(opaque)
        cropped = arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(cropped, 'RGBA').save(f, optimize=True)
        print(f'  {f.name}: {cropped.shape[1]}x{cropped.shape[0]}  transparent={mask.sum()}px')
    else:
        print(f'  {f.name}: WARNING all transparent, skipped')
