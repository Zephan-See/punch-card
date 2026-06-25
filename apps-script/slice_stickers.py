"""
ponytail: slice 16 stickers using known row bands (found via density analysis),
then per-row column gap detection.
"""
from PIL import Image
import numpy as np
from pathlib import Path

SRC = Path('/Users/zephan/Downloads/Claude-Yann/Small Punch Card/stickers-2.png')
OUT = Path('/Users/zephan/Downloads/Claude-Yann/Small Punch Card/frontend/public/stickers')
OUT.mkdir(parents=True, exist_ok=True)

LABELS = [
    'morning', 'whattt', 'huh',
    'reminding', 'sleepy', 'wow',
    'approved', 'nice', 'cookie',
    'heyyou', 'achoo', 'angry',
    'confused', 'goodnight', 'cute', 'cool',
]

# Row boundaries found via density analysis (5 sticker rows).
ROW_BANDS = [(74, 390), (393, 683), (697, 974), (996, 1254), (1265, 1500)]

img = Image.open(SRC).convert('RGBA')
arr = np.array(img)

rgb = arr[:, :, :3]
content = ~np.all(rgb > 240, axis=2)

def find_col_runs_in_band(y0, y1, min_density=2, min_gap=15):
    band = content[y0:y1]
    col_density = band.sum(axis=0)
    has = col_density >= min_density
    # find runs
    runs = []
    start = None
    for i, v in enumerate(has):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, len(has)))
    # merge close runs (decorations near body)
    merged = []
    for s, e in runs:
        if merged and s - merged[-1][1] < min_gap:
            merged[-1] = (merged[-1][0], e)
        else:
            merged.append((s, e))
    return merged

EXPECTED_COLS = [3, 3, 3, 3, 4]

cells = []
for ri, (y0, y1) in enumerate(ROW_BANDS):
    cols = find_col_runs_in_band(y0, y1)
    cols = [(s, e) for s, e in cols if e - s >= 100]
    want = EXPECTED_COLS[ri]
    # if detected count is wrong, fall back to equal-split across detected x-range
    if len(cols) != want:
        x_start = cols[0][0] if cols else 0
        x_end = cols[-1][1] if cols else 1024
        step = (x_end - x_start) // want
        cols = [(x_start + i * step, x_start + (i + 1) * step) for i in range(want)]
    print(f'Row {ri} (y={y0}-{y1}): {len(cols)} cols -> {cols}')
    for x0, x1 in cols:
        cells.append((y0, x0, y1, x1))

print(f'Total: {len(cells)}')
assert len(cells) == 16, f'expected 16, got {len(cells)}'

for label, (y0, x0, y1, x1) in zip(LABELS, cells):
    cell = arr[y0:y1, x0:x1].copy()
    cell_rgb = cell[:, :, :3]
    near_white = np.all(cell_rgb > 245, axis=2)
    cell[near_white, 3] = 0

    alpha = cell[:, :, 3] > 0
    if not alpha.any():
        continue
    ys, xs = np.where(alpha)
    cropped = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(cropped, 'RGBA').save(OUT / f'{label}.png', optimize=True)
    print(f'  {label}.png  {cropped.shape[1]}x{cropped.shape[0]}')

print(f'\nSaved to {OUT}')
